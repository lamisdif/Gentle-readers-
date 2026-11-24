-- ============================================================================
-- GENTLE READERS — PHASES 3 & 4 DATABASE UPGRADE (SAFE & RERUNNABLE)
-- Completes Order Lifecycle RPCs, FIFO Allocation, Returns, & Debt Triggers
-- Preserves Phase 1 & Phase 2 Schema, Dependent Views, 228 Items & 151 Orders
-- Compatible with BOTH Owner GitHub OAuth JWT AND Netlify Manager Service Role
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: SAFE IDEMPOTENT PHASE 2 SCHEMA CHECK (PRESERVES DEPENDENT VIEWS)
-- ============================================================================

-- 1. Ensure audit classification columns exist (safe if Phase 2 already ran)
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS quantity_lost integer NOT NULL DEFAULT 0 CHECK (quantity_lost >= 0),
  ADD COLUMN IF NOT EXISTS quantity_promotional integer NOT NULL DEFAULT 0 CHECK (quantity_promotional >= 0),
  ADD COLUMN IF NOT EXISTS quantity_returned_to_supplier integer NOT NULL DEFAULT 0 CHECK (quantity_returned_to_supplier >= 0),
  ADD COLUMN IF NOT EXISTS quantity_count_adjustment integer NOT NULL DEFAULT 0;

-- 2. Only rebuild generated columns if Phase 2 was NOT already applied
-- (Dropping quantity_on_hand/quantity_available blindly crashes when Phase 2 views exist!)
DO $$
DECLARE
  v_gen_expr text;
BEGIN
  SELECT pg_get_expr(d.adbin, d.adrelid)
  INTO v_gen_expr
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attrelid = 'public.inventory_items'::regclass
    AND a.attname = 'quantity_on_hand'
    AND NOT a.attisdropped;

  IF v_gen_expr IS NULL OR position('quantity_lost' IN v_gen_expr) = 0 THEN
    DROP VIEW IF EXISTS public.v_inventory_fifo_lots;
    DROP VIEW IF EXISTS public.v_inventory_summary;

    ALTER TABLE public.inventory_items
      DROP CONSTRAINT IF EXISTS check_quantity_balance;

    ALTER TABLE public.inventory_items
      DROP COLUMN IF EXISTS quantity_on_hand,
      DROP COLUMN IF EXISTS quantity_available;

    ALTER TABLE public.inventory_items
      ADD COLUMN quantity_on_hand integer GENERATED ALWAYS AS (
        quantity_received + quantity_count_adjustment
        - quantity_sold - quantity_reserved - quantity_damaged
        - quantity_lost - quantity_promotional - quantity_returned_to_supplier
      ) STORED,
      ADD COLUMN quantity_available integer GENERATED ALWAYS AS (
        quantity_received + quantity_count_adjustment
        - quantity_sold - quantity_reserved - quantity_damaged
        - quantity_lost - quantity_promotional - quantity_returned_to_supplier
      ) STORED;

    ALTER TABLE public.inventory_items
      ADD CONSTRAINT check_quantity_balance
      CHECK (
        quantity_sold + quantity_reserved + quantity_damaged
        + quantity_lost + quantity_promotional + quantity_returned_to_supplier
        <= quantity_received + quantity_count_adjustment
      );
  END IF;
END $$;

-- 3. Allow NULL allocation_id in order_returns for legacy live orders (#171-#201)
-- placed before allocation rows were generated, while still enforcing FK when present.
ALTER TABLE public.order_returns
  ADD COLUMN IF NOT EXISTS title text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_returns'
      AND column_name = 'allocation_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.order_returns ALTER COLUMN allocation_id DROP NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: PERFORMANCE & COMPOSITE FIFO INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_purchase_batches_supplier ON public.purchase_batches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_batches_date ON public.purchase_batches(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_batches_group ON public.purchase_batches(stock_group);

CREATE INDEX IF NOT EXISTS idx_inventory_items_title ON public.inventory_items(title);
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch ON public.inventory_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_group ON public.inventory_items(stock_group);
CREATE INDEX IF NOT EXISTS idx_inventory_items_cost ON public.inventory_items(unit_purchase_cost_da);

CREATE INDEX IF NOT EXISTS idx_inventory_items_fifo
ON public.inventory_items (title, stock_group, acquisition_date ASC, created_at ASC)
WHERE (quantity_available > 0);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_item
ON public.stock_adjustments (inventory_item_id, adjustment_date DESC);

-- ============================================================================
-- SECTION 3: ATOMIC STOCK ADJUSTMENT APPLICATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_stock_adjustment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_curr_available integer;
BEGIN
  -- Restocking must create a new purchase batch/lot; never inflate quantity_received
  IF NEW.adjustment_type = 'restock' THEN
    RAISE EXCEPTION 'RESTOCK_RESTRICTION: New inventory purchases must create a new purchase lot/batch with its own cost and acquisition date. Existing lots must never have their original quantity_received inflated.';
  END IF;

  SELECT quantity_available
  INTO v_curr_available
  FROM public.inventory_items
  WHERE id = NEW.inventory_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND: Inventory item "%" does not exist.', NEW.inventory_item_id;
  END IF;

  IF NEW.previous_quantity <> v_curr_available THEN
    RAISE EXCEPTION 'CONCURRENCY_CONFLICT: Current available quantity (%) does not match recorded previous_quantity (%). Refresh and retry.',
      v_curr_available, NEW.previous_quantity;
  END IF;

  IF NEW.new_quantity <> (NEW.previous_quantity + NEW.quantity_change) THEN
    RAISE EXCEPTION 'BALANCE_CHECK_FAILED: new_quantity (%) must equal previous_quantity (%) + quantity_change (%).',
      NEW.new_quantity, NEW.previous_quantity, NEW.quantity_change;
  END IF;

  IF NEW.new_quantity < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_STOCK_ERROR: Adjustment results in negative stock (% < 0). Operation rejected.',
      NEW.new_quantity;
  END IF;

  CASE NEW.adjustment_type
    WHEN 'damaged' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Damaged adjustment quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET quantity_damaged = quantity_damaged + ABS(NEW.quantity_change),
          updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    WHEN 'lost' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Lost adjustment quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET quantity_lost = quantity_lost + ABS(NEW.quantity_change),
          updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    WHEN 'gift_promo' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Gift/promo quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET quantity_promotional = quantity_promotional + ABS(NEW.quantity_change),
          updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    WHEN 'return_to_supplier' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Return to supplier quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET quantity_returned_to_supplier = quantity_returned_to_supplier + ABS(NEW.quantity_change),
          updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    WHEN 'count_correction' THEN
      UPDATE public.inventory_items
      SET quantity_count_adjustment = quantity_count_adjustment + NEW.quantity_change,
          updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    ELSE
      RAISE EXCEPTION 'UNKNOWN_ADJUSTMENT_TYPE: "%" is not a recognized adjustment type.', NEW.adjustment_type;
  END CASE;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.apply_stock_adjustment() OWNER TO postgres;
DROP TRIGGER IF EXISTS trg_stock_adjustment_apply ON public.stock_adjustments;
CREATE TRIGGER trg_stock_adjustment_apply
BEFORE INSERT ON public.stock_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.apply_stock_adjustment();

REVOKE ALL ON FUNCTION public.apply_stock_adjustment() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- SECTION 4: OWNER-ONLY FIFO & VALUATION VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.v_inventory_fifo_lots
WITH (security_invoker = true)
AS
SELECT
  i.id AS inventory_item_id,
  i.title,
  i.author,
  i.isbn,
  i.category,
  i.stock_group,
  i.batch_id,
  b.batch_name,
  s.name AS supplier_name,
  i.acquisition_date,
  i.created_at,
  i.quantity_available,
  i.quantity_on_hand,
  i.quantity_received,
  i.quantity_sold,
  i.quantity_damaged,
  i.quantity_lost,
  i.quantity_promotional,
  i.quantity_returned_to_supplier,
  i.quantity_count_adjustment,
  i.unit_purchase_cost_da,
  (i.unit_purchase_cost_da IS NOT NULL) AS has_known_cost,
  i.selling_price_da,
  ROW_NUMBER() OVER (
    PARTITION BY i.title
    ORDER BY
      CASE WHEN i.stock_group = 'OLD_STOCK' THEN 1 ELSE 2 END ASC,
      i.acquisition_date ASC,
      i.created_at ASC,
      i.id ASC
  ) AS fifo_rank
FROM public.inventory_items i
LEFT JOIN public.purchase_batches b ON b.id = i.batch_id
LEFT JOIN public.suppliers s ON s.id = b.supplier_id
WHERE (
  public.is_owner()
  OR COALESCE(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
  OR (current_setting('request.jwt.claims', true) IS NULL AND session_user IN ('postgres', 'supabase_admin'))
) AND i.quantity_available > 0;

CREATE OR REPLACE VIEW public.v_inventory_summary
WITH (security_invoker = true)
AS
SELECT
  i.title,
  MAX(i.author) AS author,
  MAX(i.category) AS category,
  SUM(i.quantity_received) AS total_received,
  SUM(i.quantity_on_hand) AS total_on_hand,
  SUM(i.quantity_available) AS total_available,
  SUM(i.quantity_sold) AS total_sold,
  SUM(i.quantity_damaged) AS total_damaged,
  SUM(i.quantity_lost) AS total_lost,
  SUM(i.quantity_promotional) AS total_promotional,
  SUM(i.quantity_returned_to_supplier) AS total_returned_to_supplier,
  SUM(i.quantity_count_adjustment) AS total_count_adjustment,
  MAX(i.selling_price_da) AS current_selling_price_da,
  COUNT(DISTINCT i.stock_group) AS stock_groups_count,
  COUNT(DISTINCT i.id) AS lots_count,
  SUM(CASE WHEN i.unit_purchase_cost_da IS NOT NULL THEN i.quantity_on_hand ELSE 0 END) AS units_with_known_cost,
  SUM(CASE WHEN i.unit_purchase_cost_da IS NULL THEN i.quantity_on_hand ELSE 0 END) AS uncosted_units,
  SUM(CASE WHEN i.unit_purchase_cost_da IS NOT NULL THEN (i.quantity_on_hand * i.unit_purchase_cost_da) ELSE 0 END) AS known_inventory_value_da,
  CASE
    WHEN COUNT(CASE WHEN i.unit_purchase_cost_da IS NULL THEN 1 END) = 0 THEN 'complete'
    WHEN COUNT(CASE WHEN i.unit_purchase_cost_da IS NOT NULL THEN 1 END) = 0 THEN 'unknown'
    ELSE 'partial'
  END AS cost_status
FROM public.inventory_items i
WHERE (
  public.is_owner()
  OR COALESCE(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
  OR (current_setting('request.jwt.claims', true) IS NULL AND session_user IN ('postgres', 'supabase_admin'))
)
GROUP BY i.title;

ALTER VIEW public.v_inventory_fifo_lots OWNER TO postgres;
ALTER VIEW public.v_inventory_summary OWNER TO postgres;

REVOKE ALL ON public.v_inventory_fifo_lots FROM PUBLIC, anon;
GRANT SELECT ON public.v_inventory_fifo_lots TO authenticated, service_role;

REVOKE ALL ON public.v_inventory_summary FROM PUBLIC, anon;
GRANT SELECT ON public.v_inventory_summary TO authenticated, service_role;

-- ============================================================================
-- SECTION 5: AUTHORIZATION & TITLE NORMALIZATION HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_owner_or_service()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT (
    public.is_owner()
    OR COALESCE(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
    OR (current_setting('request.jwt.claims', true) IS NULL AND session_user IN ('postgres', 'supabase_admin'))
  );
$$;

ALTER FUNCTION public.is_owner_or_service() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_owner_or_service() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner_or_service() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.normalize_book_title(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(coalesce(p_title, '')),
            '[أإآ]', 'ا', 'g'
          ),
          'ة', 'ه', 'g'
        ),
        'ى', 'ي', 'g'
      ),
      '[^\w\s\u0600-\u06FF]', '', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

GRANT EXECUTE ON FUNCTION public.normalize_book_title(text) TO anon, authenticated, service_role;

-- ============================================================================
-- SECTION 6: ATOMIC ORDER LIFECYCLE RPCs (PHASE 3)
-- ============================================================================

-- RPC 1: Update Operational Metadata (carrier, tracking, fees, payment status)
CREATE OR REPLACE FUNCTION public.update_order_operational_meta(
  p_order_id bigint,
  p_carrier text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL,
  p_packaging_used text DEFAULT NULL,
  p_packaging_cost_da numeric DEFAULT NULL,
  p_shipping_fee_da numeric DEFAULT NULL,
  p_actual_shipping_cost_da numeric DEFAULT NULL,
  p_payment_status text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_hist boolean;
BEGIN
  IF NOT public.is_owner_or_service() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can update order metadata.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;
  IF COALESCE(v_is_hist, (p_order_id <= 170)) THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  IF p_payment_status IS NOT NULL AND p_payment_status NOT IN ('unpaid', 'paid', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status "%": must be unpaid, paid, or refunded.', p_payment_status;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

  INSERT INTO public.order_meta (
    order_id,
    carrier,
    tracking_number,
    packaging_used,
    packaging_cost_da,
    shipping_fee_da,
    actual_shipping_cost_da,
    payment_status,
    payment_method,
    notes,
    fulfillment_status
  )
  VALUES (
    p_order_id,
    p_carrier,
    p_tracking_number,
    p_packaging_used,
    COALESCE(p_packaging_cost_da, 0),
    COALESCE(p_shipping_fee_da, 0),
    COALESCE(p_actual_shipping_cost_da, 0),
    COALESCE(p_payment_status, 'unpaid'),
    p_payment_method,
    p_notes,
    'pending'
  )
  ON CONFLICT (order_id) DO UPDATE SET
    carrier = COALESCE(EXCLUDED.carrier, public.order_meta.carrier),
    tracking_number = COALESCE(EXCLUDED.tracking_number, public.order_meta.tracking_number),
    packaging_used = COALESCE(EXCLUDED.packaging_used, public.order_meta.packaging_used),
    packaging_cost_da = COALESCE(EXCLUDED.packaging_cost_da, public.order_meta.packaging_cost_da),
    shipping_fee_da = COALESCE(EXCLUDED.shipping_fee_da, public.order_meta.shipping_fee_da),
    actual_shipping_cost_da = COALESCE(EXCLUDED.actual_shipping_cost_da, public.order_meta.actual_shipping_cost_da),
    payment_status = COALESCE(EXCLUDED.payment_status, public.order_meta.payment_status),
    payment_method = COALESCE(EXCLUDED.payment_method, public.order_meta.payment_method),
    notes = CASE
              WHEN EXCLUDED.notes IS NOT NULL AND trim(EXCLUDED.notes) <> ''
              THEN COALESCE(public.order_meta.notes || E'\n', '') || trim(EXCLUDED.notes)
              ELSE public.order_meta.notes
            END,
    updated_at = timezone('utc'::text, now());

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

ALTER FUNCTION public.update_order_operational_meta(bigint, text, text, text, numeric, numeric, numeric, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_order_operational_meta(bigint, text, text, text, numeric, numeric, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_operational_meta(bigint, text, text, text, numeric, numeric, numeric, text, text, text) TO authenticated, service_role;

-- RPC 2: Transition Fulfillment Status to Processing or Shipped
CREATE OR REPLACE FUNCTION public.transition_order_fulfillment_status(
  p_order_id bigint,
  p_new_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_curr_status text;
  v_is_hist boolean;
BEGIN
  IF NOT public.is_owner_or_service() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can transition order fulfillment status.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;
  IF COALESCE(v_is_hist, (p_order_id <= 170)) THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  IF p_new_status IS NULL OR p_new_status NOT IN ('processing', 'shipped') THEN
    RAISE EXCEPTION 'Invalid target status "%": transition_order_fulfillment_status only permits "processing" or "shipped".', COALESCE(p_new_status, 'NULL');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

  SELECT fulfillment_status INTO v_curr_status
  FROM public.order_meta
  WHERE order_id = p_order_id
  FOR UPDATE;

  v_curr_status := COALESCE(v_curr_status, 'pending');

  IF v_curr_status = p_new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'previous_status', v_curr_status,
      'fulfillment_status', p_new_status,
      'message', 'Order is already in target status.'
    );
  END IF;

  IF p_new_status = 'processing' THEN
    IF v_curr_status <> 'pending' THEN
      RAISE EXCEPTION 'Cannot transition order % to "processing": current status is "%".', p_order_id, v_curr_status;
    END IF;
  ELSIF p_new_status = 'shipped' THEN
    IF v_curr_status NOT IN ('pending', 'processing') THEN
      RAISE EXCEPTION 'Cannot transition order % to "shipped": current status is "%".', p_order_id, v_curr_status;
    END IF;
  END IF;

  INSERT INTO public.order_meta (order_id, fulfillment_status, notes, updated_at)
  VALUES (
    p_order_id,
    p_new_status,
    NULLIF(trim(coalesce(p_notes, '')), ''),
    timezone('utc'::text, now())
  )
  ON CONFLICT (order_id) DO UPDATE SET
    fulfillment_status = EXCLUDED.fulfillment_status,
    notes = CASE
              WHEN EXCLUDED.notes IS NOT NULL AND trim(EXCLUDED.notes) <> ''
              THEN COALESCE(public.order_meta.notes || E'\n', '') || trim(EXCLUDED.notes)
              ELSE public.order_meta.notes
            END,
    updated_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'previous_status', v_curr_status,
    'fulfillment_status', p_new_status
  );
END;
$$;

ALTER FUNCTION public.transition_order_fulfillment_status(bigint, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.transition_order_fulfillment_status(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_order_fulfillment_status(bigint, text, text) TO authenticated, service_role;

-- RPC 3: Reserve Order Stock FIFO (OLD_STOCK before NEW_STOCK)
CREATE OR REPLACE FUNCTION public.reserve_order_stock(
  p_order_id bigint,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req record;
  v_lot record;
  v_avail_total integer;
  v_needed integer;
  v_allocated integer;
  v_allocations_logged jsonb := '[]'::jsonb;
  v_curr_status text;
  v_existing_alloc_count integer;
  v_is_hist boolean;
BEGIN
  IF NOT public.is_owner_or_service() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can reserve stock for orders.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;
  IF COALESCE(v_is_hist, (p_order_id <= 170)) THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

  SELECT fulfillment_status INTO v_curr_status
  FROM public.order_meta
  WHERE order_id = p_order_id;

  IF v_curr_status IN ('cancelled', 'delivered', 'returned') THEN
    RAISE EXCEPTION 'Cannot reserve stock for order %: order status is "%".', p_order_id, v_curr_status;
  END IF;

  SELECT COUNT(*) INTO v_existing_alloc_count
  FROM public.order_stock_allocations
  WHERE order_id = p_order_id AND allocation_status IN ('reserved', 'confirmed');

  IF v_existing_alloc_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'message', 'Order already has active allocations.');
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items must be a valid, non-empty JSON array.';
  END IF;

  CREATE TEMP TABLE _reqs (
    norm_title text PRIMARY KEY,
    display_title text,
    req_qty integer
  ) ON COMMIT DROP;

  FOR v_req IN SELECT * FROM jsonb_to_recordset(p_items) AS x(title text, quantity numeric) LOOP
    IF v_req.title IS NULL OR trim(v_req.title) = '' THEN
      RAISE EXCEPTION 'Item title cannot be empty.';
    END IF;
    IF v_req.quantity IS NULL OR v_req.quantity <= 0 OR v_req.quantity <> floor(v_req.quantity) THEN
      RAISE EXCEPTION 'Quantity for "%" must be a positive integer.', v_req.title;
    END IF;

    INSERT INTO _reqs (norm_title, display_title, req_qty)
    VALUES (public.normalize_book_title(v_req.title), trim(v_req.title), v_req.quantity::integer)
    ON CONFLICT (norm_title) DO UPDATE
    SET req_qty = _reqs.req_qty + EXCLUDED.req_qty;
  END LOOP;

  PERFORM 1
  FROM public.inventory_items i
  WHERE public.normalize_book_title(i.title) IN (SELECT norm_title FROM _reqs)
  ORDER BY i.id ASC
  FOR UPDATE;

  FOR v_req IN SELECT * FROM _reqs LOOP
    SELECT COALESCE(SUM(quantity_available), 0)
    INTO v_avail_total
    FROM public.inventory_items
    WHERE public.normalize_book_title(title) = v_req.norm_title;

    IF v_avail_total < v_req.req_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT STOCK: "%" requires %, but only % is available across inventory lots.',
        v_req.display_title, v_req.req_qty, v_avail_total;
    END IF;
  END LOOP;

  FOR v_req IN SELECT * FROM _reqs LOOP
    v_needed := v_req.req_qty;

    FOR v_lot IN
      SELECT
        id,
        title,
        stock_group,
        quantity_available AS avail,
        unit_purchase_cost_da
      FROM public.inventory_items
      WHERE public.normalize_book_title(title) = v_req.norm_title
        AND quantity_available > 0
      ORDER BY
        CASE WHEN stock_group = 'OLD_STOCK' THEN 0 ELSE 1 END ASC,
        acquisition_date ASC,
        created_at ASC,
        id ASC
    LOOP
      EXIT WHEN v_needed <= 0;

      v_allocated := LEAST(v_lot.avail, v_needed);

      UPDATE public.inventory_items
      SET quantity_reserved = quantity_reserved + v_allocated,
          updated_at = timezone('utc'::text, now())
      WHERE id = v_lot.id;

      INSERT INTO public.order_stock_allocations (
        order_id,
        inventory_item_id,
        quantity,
        unit_purchase_cost_da,
        cost_basis,
        allocation_status
      ) VALUES (
        p_order_id,
        v_lot.id,
        v_allocated,
        v_lot.unit_purchase_cost_da,
        'fifo',
        'reserved'
      );

      v_allocations_logged := v_allocations_logged || jsonb_build_object(
        'inventory_item_id', v_lot.id,
        'stock_group', v_lot.stock_group,
        'quantity', v_allocated,
        'unit_purchase_cost_da', v_lot.unit_purchase_cost_da
      );

      v_needed := v_needed - v_allocated;
    END LOOP;

    IF v_needed > 0 THEN
      RAISE EXCEPTION 'CONCURRENCY ANOMALY: Could not reserve remaining % units of "%".', v_needed, v_req.display_title;
    END IF;
  END LOOP;

  INSERT INTO public.order_meta (order_id, fulfillment_status, updated_at)
  VALUES (p_order_id, 'pending', timezone('utc'::text, now()))
  ON CONFLICT (order_id) DO UPDATE
  SET updated_at = timezone('utc'::text, now());

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'allocations', v_allocations_logged);
END;
$$;

ALTER FUNCTION public.reserve_order_stock(bigint, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reserve_order_stock(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(bigint, jsonb) TO authenticated, service_role;

-- RPC 4: Confirm Order Delivery (Convert Reserved Stock to Sold + Upsert order_meta)
CREATE OR REPLACE FUNCTION public.confirm_order_delivery(
  p_order_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alloc record;
  v_status text;
  v_reserved_count integer;
  v_is_hist boolean;
BEGIN
  IF NOT public.is_owner_or_service() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can confirm order delivery.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;
  IF COALESCE(v_is_hist, (p_order_id <= 170)) THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

  SELECT fulfillment_status INTO v_status
  FROM public.order_meta
  WHERE order_id = p_order_id;

  IF v_status = 'delivered' THEN
    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'delivered', 'message', 'Order already marked delivered.');
  END IF;

  IF v_status IN ('cancelled', 'returned') THEN
    RAISE EXCEPTION 'Cannot confirm delivery: order % is currently "%".', p_order_id, v_status;
  END IF;

  SELECT COUNT(*) INTO v_reserved_count
  FROM public.order_stock_allocations
  WHERE order_id = p_order_id AND allocation_status = 'reserved';

  IF v_reserved_count > 0 THEN
    PERFORM 1
    FROM public.inventory_items i
    WHERE i.id IN (
      SELECT DISTINCT inventory_item_id
      FROM public.order_stock_allocations
      WHERE order_id = p_order_id AND allocation_status = 'reserved'
    )
    ORDER BY i.id ASC
    FOR UPDATE;

    FOR v_alloc IN
      SELECT a.id, a.inventory_item_id, a.quantity, i.quantity_reserved, i.title
      FROM public.order_stock_allocations a
      JOIN public.inventory_items i ON a.inventory_item_id = i.id
      WHERE a.order_id = p_order_id AND a.allocation_status = 'reserved'
    LOOP
      UPDATE public.inventory_items
      SET quantity_reserved = GREATEST(0, quantity_reserved - v_alloc.quantity),
          quantity_sold = quantity_sold + v_alloc.quantity,
          updated_at = timezone('utc'::text, now())
      WHERE id = v_alloc.inventory_item_id;

      UPDATE public.order_stock_allocations
      SET allocation_status = 'confirmed'
      WHERE id = v_alloc.id;
    END LOOP;
  END IF;

  -- Upsert order_meta so live orders without a prior order_meta row (#200, #201, etc.) persist cleanly!
  INSERT INTO public.order_meta (order_id, fulfillment_status, payment_status, updated_at)
  VALUES (p_order_id, 'delivered', 'paid', timezone('utc'::text, now()))
  ON CONFLICT (order_id) DO UPDATE SET
    fulfillment_status = 'delivered',
    payment_status = 'paid',
    updated_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'fulfillment_status', 'delivered',
    'converted_allocations', v_reserved_count
  );
END;
$$;

ALTER FUNCTION public.confirm_order_delivery(bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.confirm_order_delivery(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_delivery(bigint) TO authenticated, service_role;

-- RPC 5: Cancel Order (Release Reserved Stock Back to Available + Upsert order_meta)
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alloc record;
  v_status text;
  v_is_hist boolean;
  v_released_count integer := 0;
BEGIN
  IF NOT public.is_owner_or_service() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can cancel orders.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;
  IF COALESCE(v_is_hist, (p_order_id <= 170)) THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

  SELECT fulfillment_status INTO v_status
  FROM public.order_meta
  WHERE order_id = p_order_id;

  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'cancelled', 'message', 'Order already cancelled.');
  END IF;

  IF v_status IN ('delivered', 'partially_returned', 'returned') THEN
    RAISE EXCEPTION 'Cannot cancel order %: order is already "%". Process a customer return instead.', p_order_id, v_status;
  END IF;

  PERFORM 1
  FROM public.inventory_items i
  WHERE i.id IN (
    SELECT DISTINCT inventory_item_id
    FROM public.order_stock_allocations
    WHERE order_id = p_order_id AND allocation_status = 'reserved'
  )
  ORDER BY i.id ASC
  FOR UPDATE;

  FOR v_alloc IN
    SELECT a.id, a.inventory_item_id, a.quantity
    FROM public.order_stock_allocations a
    WHERE a.order_id = p_order_id AND a.allocation_status = 'reserved'
  LOOP
    UPDATE public.inventory_items
    SET quantity_reserved = GREATEST(0, quantity_reserved - v_alloc.quantity),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_alloc.inventory_item_id;

    UPDATE public.order_stock_allocations
    SET allocation_status = 'released'
    WHERE id = v_alloc.id;

    v_released_count := v_released_count + 1;
  END LOOP;

  -- Upsert order_meta so cancellation always persists in DB
  INSERT INTO public.order_meta (order_id, fulfillment_status, updated_at)
  VALUES (p_order_id, 'cancelled', timezone('utc'::text, now()))
  ON CONFLICT (order_id) DO UPDATE SET
    fulfillment_status = 'cancelled',
    updated_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'fulfillment_status', 'cancelled',
    'released_allocations', v_released_count
  );
END;
$$;

ALTER FUNCTION public.cancel_order(bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cancel_order(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(bigint) TO authenticated, service_role;

-- RPC 6: Record Customer Return (Sellable vs Damaged, works for both allocated & #171-#201 orders)
CREATE OR REPLACE FUNCTION public.record_order_return(
  p_order_id bigint,
  p_items jsonb,
  p_condition text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text;
  v_req record;
  v_alloc record;
  v_inv_id text;
  v_inv_sold integer;
  v_is_hist boolean;
  v_has_confirmed_allocs boolean := false;
  v_order_total_sold integer := 0;
  v_order_total_returned integer := 0;
  v_rem_qty integer;
  v_take_qty integer;
  v_new_status text;
BEGIN
  IF NOT public.is_owner_or_service() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can record returns.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;
  IF COALESCE(v_is_hist, (p_order_id <= 170)) THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

  SELECT fulfillment_status INTO v_status
  FROM public.order_meta
  WHERE order_id = p_order_id;

  IF v_status IS NULL OR v_status NOT IN ('delivered', 'partially_returned') THEN
    RAISE EXCEPTION 'Cannot return order %: status must be "delivered" or "partially_returned".', p_order_id;
  END IF;

  IF p_condition IS NULL OR p_condition NOT IN ('sellable', 'damaged') THEN
    RAISE EXCEPTION 'Invalid return condition "%": must be "sellable" or "damaged".', COALESCE(p_condition, 'NULL');
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items must be a valid, non-empty JSON array.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.order_stock_allocations
    WHERE order_id = p_order_id AND allocation_status = 'confirmed'
  ) INTO v_has_confirmed_allocs;

  FOR v_req IN SELECT * FROM jsonb_to_recordset(p_items) AS x(title text, quantity numeric) LOOP
    IF v_req.quantity IS NULL OR v_req.quantity <= 0 THEN
      CONTINUE;
    END IF;

    v_rem_qty := v_req.quantity::integer;

    IF v_has_confirmed_allocs THEN
      FOR v_alloc IN
        SELECT
          a.id AS allocation_id,
          a.inventory_item_id,
          (a.quantity - COALESCE(SUM(r.quantity), 0))::integer AS alloc_rem_returnable,
          i.quantity_sold AS lot_sold
        FROM public.order_stock_allocations a
        JOIN public.inventory_items i ON a.inventory_item_id = i.id
        LEFT JOIN public.order_returns r ON r.allocation_id = a.id
        WHERE a.order_id = p_order_id
          AND a.allocation_status = 'confirmed'
          AND public.normalize_book_title(i.title) = public.normalize_book_title(v_req.title)
        GROUP BY a.id, a.inventory_item_id, a.quantity, a.created_at, i.quantity_sold
        HAVING (a.quantity - COALESCE(SUM(r.quantity), 0)) > 0
        ORDER BY a.created_at DESC, a.id DESC
      LOOP
        EXIT WHEN v_rem_qty <= 0;
        v_take_qty := LEAST(v_rem_qty, v_alloc.alloc_rem_returnable);

        UPDATE public.inventory_items
        SET quantity_sold = GREATEST(0, quantity_sold - v_take_qty),
            quantity_damaged = CASE WHEN p_condition = 'damaged' THEN quantity_damaged + v_take_qty ELSE quantity_damaged END,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_alloc.inventory_item_id;

        INSERT INTO public.order_returns (
          order_id, inventory_item_id, allocation_id, title, quantity, condition, notes
        ) VALUES (
          p_order_id, v_alloc.inventory_item_id, v_alloc.allocation_id, trim(v_req.title), v_take_qty, p_condition, p_notes
        );

        v_rem_qty := v_rem_qty - v_take_qty;
      END LOOP;
    ELSE
      -- Direct-checkout live order (#171-#201): resolve matching inventory item directly
      SELECT id, quantity_sold INTO v_inv_id, v_inv_sold
      FROM public.inventory_items
      WHERE public.normalize_book_title(title) = public.normalize_book_title(v_req.title)
         OR (
           public.normalize_book_title(title) LIKE '%' || public.normalize_book_title(v_req.title) || '%'
           AND public.normalize_book_title(v_req.title) <> ''
         )
         OR (
           public.normalize_book_title(v_req.title) LIKE '%' || public.normalize_book_title(title) || '%'
           AND public.normalize_book_title(title) <> ''
         )
      ORDER BY quantity_sold DESC, id ASC
      LIMIT 1
      FOR UPDATE;

      IF v_inv_id IS NOT NULL THEN
        v_take_qty := LEAST(v_rem_qty, GREATEST(0, v_inv_sold));
        IF v_take_qty > 0 THEN
          UPDATE public.inventory_items
          SET quantity_sold = GREATEST(0, quantity_sold - v_take_qty),
              quantity_damaged = CASE WHEN p_condition = 'damaged' THEN quantity_damaged + v_take_qty ELSE quantity_damaged END,
              updated_at = timezone('utc'::text, now())
          WHERE id = v_inv_id;
        END IF;

        INSERT INTO public.order_returns (
          order_id, inventory_item_id, allocation_id, title, quantity, condition, notes
        ) VALUES (
          p_order_id, v_inv_id, NULL, trim(v_req.title), v_rem_qty, p_condition, p_notes
        );
      END IF;
    END IF;
  END LOOP;

  IF v_has_confirmed_allocs THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_order_total_sold
    FROM public.order_stock_allocations
    WHERE order_id = p_order_id AND allocation_status = 'confirmed';
  ELSE
    BEGIN
      SELECT COALESCE(jsonb_array_length(
        CASE WHEN jsonb_typeof(items::jsonb) = 'array' THEN items::jsonb ELSE '[]'::jsonb END
      ), 1)
      INTO v_order_total_sold
      FROM public.orders WHERE id = p_order_id;
    EXCEPTION WHEN OTHERS THEN
      v_order_total_sold := 1;
    END;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_order_total_returned
  FROM public.order_returns
  WHERE order_id = p_order_id;

  v_new_status := CASE WHEN v_order_total_returned >= GREATEST(1, v_order_total_sold) THEN 'returned' ELSE 'partially_returned' END;

  INSERT INTO public.order_meta (order_id, fulfillment_status, return_condition, notes, updated_at)
  VALUES (p_order_id, v_new_status, p_condition, p_notes, timezone('utc'::text, now()))
  ON CONFLICT (order_id) DO UPDATE SET
    fulfillment_status = v_new_status,
    return_condition = p_condition,
    notes = CASE
              WHEN p_notes IS NOT NULL AND trim(p_notes) <> ''
              THEN COALESCE(public.order_meta.notes || E'\n', '') || trim(p_notes)
              ELSE public.order_meta.notes
            END,
    updated_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'fulfillment_status', v_new_status,
    'condition', p_condition
  );
END;
$$;

ALTER FUNCTION public.record_order_return(bigint, jsonb, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_order_return(bigint, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_order_return(bigint, jsonb, text, text) TO authenticated, service_role;

-- ============================================================================
-- SECTION 7: DEBT BALANCE INTEGRITY TRIGGER (PHASE 4)
-- Uses %TYPE so both text and uuid debt IDs work seamlessly without casting errors
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_debt_balance_on_repayment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_debt_id public.debts.id%TYPE;
  v_total_repaid numeric(12,2);
  v_orig_amount numeric(12,2);
BEGIN
  v_target_debt_id := COALESCE(NEW.debt_id, OLD.debt_id);

  SELECT original_amount_da
  INTO v_orig_amount
  FROM public.debts
  WHERE id = v_target_debt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(amount_da), 0)
  INTO v_total_repaid
  FROM public.debt_repayments
  WHERE debt_id = v_target_debt_id;

  UPDATE public.debts
  SET amount_repaid_da = v_total_repaid,
      remaining_balance_da = GREATEST(0, v_orig_amount - v_total_repaid),
      updated_at = timezone('utc'::text, now())
  WHERE id = v_target_debt_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

ALTER FUNCTION public.sync_debt_balance_on_repayment() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_sync_debt_balance ON public.debt_repayments;
DROP TRIGGER IF EXISTS trg_sync_debt_repayment ON public.debt_repayments;
CREATE TRIGGER trg_sync_debt_repayment
AFTER INSERT OR UPDATE OR DELETE ON public.debt_repayments
FOR EACH ROW
EXECUTE FUNCTION public.sync_debt_balance_on_repayment();

REVOKE ALL ON FUNCTION public.sync_debt_balance_on_repayment() FROM PUBLIC, anon, authenticated;

COMMIT;
