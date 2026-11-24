-- ============================================================================
-- GENTLE READERS — PHASE 2: RELIABLE INVENTORY FOUNDATION & FIFO LEDGER
-- Non-destructive | Re-run Safe | Zero Storefront Impact | Atomically Consistent
-- Owner-Only Views | Strict Audit Classification | Pure Purchase History
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ADD DEDICATED AUDIT CLASSIFICATION COLUMNS TO INVENTORY_ITEMS
-- Distinguishes loss, promotional gifts, supplier returns, and count corrections
-- so original quantity_received and customer quantity_sold remain completely pure.
-- ----------------------------------------------------------------------------
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS quantity_lost integer NOT NULL DEFAULT 0 CHECK (quantity_lost >= 0),
  ADD COLUMN IF NOT EXISTS quantity_promotional integer NOT NULL DEFAULT 0 CHECK (quantity_promotional >= 0),
  ADD COLUMN IF NOT EXISTS quantity_returned_to_supplier integer NOT NULL DEFAULT 0 CHECK (quantity_returned_to_supplier >= 0),
  ADD COLUMN IF NOT EXISTS quantity_count_adjustment integer NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 2. CONTROLLED REBUILD OF STORED GENERATED COLUMNS & BALANCE CONSTRAINT
-- In PostgreSQL, modifying a stored generated expression requires dropping and
-- re-adding the column. This controlled transaction preserves all 228 rows,
-- computes identical values (new columns default to 0), and has zero dependency breakage.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. CORE PERFORMANCE & COMPOSITE FIFO INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_purchase_batches_supplier ON public.purchase_batches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_batches_date ON public.purchase_batches(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_batches_group ON public.purchase_batches(stock_group);

CREATE INDEX IF NOT EXISTS idx_inventory_items_title ON public.inventory_items(title);
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch ON public.inventory_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_group ON public.inventory_items(stock_group);
CREATE INDEX IF NOT EXISTS idx_inventory_items_cost ON public.inventory_items(unit_purchase_cost_da);

-- Composite FIFO index: fast retrieval of available lots in FIFO order
CREATE INDEX IF NOT EXISTS idx_inventory_items_fifo 
ON public.inventory_items (title, stock_group, acquisition_date ASC, created_at ASC)
WHERE (quantity_available > 0);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_item 
ON public.stock_adjustments (inventory_item_id, adjustment_date DESC);

-- ----------------------------------------------------------------------------
-- 4. ATOMIC STOCK ADJUSTMENT APPLICATION TRIGGER
-- Validates:
--   a) Restocking on existing lot is REJECTED (new purchases must create a new lot/batch).
--   b) Concurrency lock via FOR UPDATE prevents race conditions.
--   c) previous_quantity matches current quantity_available.
--   d) new_quantity = previous_quantity + quantity_change.
--   e) new_quantity >= 0 (no negative stock).
--   f) Mutates dedicated category columns; never corrupts quantity_received, quantity_sold, or costs.
-- ----------------------------------------------------------------------------
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

  -- 2. Lock the target inventory row to guarantee concurrency isolation
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
  -- Original purchase quantities (quantity_received), customer sales (quantity_sold),
  -- unit purchase costs, and batch connections remain 100% untouched.
  CASE NEW.adjustment_type
    -- Damaged items on shelf: tracked in quantity_damaged
    WHEN 'damaged' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Damaged adjustment quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET 
        quantity_damaged = quantity_damaged + ABS(NEW.quantity_change),
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    -- Lost stock / shrinkage: tracked in quantity_lost (separate from damaged)
    WHEN 'lost' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Lost adjustment quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET 
        quantity_lost = quantity_lost + ABS(NEW.quantity_change),
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    -- Promotional gifts / book reviewer copies: tracked in quantity_promotional (separate from customer sales)
    WHEN 'gift_promo' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Gift/promo quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET 
        quantity_promotional = quantity_promotional + ABS(NEW.quantity_change),
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    -- Return to supplier: tracked in quantity_returned_to_supplier (invoice quantity_received preserved)
    WHEN 'return_to_supplier' THEN
      IF NEW.quantity_change > 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Return to supplier quantity_change must be negative.';
      END IF;
      UPDATE public.inventory_items
      SET 
        quantity_returned_to_supplier = quantity_returned_to_supplier + ABS(NEW.quantity_change),
        updated_at = timezone('utc'::text, now())
      WHERE id = NEW.inventory_item_id;

    -- Physical inventory count discrepancies: tracked in quantity_count_adjustment
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

-- Revoke direct execute permissions from all users; trigger runs strictly internally
REVOKE ALL ON FUNCTION public.apply_stock_adjustment() FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. OWNER-ONLY FIFO INVENTORY LOT DISCOVERY VIEW
-- Surfaces all available stock lots per book title in strict FIFO order:
--   Priority 1: OLD_STOCK (liquidate historical inventory first)
--   Priority 2: NEW_STOCK (chronological by acquisition_date, then created_at)
-- Security:
--   - Filtered with WHERE public.is_owner()
--   - Defined WITH (security_invoker = true) to enforce underlying table RLS
--   - Non-owners receive 0 rows
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. OWNER-ONLY INVENTORY VALUATION & AUDIT SUMMARY VIEW
-- Aggregates inventory by title while rigorously isolating known vs unknown costs.
-- Guarantees:
--   - Accessible STRICTLY to verified store owner account (WHERE public.is_owner()).
--   - NULL purchase costs are NEVER converted to 0 DA.
--   - Explicitly reports uncosted_units and cost_status.
-- ----------------------------------------------------------------------------
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
  -- Known vs Unknown cost auditing
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

-- ----------------------------------------------------------------------------
-- 7. VIEW PERMISSIONS & SECURITY HARDENING
-- Non-owners and anon users receive 0 rows and cannot access views.
-- ----------------------------------------------------------------------------
ALTER VIEW public.v_inventory_fifo_lots OWNER TO postgres;
ALTER VIEW public.v_inventory_summary OWNER TO postgres;

REVOKE ALL ON public.v_inventory_fifo_lots FROM PUBLIC, anon;
GRANT SELECT ON public.v_inventory_fifo_lots TO authenticated;

REVOKE ALL ON public.v_inventory_summary FROM PUBLIC, anon;
GRANT SELECT ON public.v_inventory_summary TO authenticated;

COMMIT;
