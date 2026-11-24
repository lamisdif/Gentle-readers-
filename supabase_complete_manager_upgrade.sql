-- ============================================================================
-- GENTLE READERS — COMPLETE MANAGER & INVENTORY UPGRADE (PHASES 2, 3, & 4)
-- Safe | Re-runnable | Non-destructive | 100% Historical Order & Storefront Safe
-- Atomically Consistent | Strict FIFO Allocation | Comprehensive Financial Ledger
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: INVENTORY AUDIT COLUMNS & GENERATED COLUMN REBUILD
-- ============================================================================

-- 1. Dedicated audit classification columns on inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS quantity_lost integer NOT NULL DEFAULT 0 CHECK (quantity_lost >= 0),
  ADD COLUMN IF NOT EXISTS quantity_promotional integer NOT NULL DEFAULT 0 CHECK (quantity_promotional >= 0),
  ADD COLUMN IF NOT EXISTS quantity_returned_to_supplier integer NOT NULL DEFAULT 0 CHECK (quantity_returned_to_supplier >= 0),
  ADD COLUMN IF NOT EXISTS quantity_count_adjustment integer NOT NULL DEFAULT 0;

-- 2. Controlled rebuild of stored generated columns & balance constraint
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

-- Composite FIFO index for fast stock allocation: OLD_STOCK before NEW_STOCK
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
  v_curr_received  integer;
BEGIN
  -- 1. Restock restriction: new purchases must create a new batch/lot
  IF NEW.adjustment_type = 'restock' THEN
    RAISE EXCEPTION 'RESTOCK_RESTRICTION: New inventory purchases must create a new purchase lot/batch with its own cost and acquisition date. Existing lots must never have their original quantity_received inflated.';
  END IF;

  -- 2. Concurrency isolation lock on target inventory row
  SELECT 
    quantity_available,
    quantity_received
  INTO 
    v_curr_available,
    v_curr_received
  FROM public.inventory_items
  WHERE id = NEW.inventory_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND: Inventory item "%" does not exist.', NEW.inventory_item_id;
  END IF;

  -- 3. Verify previous_quantity matches actual current availability
  IF NEW.previous_quantity <> v_curr_available THEN
    RAISE EXCEPTION 'CONCURRENCY_CONFLICT: Current available quantity (%) does not match recorded previous_quantity (%). Refresh and retry.',
      v_curr_available, NEW.previous_quantity;
  END IF;

  -- 4. Verify arithmetic balance
  IF NEW.new_quantity <> (NEW.previous_quantity + NEW.quantity_change) THEN
    RAISE EXCEPTION 'BALANCE_CHECK_FAILED: new_quantity (%) must equal previous_quantity (%) + quantity_change (%).',
      NEW.new_quantity, NEW.previous_quantity, NEW.quantity_change;
  END IF;

  -- 5. Prevent negative inventory
  IF NEW.new_quantity < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_STOCK_ERROR: Adjustment results in negative stock (% < 0). Operation rejected.',
      NEW.new_quantity;
  END IF;

  -- 6. Apply adjustment strictly to dedicated classification columns
  CASE NEW.adjustment_type
    WHEN 'damaged' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Damaged adjustment quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET 
        quantity_damaged = quantity_damaged + ABS(NEW.quantity_change),
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    WHEN 'lost' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Lost adjustment quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET 
        quantity_lost = quantity_lost + ABS(NEW.quantity_change),
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    WHEN 'gift_promo' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Gift/promo quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET 
        quantity_promotional = quantity_promotional + ABS(NEW.quantity_change),
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    WHEN 'return_to_supplier' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Return to supplier quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET 
        quantity_returned_to_supplier = quantity_returned_to_supplier + ABS(NEW.quantity_change),
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    WHEN 'count_correction' THEN
      UPDATE public.inventory_items
      SET 
        quantity_count_adjustment = quantity_count_adjustment + NEW.quantity_change,
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    ELSE
      RAISE EXCEPTION 'UNKNOWN_ADJUSTMENT_TYPE: "%" is not a recognized adjustment type.', NEW.adjustment_type;
  END CASE;

  RETURN NEW;
END;
$$;

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
WHERE public.is_owner() AND i.quantity_available > 0;

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
WHERE public.is_owner()
GROUP BY i.title;

REVOKE ALL ON public.v_inventory_fifo_lots FROM PUBLIC, anon;
GRANT SELECT ON public.v_inventory_fifo_lots TO authenticated;

REVOKE ALL ON public.v_inventory_summary FROM PUBLIC, anon;
GRANT SELECT ON public.v_inventory_summary TO authenticated;

-- ============================================================================
-- SECTION 5: TITLE NORMALIZATION HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_book_title(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(
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
  ));
$$;

GRANT EXECUTE ON FUNCTION public.normalize_book_title(text) TO anon, authenticated;

-- ============================================================================
-- SECTION 6: ATOMIC ORDER LIFECYCLE RPCs (PHASE 3)
-- ============================================================================

-- RPC 1: Update Operational Metadata
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
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can update order metadata.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  -- Protection of historical orders
  IF p_order_id <= 170 THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  IF p_payment_status IS NOT NULL AND p_payment_status NOT IN ('unpaid', 'paid', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status "%": must be unpaid, paid, or refunded.', p_payment_status;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;

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

GRANT EXECUTE ON FUNCTION public.update_order_operational_meta TO authenticated;

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
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can transition order fulfillment status.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
  IF COALESCE(v_is_hist, (p_order_id <= 170)) THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  IF p_new_status IS NULL OR p_new_status NOT IN ('processing', 'shipped') THEN
    RAISE EXCEPTION 'Invalid target status "%": transition_order_fulfillment_status only permits transitions to "processing" or "shipped".', COALESCE(p_new_status, 'NULL');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;

  SELECT fulfillment_status INTO v_curr_status
  FROM public.order_meta
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_curr_status IS NULL THEN
    v_curr_status := 'pending';
    INSERT INTO public.order_meta (order_id, fulfillment_status)
    VALUES (p_order_id, 'pending')
    ON CONFLICT (order_id) DO NOTHING;
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

  UPDATE public.order_meta
  SET fulfillment_status = p_new_status,
      notes = CASE 
                WHEN p_notes IS NOT NULL AND trim(p_notes) <> '' 
                THEN COALESCE(notes || E'\n', '') || trim(p_notes)
                ELSE notes
              END,
      updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'previous_status', v_curr_status,
    'fulfillment_status', p_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_order_fulfillment_status TO authenticated;

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
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can reserve stock for orders.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
  IF COALESCE(v_is_hist, (p_order_id <= 170)) THEN
    RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('gr_order_lock:' || p_order_id::text, 0)
  );

  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;

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
    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'message', 'Order already has active allocations. Operation is idempotent.');
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
      RAISE EXCEPTION 'Quantity for "%" must be a positive integer, received %.', v_req.title, v_req.quantity;
    END IF;

    INSERT INTO _reqs (norm_title, display_title, req_qty)
    VALUES (lower(trim(v_req.title)), trim(v_req.title), v_req.quantity::integer)
    ON CONFLICT (norm_title) DO UPDATE
    SET req_qty = _reqs.req_qty + EXCLUDED.req_qty;
  END LOOP;

  -- Deterministic locking order
  PERFORM 1
  FROM public.inventory_items i
  WHERE lower(trim(i.title)) IN (SELECT norm_title FROM _reqs)
  ORDER BY i.id ASC
  FOR UPDATE;

  -- Pre-validation of total available stock
  FOR v_req IN SELECT * FROM _reqs LOOP
    SELECT COALESCE(SUM(quantity_available), 0)
    INTO v_avail_total
    FROM public.inventory_items
    WHERE lower(trim(title)) = v_req.norm_title;

    IF v_avail_total < v_req.req_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT STOCK: "%" requires %, but only % is available across inventory lots.',
        v_req.display_title, v_req.req_qty, v_avail_total;
    END IF;
  END LOOP;

  -- Strict FIFO Allocation: OLD_STOCK before NEW_STOCK
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
      WHERE lower(trim(title)) = v_req.norm_title
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

GRANT EXECUTE ON FUNCTION public.reserve_order_stock TO authenticated;

-- RPC 4: Confirm Order Delivery (Convert Reserved Stock to Sold)
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
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can confirm order delivery.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
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

  -- Idempotency
  IF v_status = 'delivered' THEN
    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'delivered', 'message', 'Order already marked delivered.');
  END IF;

  IF v_status IN ('cancelled', 'returned') THEN
    RAISE EXCEPTION 'Cannot confirm delivery: order % is currently "%".', p_order_id, v_status;
  END IF;

  SELECT COUNT(*) INTO v_reserved_count
  FROM public.order_stock_allocations
  WHERE order_id = p_order_id AND allocation_status = 'reserved';

  IF v_reserved_count = 0 THEN
    -- If no allocations recorded yet, still set fulfillment_status = delivered
    UPDATE public.order_meta
    SET fulfillment_status = 'delivered',
        payment_status = 'paid',
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;
    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'delivered', 'note', 'No active allocations were reserved.');
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
    SET allocation_status = 'confirmed',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_alloc.id;
  END LOOP;

  UPDATE public.order_meta
  SET fulfillment_status = 'delivered',
      payment_status = 'paid',
      updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'delivered');
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_delivery TO authenticated;

-- RPC 5: Cancel Order (Release Reserved Stock Back to Available Inventory)
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
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can cancel orders.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
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

  -- Idempotency
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
    SELECT a.id, a.inventory_item_id, a.quantity, i.quantity_reserved, i.title
    FROM public.order_stock_allocations a
    JOIN public.inventory_items i ON a.inventory_item_id = i.id
    WHERE a.order_id = p_order_id AND a.allocation_status = 'reserved'
  LOOP
    UPDATE public.inventory_items
    SET quantity_reserved = GREATEST(0, quantity_reserved - v_alloc.quantity),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_alloc.inventory_item_id;

    UPDATE public.order_stock_allocations
    SET allocation_status = 'released',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_alloc.id;
  END LOOP;

  UPDATE public.order_meta
  SET fulfillment_status = 'cancelled',
      updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order TO authenticated;

-- RPC 6: Record Customer Return (Sellable vs Damaged)
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
  v_is_hist boolean;
  v_order_total_sold integer := 0;
  v_order_total_returned integer := 0;
  v_new_status text;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can record returns.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  SELECT is_historical INTO v_is_hist FROM public.orders WHERE id = p_order_id;
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

  FOR v_req IN SELECT * FROM jsonb_to_recordset(p_items) AS x(title text, quantity numeric) LOOP
    IF v_req.quantity IS NULL OR v_req.quantity <= 0 THEN
      CONTINUE;
    END IF;

    -- Adjust inventory: restore sellable stock or track as damaged
    FOR v_alloc IN
      SELECT a.id, a.inventory_item_id, a.quantity, i.quantity_sold
      FROM public.order_stock_allocations a
      JOIN public.inventory_items i ON a.inventory_item_id = i.id
      WHERE a.order_id = p_order_id 
        AND a.allocation_status = 'confirmed'
        AND lower(trim(i.title)) = lower(trim(v_req.title))
      LIMIT 1
    LOOP
      UPDATE public.inventory_items
      SET 
        quantity_sold = GREATEST(0, quantity_sold - v_req.quantity::integer),
        quantity_damaged = CASE WHEN p_condition = 'damaged' THEN quantity_damaged + v_req.quantity::integer ELSE quantity_damaged END,
        updated_at = timezone('utc'::text, now())
      WHERE id = v_alloc.inventory_item_id;

      INSERT INTO public.order_returns (
        order_id,
        inventory_item_id,
        allocation_id,
        quantity,
        condition,
        notes
      ) VALUES (
        p_order_id,
        v_alloc.inventory_item_id,
        v_alloc.id,
        v_req.quantity::integer,
        p_condition,
        p_notes
      );
    END LOOP;
  END LOOP;

  -- Determine partially_returned vs returned
  SELECT COALESCE(SUM(quantity), 0) INTO v_order_total_sold
  FROM public.order_stock_allocations
  WHERE order_id = p_order_id AND allocation_status = 'confirmed';

  SELECT COALESCE(SUM(quantity), 0) INTO v_order_total_returned
  FROM public.order_returns
  WHERE order_id = p_order_id;

  v_new_status := CASE WHEN v_order_total_returned >= v_order_total_sold THEN 'returned' ELSE 'partially_returned' END;

  UPDATE public.order_meta
  SET fulfillment_status = v_new_status,
      return_condition = p_condition,
      updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'fulfillment_status', v_new_status,
    'condition', p_condition
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_order_return TO authenticated;

-- ============================================================================
-- SECTION 7: DEBT BALANCE INTEGRITY TRIGGER (PHASE 4)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_debt_balance_on_repayment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_debt_id uuid;
  v_total_repaid numeric(12,2);
  v_orig_amount numeric(12,2);
BEGIN
  v_target_debt_id := COALESCE(NEW.debt_id, OLD.debt_id);

  SELECT 
    original_amount_da 
  INTO 
    v_orig_amount
  FROM public.debts 
  WHERE id = v_target_debt_id 
  FOR UPDATE;

  SELECT COALESCE(SUM(amount_da), 0)
  INTO v_total_repaid
  FROM public.debt_repayments
  WHERE debt_id = v_target_debt_id;

  UPDATE public.debts
  SET 
    amount_repaid_da = v_total_repaid,
    remaining_balance_da = GREATEST(0, v_orig_amount - v_total_repaid),
    updated_at = timezone('utc'::text, now())
  WHERE id = v_target_debt_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_debt_repayment ON public.debt_repayments;
CREATE TRIGGER trg_sync_debt_repayment
AFTER INSERT OR UPDATE OR DELETE ON public.debt_repayments
FOR EACH ROW
EXECUTE FUNCTION public.sync_debt_balance_on_repayment();

REVOKE ALL ON FUNCTION public.sync_debt_balance_on_repayment() FROM PUBLIC, anon, authenticated;

COMMIT;
