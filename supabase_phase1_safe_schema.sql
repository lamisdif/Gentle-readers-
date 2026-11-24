-- ============================================================================
-- GENTLE READERS — PHASE 1: SAFE SCHEMA ENHANCEMENT & SECURITY HARDENING
-- Non-destructive | Re-run Safe | Fully Auditable | Atomically Consistent
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ADD NATIVE COLUMNS TO INVENTORY_ITEMS
-- Non-destructive: Adds dedicated columns without deleting or modifying any existing row.
-- ----------------------------------------------------------------------------
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS isbn text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS location text;

CREATE INDEX IF NOT EXISTS idx_inventory_items_author ON public.inventory_items(author);
CREATE INDEX IF NOT EXISTS idx_inventory_items_isbn ON public.inventory_items(isbn);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);

-- ----------------------------------------------------------------------------
-- 2. PERSISTENT HISTORICAL ORDER BOUNDARY ON ORDERS TABLE
-- Permanently flags historical orders (IDs <= 170) directly in the database
-- so future logic relies on an explicit database column rather than hardcoded IDs.
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_historical boolean NOT NULL DEFAULT false;

-- Persistently mark historical orders (executed once; safe to re-run)
UPDATE public.orders
SET is_historical = true
WHERE id <= 170 AND is_historical = false;

CREATE INDEX IF NOT EXISTS idx_orders_is_historical ON public.orders(is_historical);

-- ----------------------------------------------------------------------------
-- 3. HARDEN ORDERS TABLE ROW LEVEL SECURITY & PERMISSIONS (CUSTOMER PRIVACY)
-- Revokes public SELECT from anonymous users to protect customer personal data.
-- Grants INSERT to anon/authenticated so customer storefront checkout succeeds.
-- Grants USAGE, SELECT strictly on public.orders_id_seq for order ID generation.
-- Restricts SELECT, UPDATE, DELETE strictly to the authenticated store owner.
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies on orders dynamically to prevent duplicates
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname);
  END LOOP;
END $$;

-- Revoke public read access at the database privilege level
REVOKE SELECT, UPDATE, DELETE ON TABLE public.orders FROM anon, public;
GRANT INSERT ON TABLE public.orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.orders TO authenticated;

-- Narrowly grant sequence privilege strictly on public.orders_id_seq
GRANT USAGE, SELECT ON SEQUENCE public.orders_id_seq TO anon, authenticated;

-- Policy A: Customer checkout submission (anonymous or authenticated)
CREATE POLICY "storefront_insert_orders" ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy B: Store owner full management access (requires verified owner UUID/email)
CREATE POLICY "owner_full_access_orders" ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- ----------------------------------------------------------------------------
-- 4. CREATE OWNER CAPITAL CONTRIBUTIONS TABLE
-- Records owner personal funds injected into the business separate from sales
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.capital_contributions (
  id text PRIMARY KEY,
  amount_da numeric(12,2) NOT NULL CHECK (amount_da > 0),
  contribution_date date NOT NULL DEFAULT current_date,
  source text NOT NULL DEFAULT 'Owner Personal Funds',
  payment_method text NOT NULL DEFAULT 'Cash',
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.capital_contributions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "owner_capital_contributions_all" ON public.capital_contributions;
  CREATE POLICY "owner_capital_contributions_all" ON public.capital_contributions
    FOR ALL TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());
END $$;

-- ----------------------------------------------------------------------------
-- 5. CREATE OWNER WITHDRAWALS TABLE
-- Records owner personal drawings separate from operational business expenses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_withdrawals (
  id text PRIMARY KEY,
  amount_da numeric(12,2) NOT NULL CHECK (amount_da > 0),
  withdrawal_date date NOT NULL DEFAULT current_date,
  reason text NOT NULL DEFAULT 'Owner Draw',
  payment_method text NOT NULL DEFAULT 'Cash',
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.owner_withdrawals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "owner_withdrawals_all" ON public.owner_withdrawals;
  CREATE POLICY "owner_withdrawals_all" ON public.owner_withdrawals
    FOR ALL TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());
END $$;

-- ----------------------------------------------------------------------------
-- 6. CREATE STOCK ADJUSTMENT AUDIT LEDGER
-- Records manual quantity additions, damages, losses, or counting corrections.
-- Immutability enforced: entries cannot be updated or deleted once written.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id text PRIMARY KEY,
  inventory_item_id text NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('count_correction', 'damaged', 'lost', 'restock', 'return_to_supplier', 'gift_promo')),
  quantity_change integer NOT NULL CHECK (quantity_change <> 0),
  previous_quantity integer NOT NULL CHECK (previous_quantity >= 0),
  new_quantity integer NOT NULL CHECK (new_quantity >= 0),
  CONSTRAINT stock_adjustment_balance_check
    CHECK (new_quantity = previous_quantity + quantity_change),
  unit_cost_da numeric(10,2) CHECK (unit_cost_da IS NULL OR unit_cost_da >= 0),
  reason text NOT NULL,
  adjustment_date date NOT NULL DEFAULT current_date,
  created_by text NOT NULL DEFAULT 'owner',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "owner_stock_adjustments_select" ON public.stock_adjustments;
  CREATE POLICY "owner_stock_adjustments_select" ON public.stock_adjustments
    FOR SELECT TO authenticated
    USING (public.is_owner());

  DROP POLICY IF EXISTS "owner_stock_adjustments_insert" ON public.stock_adjustments;
  CREATE POLICY "owner_stock_adjustments_insert" ON public.stock_adjustments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner());
END $$;

-- ----------------------------------------------------------------------------
-- 7. ENFORCE IMMUTABILITY ON STOCK ADJUSTMENT LEDGER
-- Prevents UPDATE and DELETE operations. Corrections must be recorded as new adjustments.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_stock_adjustment_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_RECORD: Stock adjustment ledger entries cannot be edited or deleted. Record a new compensating adjustment instead.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_stock_adjustment_mutation ON public.stock_adjustments;
CREATE TRIGGER trg_prevent_stock_adjustment_mutation
BEFORE UPDATE OR DELETE ON public.stock_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_stock_adjustment_immutability();

-- ----------------------------------------------------------------------------
-- 8. PHASE 1 SAFETY: DO NOT MUTATE INVENTORY FROM ADJUSTMENT LEDGER
-- The ledger is created and protected in Phase 1.
-- Stock mutations will be implemented only after batch-aware FIFO
-- and inventory balance rules are verified in the next phase.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_stock_adjustment_apply ON public.stock_adjustments;
DROP FUNCTION IF EXISTS public.apply_stock_adjustment();

COMMIT;
