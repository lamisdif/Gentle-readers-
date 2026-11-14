-- ============================================================================
-- GENTLE READERS — PHASE 2 FINAL PRODUCTION MIGRATION (DATABASE-ENFORCED)
-- Target Database: Supabase PostgreSQL
-- Scope: All 10 Management Tables, RLS, Concurrency RPCs, Return Ledger
-- Non-Destructive: ZERO modification to public.orders or storefront checkout
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. PRE-FLIGHT COMPATIBILITY & SCHEMA VERIFICATION
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_orders_exists boolean;
  v_id_type text;
  v_is_nullable text;
  v_id_has_pk_or_unique boolean;
  v_conflicts text[] := ARRAY[]::text[];
  v_t text;
  mgr_tables text[] := ARRAY[
    'suppliers',
    'purchase_batches',
    'inventory_items',
    'order_meta',
    'order_stock_allocations',
    'order_returns',
    'debts',
    'debt_repayments',
    'operating_expenses',
    'opening_position'
  ];
BEGIN
  -- 1. Explicitly verify public.orders exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) INTO v_orders_exists;

  IF NOT v_orders_exists THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILURE: Table public.orders does not exist. Aborting migration.';
  END IF;

  -- 2. Explicitly verify public.orders.id exists, is 'bigint', and is NOT NULL
  SELECT data_type, is_nullable INTO v_id_type, v_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'id';

  IF v_id_type IS NULL THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILURE: Column public.orders.id does not exist. Aborting migration.';
  END IF;

  IF v_id_type IS DISTINCT FROM 'bigint' THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILURE: public.orders.id type is "%", but must be "bigint". Aborting migration.', v_id_type;
  END IF;

  IF v_is_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILURE: public.orders.id is nullable. It must be NOT NULL to serve as a valid foreign key target. Aborting migration.';
  END IF;

  -- 3. Explicitly verify public.orders.id has a single-column PRIMARY KEY or UNIQUE constraint
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND c.contype IN ('p', 'u')
      AND a.attname = 'id'
      AND array_length(c.conkey, 1) = 1
  ) INTO v_id_has_pk_or_unique;

  IF NOT v_id_has_pk_or_unique THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILURE: Column public.orders.id does not have a single-column PRIMARY KEY or UNIQUE constraint. It cannot safely serve as a foreign key target. Aborting migration.';
  END IF;

  -- 4. Detect pre-existing management tables to prevent silent incompatible reuse
  FOREACH v_t IN ARRAY mgr_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = v_t
    ) THEN
      v_conflicts := array_append(v_conflicts, v_t);
    END IF;
  END LOOP;

  IF array_length(v_conflicts, 1) > 0 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILURE: Found pre-existing management table(s): %. To prevent silent schema corruption, migration will not run over existing tables. If rolling back or upgrading, drop or migrate them explicitly.', array_to_string(v_conflicts, ', ');
  END IF;

  RAISE NOTICE 'Pre-flight check passed: verified public.orders (id: bigint, NOT NULL, PK/UNIQUE), zero conflicting management tables.';
END $$;

-- ----------------------------------------------------------------------------
-- 1. HARDENED OWNER IDENTIFICATION FUNCTION
-- Locks access strictly to Lamis Dif's account (UUID: 288ed5dc-8c9a-4f7c-9141-49f71b80106f)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    auth.uid() = '288ed5dc-8c9a-4f7c-9141-49f71b80106f'::uuid,
    false
  );
$$;

ALTER FUNCTION public.is_owner() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. SUPPLIERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE public.suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. PURCHASE BATCHES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE public.purchase_batches (
  id text PRIMARY KEY,
  batch_name text NOT NULL,
  stock_group text NOT NULL DEFAULT 'NEW_STOCK' CHECK (stock_group IN ('OLD_STOCK', 'NEW_STOCK')),
  supplier_id text REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_date date DEFAULT current_date NOT NULL,
  total_units integer NOT NULL DEFAULT 0 CHECK (total_units >= 0),
  total_cost_da numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_cost_da >= 0),
  amount_paid_da numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid_da >= 0),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. INVENTORY ITEMS TABLE (Dual Stock: OLD_STOCK & NEW_STOCK)
-- ----------------------------------------------------------------------------
CREATE TABLE public.inventory_items (
  id text PRIMARY KEY,
  title text NOT NULL,
  stock_group text NOT NULL CHECK (stock_group IN ('OLD_STOCK', 'NEW_STOCK')),
  batch_id text REFERENCES public.purchase_batches(id) ON DELETE SET NULL,
  quantity_received integer NOT NULL CHECK (quantity_received >= 0),
  quantity_on_hand integer GENERATED ALWAYS AS (quantity_received - quantity_sold - quantity_reserved - quantity_damaged) STORED,
  quantity_available integer GENERATED ALWAYS AS (quantity_received - quantity_sold - quantity_reserved - quantity_damaged) STORED,
  quantity_sold integer NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  quantity_reserved integer NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_damaged integer NOT NULL DEFAULT 0 CHECK (quantity_damaged >= 0),
  unit_purchase_cost_da numeric(10,2) CHECK (unit_purchase_cost_da IS NULL OR unit_purchase_cost_da >= 0),
  purchase_cost_da numeric(10,2) GENERATED ALWAYS AS (unit_purchase_cost_da) STORED,
  selling_price_da numeric(10,2) CHECK (selling_price_da IS NULL OR selling_price_da >= 0),
  supplier_name text,
  acquisition_date date DEFAULT current_date NOT NULL,
  condition text DEFAULT 'Good',
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_quantity_balance CHECK (quantity_sold + quantity_reserved + quantity_damaged <= quantity_received)
);

CREATE INDEX idx_inventory_title ON public.inventory_items(title);
CREATE INDEX idx_inventory_stock_group ON public.inventory_items(stock_group);
CREATE INDEX idx_inventory_batch ON public.inventory_items(batch_id);

-- ----------------------------------------------------------------------------
-- 5. ORDER METADATA TABLE (Safe Retention: ON DELETE RESTRICT)
-- Direct client INSERT/UPDATE/DELETE access revoked at database level.
-- All fulfillment transitions must go through authorized lifecycle RPCs.
-- Operational shipping/packaging updates go through update_order_operational_meta RPC.
-- ----------------------------------------------------------------------------
CREATE TABLE public.order_meta (
  order_id bigint PRIMARY KEY REFERENCES public.orders(id) ON DELETE RESTRICT,
  fulfillment_status text NOT NULL DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'partially_returned', 'returned')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_method text,
  carrier text,
  tracking_number text,
  packaging_used text,
  packaging_cost_da numeric(10,2) DEFAULT 0 CHECK (packaging_cost_da >= 0),
  shipping_fee_da numeric(10,2) DEFAULT 0 CHECK (shipping_fee_da >= 0),
  actual_shipping_cost_da numeric(10,2) DEFAULT 0 CHECK (actual_shipping_cost_da >= 0),
  return_reason text,
  return_condition text CHECK (return_condition IS NULL OR return_condition IN ('sellable', 'damaged', 'partial')),
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to maintain updated_at on order_meta
CREATE OR REPLACE FUNCTION public.set_order_meta_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.set_order_meta_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_order_meta_updated_at() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_set_order_meta_updated_at ON public.order_meta;
CREATE TRIGGER trg_set_order_meta_updated_at
BEFORE UPDATE ON public.order_meta
FOR EACH ROW EXECUTE FUNCTION public.set_order_meta_updated_at();

-- ----------------------------------------------------------------------------
-- 6. ORDER STOCK ALLOCATIONS (Safe Retention: ON DELETE RESTRICT)
-- Immutable allocation audit ledger: Direct writes blocked, mutated ONLY via RPCs
-- ----------------------------------------------------------------------------
CREATE TABLE public.order_stock_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  inventory_item_id text NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_purchase_cost_da numeric(10,2) CHECK (unit_purchase_cost_da IS NULL OR unit_purchase_cost_da >= 0),
  cost_basis text NOT NULL DEFAULT 'fifo' CHECK (cost_basis IN ('fifo', 'specific_lot', 'provisional')),
  allocation_status text NOT NULL DEFAULT 'confirmed' CHECK (allocation_status IN ('reserved', 'confirmed', 'released')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_alloc_order ON public.order_stock_allocations(order_id);
CREATE INDEX idx_alloc_item ON public.order_stock_allocations(inventory_item_id);

-- Enforce Allocation Immutability & Valid Status Transitions at Database Level
CREATE OR REPLACE FUNCTION public.enforce_stock_allocation_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 1. Disallow DELETION of allocation records
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Immutable financial history: records in public.order_stock_allocations cannot be deleted. Orders are cancelled by releasing reservations, preserving audit history.';
  END IF;

  -- 2. On UPDATE, prevent changes to immutable core allocation fields
  IF TG_OP = 'UPDATE' THEN
    IF OLD.id <> NEW.id 
       OR OLD.order_id <> NEW.order_id 
       OR OLD.inventory_item_id <> NEW.inventory_item_id 
       OR OLD.quantity <> NEW.quantity 
       OR OLD.unit_purchase_cost_da IS DISTINCT FROM NEW.unit_purchase_cost_da 
       OR OLD.cost_basis <> NEW.cost_basis 
       OR OLD.created_at <> NEW.created_at THEN
      RAISE EXCEPTION 'Immutable financial history: cannot modify immutable fields (order_id, inventory_item_id, quantity, unit_purchase_cost_da, cost_basis, created_at) on order_stock_allocations.';
    END IF;

    -- 3. Enforce valid allocation_status state transitions
    IF OLD.allocation_status = 'reserved' THEN
      IF NEW.allocation_status NOT IN ('reserved', 'confirmed', 'released') THEN
        RAISE EXCEPTION 'Invalid allocation_status transition: cannot change "%" to "%".', OLD.allocation_status, NEW.allocation_status;
      END IF;
    ELSIF OLD.allocation_status = 'confirmed' THEN
      IF NEW.allocation_status <> 'confirmed' THEN
        RAISE EXCEPTION 'Immutable financial history: confirmed allocations cannot be changed to "%". Use customer returns instead.', NEW.allocation_status;
      END IF;
    ELSIF OLD.allocation_status = 'released' THEN
      IF NEW.allocation_status <> 'released' THEN
        RAISE EXCEPTION 'Immutable financial history: released allocations cannot be reactivated or changed to "%".', NEW.allocation_status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_stock_allocation_immutability() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enforce_stock_allocation_immutability() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_enforce_allocation_immutability ON public.order_stock_allocations;
CREATE TRIGGER trg_enforce_allocation_immutability
BEFORE UPDATE OR DELETE ON public.order_stock_allocations
FOR EACH ROW EXECUTE FUNCTION public.enforce_stock_allocation_immutability();

-- ----------------------------------------------------------------------------
-- 7. ORDER RETURNS TRANSACTION LEDGER
-- Immutable return audit ledger: Direct writes blocked, created ONLY via RPC
-- inventory_item_id and allocation_id are strictly NOT NULL
-- ----------------------------------------------------------------------------
CREATE TABLE public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  inventory_item_id text NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  allocation_id uuid NOT NULL REFERENCES public.order_stock_allocations(id) ON DELETE RESTRICT,
  title text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  condition text NOT NULL CHECK (condition IN ('sellable', 'damaged')),
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_returns_order ON public.order_returns(order_id);
CREATE INDEX idx_returns_item ON public.order_returns(inventory_item_id);
CREATE INDEX idx_returns_alloc ON public.order_returns(allocation_id);

-- Enforce Order Returns Immutability: Records cannot be updated or deleted
CREATE OR REPLACE FUNCTION public.prevent_immutable_return_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Immutable financial history: records in public.order_returns cannot be updated or deleted.';
END;
$$;

ALTER FUNCTION public.prevent_immutable_return_mutation() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.prevent_immutable_return_mutation() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_protect_order_returns ON public.order_returns;
CREATE TRIGGER trg_protect_order_returns
BEFORE UPDATE OR DELETE ON public.order_returns
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_return_mutation();

-- ----------------------------------------------------------------------------
-- 8. DEBTS TABLE
-- Protected: amount_repaid_da and remaining_balance_da are strictly derived
-- from the debt_repayments transaction ledger at the database level.
-- ----------------------------------------------------------------------------
CREATE TABLE public.debts (
  id text PRIMARY KEY,
  creditor_name text NOT NULL,
  debt_type text NOT NULL DEFAULT 'supplier' CHECK (debt_type IN ('supplier', 'personal', 'bank', 'other')),
  original_amount_da numeric(12,2) NOT NULL CHECK (original_amount_da > 0),
  amount_repaid_da numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_repaid_da >= 0),
  remaining_balance_da numeric(12,2) NOT NULL CHECK (remaining_balance_da >= 0),
  incurred_date date,
  due_date date,
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_debt_balance CHECK (amount_repaid_da <= original_amount_da AND amount_repaid_da >= 0)
);

-- Trigger to guarantee derived balance integrity without depending on client flags
CREATE OR REPLACE FUNCTION public.enforce_debt_balance_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ledger_repaid numeric(12,2);
BEGIN
  -- Always derive amount_repaid_da directly from the immutable debt_repayments ledger
  SELECT COALESCE(SUM(amount_da), 0) INTO v_ledger_repaid
  FROM public.debt_repayments
  WHERE debt_id = NEW.id;

  NEW.amount_repaid_da := v_ledger_repaid;
  NEW.remaining_balance_da := NEW.original_amount_da - v_ledger_repaid;

  -- Ensure principal cannot be lower than already recorded repayments
  IF NEW.remaining_balance_da < 0 THEN
    RAISE EXCEPTION 'Debt original_amount_da (%) cannot be less than recorded repayments (%).',
      NEW.original_amount_da, v_ledger_repaid;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_debt_balance_integrity() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enforce_debt_balance_integrity() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_enforce_debt_balance_integrity ON public.debts;
CREATE TRIGGER trg_enforce_debt_balance_integrity
BEFORE INSERT OR UPDATE ON public.debts
FOR EACH ROW EXECUTE FUNCTION public.enforce_debt_balance_integrity();

-- ----------------------------------------------------------------------------
-- 9. DEBT REPAYMENTS TRANSACTION LEDGER
-- Immutable: ON DELETE RESTRICT on debt_id, hardened reversals, audit preserved
-- ----------------------------------------------------------------------------
CREATE TABLE public.debt_repayments (
  id text PRIMARY KEY,
  debt_id text NOT NULL REFERENCES public.debts(id) ON DELETE RESTRICT,
  amount_da numeric(12,2) NOT NULL CHECK (amount_da <> 0),
  repayment_date date DEFAULT current_date NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'baridimob', 'bank_transfer', 'other')),
  reversal_of_id text REFERENCES public.debt_repayments(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_repayments_debt ON public.debt_repayments(debt_id);
-- Strict database-level guarantee: no repayment can ever be reversed more than once
CREATE UNIQUE INDEX idx_unique_reversal ON public.debt_repayments (reversal_of_id) WHERE reversal_of_id IS NOT NULL;

-- Enforce Debt Repayment Immutability: UPDATE and DELETE strictly forbidden
CREATE OR REPLACE FUNCTION public.enforce_debt_repayment_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Immutable financial history: debt repayment records cannot be updated or deleted. To correct an entry, record an explicit reversal/correction repayment transaction.';
END;
$$;

ALTER FUNCTION public.enforce_debt_repayment_immutability() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enforce_debt_repayment_immutability() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_protect_debt_repayments_mutation ON public.debt_repayments;
CREATE TRIGGER trg_protect_debt_repayments_mutation
BEFORE UPDATE OR DELETE ON public.debt_repayments
FOR EACH ROW EXECUTE FUNCTION public.enforce_debt_repayment_immutability();

-- Hardened Trigger: Validates repayment & reversal integrity before insertion
CREATE OR REPLACE FUNCTION public.validate_debt_repayment_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_orig_rep record;
  v_debt_orig numeric(12,2);
  v_curr_repaid numeric(12,2);
  v_projected_repaid numeric(12,2);
BEGIN
  IF NEW.amount_da = 0 THEN
    RAISE EXCEPTION 'Repayment amount cannot be zero.';
  END IF;

  -- 1. Standard positive repayment
  IF NEW.amount_da > 0 THEN
    IF NEW.reversal_of_id IS NOT NULL THEN
      RAISE EXCEPTION 'Positive repayment cannot specify a reversal_of_id. Only negative reversal entries may reference a prior repayment.';
    END IF;

  -- 2. Negative repayment (reversal transaction)
  ELSE
    IF NEW.reversal_of_id IS NULL THEN
      RAISE EXCEPTION 'Negative repayment must be an explicit reversal specifying reversal_of_id.';
    END IF;

    -- Fetch and lock the original repayment row
    SELECT * INTO v_orig_rep
    FROM public.debt_repayments
    WHERE id = NEW.reversal_of_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original repayment % does not exist.', NEW.reversal_of_id;
    END IF;

    -- Verify that original repayment belongs to the same debt
    IF v_orig_rep.debt_id <> NEW.debt_id THEN
      RAISE EXCEPTION 'Original repayment % belongs to debt "%", not "%".',
        NEW.reversal_of_id, v_orig_rep.debt_id, NEW.debt_id;
    END IF;

    -- Prevent reversing a reversal
    IF v_orig_rep.amount_da <= 0 OR v_orig_rep.reversal_of_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot reverse repayment %: it is already a reversal transaction.', NEW.reversal_of_id;
    END IF;

    -- Prevent reversing the same repayment more than once
    IF EXISTS (
      SELECT 1 FROM public.debt_repayments 
      WHERE reversal_of_id = NEW.reversal_of_id
    ) THEN
      RAISE EXCEPTION 'Original repayment % has already been reversed.', NEW.reversal_of_id;
    END IF;

    -- Validate reversal amount: must equal the negated original repayment amount
    IF NEW.amount_da <> -v_orig_rep.amount_da THEN
      RAISE EXCEPTION 'Reversal amount (%) must equal the negated original repayment amount (%).',
        NEW.amount_da, -v_orig_rep.amount_da;
    END IF;
  END IF;

  -- Verify debt existence and projected balance bounds
  SELECT original_amount_da INTO v_debt_orig
  FROM public.debts
  WHERE id = NEW.debt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced debt % does not exist.', NEW.debt_id;
  END IF;

  SELECT COALESCE(SUM(amount_da), 0) INTO v_curr_repaid
  FROM public.debt_repayments
  WHERE debt_id = NEW.debt_id;

  v_projected_repaid := v_curr_repaid + NEW.amount_da;

  IF v_projected_repaid < 0 THEN
    RAISE EXCEPTION 'Transaction would result in negative total repaid (%) on debt %. Operation rejected.',
      v_projected_repaid, NEW.debt_id;
  END IF;

  IF v_projected_repaid > v_debt_orig THEN
    RAISE EXCEPTION 'Total repayments (%) would exceed original debt amount (%) on debt %. Operation rejected.',
      v_projected_repaid, v_debt_orig, NEW.debt_id;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.validate_debt_repayment_entry() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_debt_repayment_entry() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_validate_debt_repayment_entry ON public.debt_repayments;
CREATE TRIGGER trg_validate_debt_repayment_entry
BEFORE INSERT ON public.debt_repayments
FOR EACH ROW EXECUTE FUNCTION public.validate_debt_repayment_entry();

-- Automatically sync debt balance when a repayment or reversal is inserted
CREATE OR REPLACE FUNCTION public.sync_debt_balance_on_repayment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_repaid numeric(12,2);
  v_target_debt_id text;
BEGIN
  v_target_debt_id := NEW.debt_id;

  SELECT COALESCE(SUM(amount_da), 0) INTO v_total_repaid
  FROM public.debt_repayments
  WHERE debt_id = v_target_debt_id;

  UPDATE public.debts
  SET amount_repaid_da = v_total_repaid,
      remaining_balance_da = original_amount_da - v_total_repaid,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_target_debt_id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_debt_balance_on_repayment() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_debt_balance_on_repayment() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_sync_debt_balance ON public.debt_repayments;
CREATE TRIGGER trg_sync_debt_balance
AFTER INSERT ON public.debt_repayments
FOR EACH ROW EXECUTE FUNCTION public.sync_debt_balance_on_repayment();

-- ----------------------------------------------------------------------------
-- 10. OPERATING EXPENSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE public.operating_expenses (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('packaging', 'transportation', 'fair_fees', 'marketing', 'software', 'supplies', 'salaries', 'other')),
  amount_da numeric(10,2) NOT NULL CHECK (amount_da >= 0),
  expense_date date DEFAULT current_date NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'baridimob', 'bank_transfer', 'other')),
  description text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 11. OPENING FINANCIAL POSITION (Single-Row Table)
-- ----------------------------------------------------------------------------
CREATE TABLE public.opening_position (
  id integer PRIMARY KEY CHECK (id = 1),
  cash_balance_da numeric(12,2) NOT NULL DEFAULT 0,
  owner_contributions_da numeric(12,2) NOT NULL DEFAULT 0,
  owner_withdrawals_da numeric(12,2) NOT NULL DEFAULT 0,
  as_of_date date DEFAULT current_date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 12. SECURED RPCs FOR ORDER LIFECYCLE & OPERATIONAL METADATA
-- ----------------------------------------------------------------------------

-- RPC 1: Update Operational Metadata (Non-lifecycle fields only)
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
SET search_path = ''
AS $$
BEGIN
  -- 1. Owner authorization
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can update order metadata.';
  END IF;

  -- 2. Validate payment status if provided
  IF p_payment_status IS NOT NULL AND p_payment_status NOT IN ('unpaid', 'paid', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status "%": must be unpaid, paid, or refunded.', p_payment_status;
  END IF;

  -- 3. Validate financial amounts if provided
  IF p_packaging_cost_da IS NOT NULL AND p_packaging_cost_da < 0 THEN
    RAISE EXCEPTION 'packaging_cost_da cannot be negative.';
  END IF;
  IF p_shipping_fee_da IS NOT NULL AND p_shipping_fee_da < 0 THEN
    RAISE EXCEPTION 'shipping_fee_da cannot be negative.';
  END IF;
  IF p_actual_shipping_cost_da IS NOT NULL AND p_actual_shipping_cost_da < 0 THEN
    RAISE EXCEPTION 'actual_shipping_cost_da cannot be negative.';
  END IF;

  -- 4. 64-bit advisory transaction lock
  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
          'gr_order_lock:' || p_order_id::text,
          0
      )
  );

  -- 5. Verify order exists
  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;

  -- 6. Upsert operational fields only; never alter fulfillment_status or return_condition
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
GRANT EXECUTE ON FUNCTION public.update_order_operational_meta(bigint, text, text, text, numeric, numeric, numeric, text, text, text) TO authenticated;

-- RPC 2: Transition Fulfillment Status to Processing or Shipped
CREATE OR REPLACE FUNCTION public.transition_order_fulfillment_status(
  p_order_id bigint,
  p_new_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_curr_status text;
  v_has_allocations boolean;
BEGIN
  -- 1. Verify owner authorization
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can transition order fulfillment status.';
  END IF;

  -- 2. Validate target status: only 'processing' or 'shipped' allowed through this RPC
  IF p_new_status IS NULL OR p_new_status NOT IN ('processing', 'shipped') THEN
    RAISE EXCEPTION 'Invalid target status "%": transition_order_fulfillment_status only permits transitions to "processing" or "shipped". Use lifecycle RPCs for reserved, delivered, cancelled, or returned.', COALESCE(p_new_status, 'NULL');
  END IF;

  -- 3. Acquire 64-bit advisory transaction lock on the order
  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
          'gr_order_lock:' || p_order_id::text,
          0
      )
  );

  -- 4. Verify order exists and lock order row
  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % does not exist.', p_order_id;
  END IF;

  -- 5. Fetch current fulfillment status
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

  -- 6. Explicit state machine validation
  IF p_new_status = 'processing' THEN
    IF v_curr_status <> 'pending' THEN
      RAISE EXCEPTION 'Cannot transition order % to "processing": current status is "%". Transition is only permitted from "pending".',
        p_order_id, v_curr_status;
    END IF;
  ELSIF p_new_status = 'shipped' THEN
    IF v_curr_status NOT IN ('pending', 'processing') THEN
      RAISE EXCEPTION 'Cannot transition order % to "shipped": current status is "%". Transition is only permitted from "pending" or "processing".',
        p_order_id, v_curr_status;
    END IF;

    -- Verify that active stock allocations exist before shipping
    SELECT EXISTS (
      SELECT 1 FROM public.order_stock_allocations
      WHERE order_id = p_order_id AND allocation_status IN ('reserved', 'confirmed')
    ) INTO v_has_allocations;

    IF NOT v_has_allocations THEN
      RAISE EXCEPTION 'Cannot ship order %: no active stock allocations exist for this order. Reserve stock before marking as shipped.', p_order_id;
    END IF;
  END IF;

  -- 7. Update order_meta
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

ALTER FUNCTION public.transition_order_fulfillment_status(bigint, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.transition_order_fulfillment_status(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_order_fulfillment_status(bigint, text, text) TO authenticated;

-- RPC 3: Reserve Order Stock FIFO (All-or-Nothing Concurrency Safe)
CREATE OR REPLACE FUNCTION public.reserve_order_stock(
  p_order_id bigint,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can reserve stock for orders.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  -- 64-bit advisory lock using hashtextextended
  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
          'gr_order_lock:' || p_order_id::text,
          0
      )
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

  -- Lock inventory rows in deterministic ascending ID order to prevent deadlocks
  PERFORM 1
  FROM public.inventory_items i
  WHERE lower(trim(i.title)) IN (SELECT norm_title FROM _reqs)
  ORDER BY i.id ASC
  FOR UPDATE;

  -- Phase 1: Pre-validation of sufficient stock for ALL requested titles
  FOR v_req IN SELECT * FROM _reqs LOOP
    SELECT COALESCE(SUM(quantity_received - quantity_sold - quantity_reserved - quantity_damaged), 0)
    INTO v_avail_total
    FROM public.inventory_items
    WHERE lower(trim(title)) = v_req.norm_title;

    IF v_avail_total < v_req.req_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT STOCK: "%" requires %, but only % is available across all inventory lots. Entire reservation rolled back.',
        v_req.display_title, v_req.req_qty, v_avail_total;
    END IF;
  END LOOP;

  -- Phase 2: Execute FIFO Reservations (OLD_STOCK first, then oldest acquisition)
  FOR v_req IN SELECT * FROM _reqs LOOP
    v_needed := v_req.req_qty;

    FOR v_lot IN
      SELECT 
        id,
        title,
        stock_group,
        (quantity_received - quantity_sold - quantity_reserved - quantity_damaged) AS avail,
        unit_purchase_cost_da
      FROM public.inventory_items
      WHERE lower(trim(title)) = v_req.norm_title
        AND (quantity_received - quantity_sold - quantity_reserved - quantity_damaged) > 0
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
      RAISE EXCEPTION 'CONCURRENCY ANOMALY: Could not reserve remaining % units of "%". Entire reservation rolled back.',
        v_needed, v_req.display_title;
    END IF;
  END LOOP;

  -- Upsert Order Metadata as pending if not already present
  INSERT INTO public.order_meta (order_id, fulfillment_status, updated_at)
  VALUES (p_order_id, 'pending', timezone('utc'::text, now()))
  ON CONFLICT (order_id) DO UPDATE
  SET updated_at = timezone('utc'::text, now());

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'allocations', v_allocations_logged);
END;
$$;

ALTER FUNCTION public.reserve_order_stock(bigint, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reserve_order_stock(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(bigint, jsonb) TO authenticated;

-- RPC 4: Confirm Order Delivery (Convert Reserved Stock to Sold)
CREATE OR REPLACE FUNCTION public.confirm_order_delivery(
  p_order_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alloc record;
  v_status text;
  v_reserved_count integer;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can confirm order delivery.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  -- 64-bit advisory lock using hashtextextended
  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
          'gr_order_lock:' || p_order_id::text,
          0
      )
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
    RAISE EXCEPTION 'Cannot confirm delivery for order %: no reserved stock allocations found. Reserve stock before delivering.', p_order_id;
  END IF;

  -- Lock all affected inventory rows deterministically in ascending ID order
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
    IF v_alloc.quantity_reserved < v_alloc.quantity THEN
      RAISE EXCEPTION 'RESERVATION CORRUPTION: Lot "%" reserved count (%) is less than order allocation (%). Operation aborted.',
        v_alloc.title, v_alloc.quantity_reserved, v_alloc.quantity;
    END IF;

    UPDATE public.inventory_items
    SET quantity_reserved = quantity_reserved - v_alloc.quantity,
        quantity_sold = quantity_sold + v_alloc.quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_alloc.inventory_item_id;

    UPDATE public.order_stock_allocations
    SET allocation_status = 'confirmed'
    WHERE id = v_alloc.id;
  END LOOP;

  UPDATE public.order_meta
  SET fulfillment_status = 'delivered',
      updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'delivered');
END;
$$;

ALTER FUNCTION public.confirm_order_delivery(bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.confirm_order_delivery(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_delivery(bigint) TO authenticated;

-- RPC 5: Cancel Order (Release Reserved Stock Back to Available Inventory)
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alloc record;
  v_status text;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can cancel orders.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  -- 64-bit advisory lock using hashtextextended
  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
          'gr_order_lock:' || p_order_id::text,
          0
      )
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

  -- Lock all affected inventory rows deterministically in ascending ID order
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
    IF v_alloc.quantity_reserved < v_alloc.quantity THEN
      RAISE EXCEPTION 'RESERVATION CORRUPTION: Lot "%" reserved count (%) is less than order allocation (%). Operation aborted.',
        v_alloc.title, v_alloc.quantity_reserved, v_alloc.quantity;
    END IF;

    UPDATE public.inventory_items
    SET quantity_reserved = quantity_reserved - v_alloc.quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_alloc.inventory_item_id;

    UPDATE public.order_stock_allocations
    SET allocation_status = 'released'
    WHERE id = v_alloc.id;
  END LOOP;

  UPDATE public.order_meta
  SET fulfillment_status = 'cancelled',
      updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'cancelled');
END;
$$;

ALTER FUNCTION public.cancel_order(bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cancel_order(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(bigint) TO authenticated;

-- RPC 6: Record Order Return (Safe Return Accounting with Exact Allocation Tracking)
CREATE OR REPLACE FUNCTION public.record_order_return(
  p_order_id bigint,
  p_items jsonb,
  p_condition text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_req record;
  v_alloc record;
  v_sold_qty integer;
  v_prev_returned integer;
  v_max_returnable integer;
  v_rem_qty integer;
  v_take_qty integer;
  v_order_total_sold integer;
  v_order_total_returned integer;
  v_new_status text;
  v_returns_logged jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Unauthorized: only the bookstore owner can record returns.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be null.';
  END IF;

  -- 64-bit advisory lock using hashtextextended
  PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
          'gr_order_lock:' || p_order_id::text,
          0
      )
  );
  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

  SELECT fulfillment_status INTO v_status
  FROM public.order_meta
  WHERE order_id = p_order_id;

  IF v_status IS NULL OR v_status NOT IN ('delivered', 'partially_returned') THEN
    RAISE EXCEPTION 'Cannot return order %: current status is "%", but must be "delivered" or "partially_returned".', p_order_id, v_status;
  END IF;

  -- Explicit check against NULL and invalid conditions
  IF p_condition IS NULL OR p_condition NOT IN ('sellable', 'damaged') THEN
    RAISE EXCEPTION 'Invalid return condition "%": must be "sellable" or "damaged", and cannot be NULL.', COALESCE(p_condition, 'NULL');
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items must be a valid, non-empty JSON array.';
  END IF;

  -- Aggregate duplicate return requests
  CREATE TEMP TABLE _return_reqs (
    norm_title text PRIMARY KEY,
    display_title text,
    req_qty integer
  ) ON COMMIT DROP;

  FOR v_req IN SELECT * FROM jsonb_to_recordset(p_items) AS x(title text, quantity numeric) LOOP
    IF v_req.title IS NULL OR trim(v_req.title) = '' THEN
      RAISE EXCEPTION 'Return item title cannot be empty.';
    END IF;

    IF v_req.quantity IS NULL OR v_req.quantity <= 0 OR v_req.quantity <> floor(v_req.quantity) THEN
      RAISE EXCEPTION 'Return quantity for "%" must be a positive integer, received %.', v_req.title, v_req.quantity;
    END IF;

    INSERT INTO _return_reqs (norm_title, display_title, req_qty)
    VALUES (lower(trim(v_req.title)), trim(v_req.title), v_req.quantity::integer)
    ON CONFLICT (norm_title) DO UPDATE
    SET req_qty = _return_reqs.req_qty + EXCLUDED.req_qty;
  END LOOP;

  -- Validate that return quantities do not exceed order-level unreturned sold quantities
  FOR v_req IN SELECT * FROM _return_reqs LOOP
    SELECT COALESCE(SUM(a.quantity), 0) INTO v_sold_qty
    FROM public.order_stock_allocations a
    JOIN public.inventory_items i ON a.inventory_item_id = i.id
    WHERE a.order_id = p_order_id AND a.allocation_status = 'confirmed' AND lower(trim(i.title)) = v_req.norm_title;

    SELECT COALESCE(SUM(quantity), 0) INTO v_prev_returned
    FROM public.order_returns
    WHERE order_id = p_order_id AND lower(trim(title)) = v_req.norm_title;

    v_max_returnable := v_sold_qty - v_prev_returned;

    IF v_req.req_qty > v_max_returnable THEN
      RAISE EXCEPTION 'Cannot return % copies of "%": order sold %, % already returned, max returnable is %.',
        v_req.req_qty, v_req.display_title, v_sold_qty, v_prev_returned, v_max_returnable;
    END IF;
  END LOOP;

  -- Deterministically lock all affected inventory lots in ascending ID order to prevent deadlocks
  PERFORM 1
  FROM public.inventory_items i
  WHERE i.id IN (
    SELECT DISTINCT a.inventory_item_id
    FROM public.order_stock_allocations a
    JOIN public.inventory_items itm ON a.inventory_item_id = itm.id
    JOIN _return_reqs r ON lower(trim(itm.title)) = r.norm_title
    WHERE a.order_id = p_order_id AND a.allocation_status = 'confirmed'
  )
  ORDER BY i.id ASC
  FOR UPDATE;

  -- Process returns against individual allocations calculating remaining returnable per allocation
  FOR v_req IN SELECT * FROM _return_reqs LOOP
    v_rem_qty := v_req.req_qty;

    FOR v_alloc IN
      SELECT 
        a.id AS allocation_id,
        a.inventory_item_id,
        a.quantity AS orig_alloc_qty,
        COALESCE(SUM(r.quantity), 0)::integer AS alloc_prev_returned,
        (a.quantity - COALESCE(SUM(r.quantity), 0))::integer AS alloc_rem_returnable,
        i.quantity_sold AS lot_sold
      FROM public.order_stock_allocations a
      JOIN public.inventory_items i ON a.inventory_item_id = i.id
      LEFT JOIN public.order_returns r ON r.allocation_id = a.id
      WHERE a.order_id = p_order_id 
        AND a.allocation_status = 'confirmed' 
        AND lower(trim(i.title)) = v_req.norm_title
      GROUP BY a.id, a.inventory_item_id, a.quantity, a.created_at, i.quantity_sold
      HAVING (a.quantity - COALESCE(SUM(r.quantity), 0)) > 0
      ORDER BY a.created_at DESC, a.id DESC
    LOOP
      EXIT WHEN v_rem_qty <= 0;

      v_take_qty := LEAST(v_rem_qty, v_alloc.alloc_rem_returnable);

      IF v_alloc.lot_sold < v_take_qty THEN
        RAISE EXCEPTION 'INVENTORY ANOMALY: Lot % sold count (%) is less than return quantity (%). Operation rejected.',
          v_alloc.inventory_item_id, v_alloc.lot_sold, v_take_qty;
      END IF;

      -- Update inventory item stock counts
      IF p_condition = 'sellable' THEN
        UPDATE public.inventory_items
        SET quantity_sold = quantity_sold - v_take_qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_alloc.inventory_item_id;
      ELSE
        UPDATE public.inventory_items
        SET quantity_sold = quantity_sold - v_take_qty,
            quantity_damaged = quantity_damaged + v_take_qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_alloc.inventory_item_id;
      END IF;

      -- Record immutable return transaction record with strictly NOT NULL foreign keys
      INSERT INTO public.order_returns (
        order_id,
        inventory_item_id,
        allocation_id,
        title,
        quantity,
        condition,
        notes
      ) VALUES (
        p_order_id,
        v_alloc.inventory_item_id,
        v_alloc.allocation_id,
        v_req.display_title,
        v_take_qty,
        p_condition,
        p_notes
      );

      v_returns_logged := v_returns_logged || jsonb_build_object(
        'allocation_id', v_alloc.allocation_id,
        'inventory_item_id', v_alloc.inventory_item_id,
        'quantity', v_take_qty,
        'condition', p_condition
      );

      v_rem_qty := v_rem_qty - v_take_qty;
    END LOOP;

    -- Strict verification: every requested return quantity must be fully processed
    IF v_rem_qty > 0 THEN
      RAISE EXCEPTION 'RETURN ANOMALY: Could not fully process return for "%". % units remained unallocated against confirmed lots. Entire return transaction aborted.',
        v_req.display_title, v_rem_qty;
    END IF;
  END LOOP;

  -- Determine final fulfillment status based on total sold vs total returned
  SELECT COALESCE(SUM(quantity), 0) INTO v_order_total_sold
  FROM public.order_stock_allocations
  WHERE order_id = p_order_id AND allocation_status = 'confirmed';

  SELECT COALESCE(SUM(quantity), 0) INTO v_order_total_returned
  FROM public.order_returns
  WHERE order_id = p_order_id;

  IF v_order_total_returned >= v_order_total_sold THEN
    v_new_status := 'returned';
  ELSE
    v_new_status := 'partially_returned';
  END IF;

  UPDATE public.order_meta
  SET fulfillment_status = v_new_status,
      return_condition = p_condition,
      notes = COALESCE(notes || E'\n', '') || COALESCE(p_notes, 'Customer return processed (' || p_condition || ')'),
      updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', v_new_status, 'returns', v_returns_logged);
END;
$$;

ALTER FUNCTION public.record_order_return(bigint, jsonb, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_order_return(bigint, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_order_return(bigint, jsonb, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 13. ENSURE SECURITY DEFINER RPC PRIVILEGES FOR DATABASE OWNER
-- ----------------------------------------------------------------------------
GRANT ALL ON TABLE public.suppliers TO postgres;
GRANT ALL ON TABLE public.purchase_batches TO postgres;
GRANT ALL ON TABLE public.inventory_items TO postgres;
GRANT ALL ON TABLE public.order_meta TO postgres;
GRANT ALL ON TABLE public.order_stock_allocations TO postgres;
GRANT ALL ON TABLE public.order_returns TO postgres;
GRANT ALL ON TABLE public.debts TO postgres;
GRANT ALL ON TABLE public.debt_repayments TO postgres;
GRANT ALL ON TABLE public.operating_expenses TO postgres;
GRANT ALL ON TABLE public.opening_position TO postgres;

-- ----------------------------------------------------------------------------
-- 14. ROW-LEVEL SECURITY & DATABASE-ENFORCED ACCESS PERMISSIONS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  standard_tables text[] := ARRAY[
    'suppliers',
    'purchase_batches',
    'inventory_items',
    'operating_expenses',
    'opening_position'
  ];
BEGIN
  -- 1. Standard operational tables: Full owner access (excluding TRUNCATE to protect RLS)
  FOREACH t IN ARRAY standard_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, PUBLIC;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owner full access on %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Owner full access on %I" ON public.%I FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());', t, t);
  END LOOP;

  -- 2. order_meta: Direct Client Access is strictly SELECT ONLY.
  -- Direct INSERT, UPDATE, DELETE are REVOKED from authenticated clients.
  -- Operational fields are updated via update_order_operational_meta RPC.
  -- Fulfillment status is transitioned exclusively via authorized lifecycle RPCs.
  ALTER TABLE public.order_meta ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.order_meta FROM anon, PUBLIC, authenticated;
  GRANT SELECT ON TABLE public.order_meta TO authenticated;
  DROP POLICY IF EXISTS "Owner select on order_meta" ON public.order_meta;
  CREATE POLICY "Owner select on order_meta" ON public.order_meta FOR SELECT TO authenticated USING (public.is_owner());

  -- 3. order_returns: Direct Access is SELECT ONLY (All writes MUST go through record_order_return RPC)
  ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.order_returns FROM anon, PUBLIC, authenticated;
  GRANT SELECT ON TABLE public.order_returns TO authenticated;
  DROP POLICY IF EXISTS "Owner select on order_returns" ON public.order_returns;
  CREATE POLICY "Owner select on order_returns" ON public.order_returns FOR SELECT TO authenticated USING (public.is_owner());

  -- 4. order_stock_allocations: Direct Access is SELECT ONLY (All writes MUST go through lifecycle RPCs)
  ALTER TABLE public.order_stock_allocations ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.order_stock_allocations FROM anon, PUBLIC, authenticated;
  GRANT SELECT ON TABLE public.order_stock_allocations TO authenticated;
  DROP POLICY IF EXISTS "Owner select on order_stock_allocations" ON public.order_stock_allocations;
  CREATE POLICY "Owner select on order_stock_allocations" ON public.order_stock_allocations FOR SELECT TO authenticated USING (public.is_owner());

  -- 5. debts: Column-level permissions prevent manual tampering with derived balances.
  -- amount_repaid_da and remaining_balance_da cannot be inserted or updated by authenticated clients.
  ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.debts FROM anon, PUBLIC, authenticated;
  GRANT SELECT ON TABLE public.debts TO authenticated;
  GRANT INSERT (id, creditor_name, debt_type, original_amount_da, incurred_date, due_date, notes) ON TABLE public.debts TO authenticated;
  GRANT UPDATE (creditor_name, debt_type, original_amount_da, incurred_date, due_date, notes) ON TABLE public.debts TO authenticated;
  GRANT DELETE ON TABLE public.debts TO authenticated;
  DROP POLICY IF EXISTS "Owner full access on debts" ON public.debts;
  CREATE POLICY "Owner full access on debts" ON public.debts FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

  -- 6. debt_repayments: Direct Access is SELECT & INSERT ONLY (UPDATE/DELETE strictly blocked, corrections via reversal inserts)
  ALTER TABLE public.debt_repayments ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.debt_repayments FROM anon, PUBLIC, authenticated;
  GRANT SELECT, INSERT ON TABLE public.debt_repayments TO authenticated;
  DROP POLICY IF EXISTS "Owner select on debt_repayments" ON public.debt_repayments;
  CREATE POLICY "Owner select on debt_repayments" ON public.debt_repayments FOR SELECT TO authenticated USING (public.is_owner());
  DROP POLICY IF EXISTS "Owner insert on debt_repayments" ON public.debt_repayments;
  CREATE POLICY "Owner insert on debt_repayments" ON public.debt_repayments FOR INSERT TO authenticated WITH CHECK (public.is_owner());
END $$;

COMMIT;
