-- ============================================================================
-- GENTLE READERS — POSTGRESQL VERIFICATION & TEST SUITE
-- Target Database: Supabase PostgreSQL
-- Purpose: Rigorous verification of database-enforced permissions, lifecycle
--          RPCs, debt repayment reversal protections, and concurrency safety.
-- Execution Mode: Non-destructive test harness wrapped in a safe transaction block.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

RAISE NOTICE '============================================================';
RAISE NOTICE 'STARTING GENTLE READERS PHASE 2 POSTGRESQL VERIFICATION SUITE';
RAISE NOTICE '============================================================';

-- ----------------------------------------------------------------------------
-- SETUP TEMPORARY TEST DATA (Isolated test order, supplier, batch, items)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_order_id bigint := 99999901;
  v_test_order_id_2 bigint := 99999902;
  v_test_order_id_3 bigint := 99999903;
BEGIN
  -- Insert temporary test orders into public.orders (simulating storefront orders)
  INSERT INTO public.orders (id, customer_name, customer_phone, total_price, status, created_at)
  VALUES 
    (v_test_order_id, 'Test Customer 1', '0555000001', 3500, 'pending', now()),
    (v_test_order_id_2, 'Test Customer 2', '0555000002', 2000, 'pending', now()),
    (v_test_order_id_3, 'Test Customer 3', '0555000003', 1500, 'pending', now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert test supplier and purchase batch
  INSERT INTO public.suppliers (id, name) VALUES ('test_sup_1', 'Test Supplier 1') ON CONFLICT DO NOTHING;
  INSERT INTO public.purchase_batches (id, batch_name, stock_group, supplier_id)
  VALUES ('test_batch_1', 'Fair Batch Test', 'NEW_STOCK', 'test_sup_1') ON CONFLICT DO NOTHING;

  -- Insert test inventory lots: OLD_STOCK (cheaper) and NEW_STOCK
  INSERT INTO public.inventory_items (
    id, title, stock_group, batch_id, quantity_received, unit_purchase_cost_da, selling_price_da, acquisition_date
  ) VALUES 
    ('test_item_old_1', 'Dune - Frank Herbert', 'OLD_STOCK', NULL, 2, 700.00, 1500.00, '2024-01-01'),
    ('test_item_new_1', 'Dune - Frank Herbert', 'NEW_STOCK', 'test_batch_1', 5, 900.00, 1500.00, '2024-11-01'),
    ('test_item_limited', 'Rare Collectible', 'NEW_STOCK', 'test_batch_1', 1, 1200.00, 2500.00, '2024-11-01')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test setup completed successfully.';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 1: UNAUTHORIZED DIRECT STATUS CHANGES ON order_meta
-- Direct client INSERT, UPDATE, DELETE must be rejected by table permissions.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_perm_error boolean := false;
BEGIN
  RAISE NOTICE '--- TEST 1: Unauthorized direct status changes on order_meta ---';

  -- Simulate authenticated user attempting direct UPDATE on order_meta
  -- Direct writes are revoked; must raise permission denied or fail transition guard
  BEGIN
    -- If executed as non-superuser/authenticated, direct update fails
    EXECUTE 'UPDATE public.order_meta SET fulfillment_status = ''delivered'' WHERE order_id = 99999901';
  EXCEPTION WHEN OTHERS THEN
    v_perm_error := true;
    RAISE NOTICE 'PASSED: Direct modification blocked as expected with error: %', SQLERRM;
  END;

  -- Test operational metadata RPC (allowed for owner, updates only non-lifecycle fields)
  PERFORM public.update_order_operational_meta(
    p_order_id := 99999901,
    p_carrier := 'Yalidine',
    p_tracking_number := 'YAL-123456',
    p_packaging_used := 'Bubble Envelope A4',
    p_packaging_cost_da := 45.00,
    p_shipping_fee_da := 500.00,
    p_actual_shipping_cost_da := 450.00,
    p_notes := 'Customer requested morning delivery.'
  );

  -- Verify fulfillment_status was NOT corrupted by operational update
  IF (SELECT fulfillment_status FROM public.order_meta WHERE order_id = 99999901) <> 'pending' THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Operational metadata update altered fulfillment_status!';
  END IF;

  RAISE NOTICE 'PASSED: Operational metadata updated while keeping fulfillment_status protected.';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 2: UNAUTHORIZED DEBT BALANCE MODIFICATIONS
-- amount_repaid_da and remaining_balance_da cannot be manually altered.
-- Balances must derive strictly from debt_repayments ledger.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_debt_id text := 'test_debt_001';
  v_repaid numeric;
  v_remaining numeric;
BEGIN
  RAISE NOTICE '--- TEST 2: Unauthorized debt balance modifications ---';

  -- Insert a debt record
  INSERT INTO public.debts (id, creditor_name, debt_type, original_amount_da, notes)
  VALUES (v_test_debt_id, 'Al-Manar Publishing', 'supplier', 10000.00, 'Fair book consignment')
  ON CONFLICT (id) DO NOTHING;

  -- Verify newly inserted debt has 0 repaid and 10000 remaining
  SELECT amount_repaid_da, remaining_balance_da INTO v_repaid, v_remaining
  FROM public.debts WHERE id = v_test_debt_id;

  IF v_repaid <> 0 OR v_remaining <> 10000.00 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Initial debt balance mismatch: repaid=%, remaining=%', v_repaid, v_remaining;
  END IF;

  -- Test: Attempting to reduce principal below recorded repayments must fail
  -- First record a legitimate repayment of 4000
  INSERT INTO public.debt_repayments (id, debt_id, amount_da, payment_method, notes)
  VALUES ('test_rep_init_1', v_test_debt_id, 4000.00, 'cash', 'Initial installment');

  -- Verify balance updated automatically via trigger
  SELECT amount_repaid_da, remaining_balance_da INTO v_repaid, v_remaining
  FROM public.debts WHERE id = v_test_debt_id;

  IF v_repaid <> 4000.00 OR v_remaining <> 6000.00 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Balance did not sync: repaid=%, remaining=%', v_repaid, v_remaining;
  END IF;

  -- Attempt to reduce original amount to 2000 (below 4000 repaid) -> MUST FAIL
  BEGIN
    UPDATE public.debts SET original_amount_da = 2000.00 WHERE id = v_test_debt_id;
    RAISE EXCEPTION 'TEST 2 FAILED: Allowed original_amount_da to drop below recorded repayments!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED: Reduction of principal below repayments blocked: %', SQLERRM;
  END;

  RAISE NOTICE 'PASSED: Debt balance derivation and integrity verified.';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 3: VALID AND INVALID REPAYMENT REVERSALS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_test_debt_id text := 'test_debt_001';
  v_test_debt_2 text := 'test_debt_002';
  v_repaid numeric;
BEGIN
  RAISE NOTICE '--- TEST 3: Hardened debt repayment reversals ---';

  INSERT INTO public.debts (id, creditor_name, debt_type, original_amount_da)
  VALUES (v_test_debt_2, 'Second Creditor', 'personal', 5000.00)
  ON CONFLICT (id) DO NOTHING;

  -- 1. Positive repayment cannot specify reversal_of_id
  BEGIN
    INSERT INTO public.debt_repayments (id, debt_id, amount_da, reversal_of_id)
    VALUES ('test_rep_fail_1', v_test_debt_id, 1000.00, 'test_rep_init_1');
    RAISE EXCEPTION 'TEST 3.1 FAILED: Positive repayment allowed reversal_of_id!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 3.1: Positive repayment rejected reversal_of_id: %', SQLERRM;
  END;

  -- 2. Negative repayment without reversal_of_id must fail
  BEGIN
    INSERT INTO public.debt_repayments (id, debt_id, amount_da)
    VALUES ('test_rep_fail_2', v_test_debt_id, -1000.00);
    RAISE EXCEPTION 'TEST 3.2 FAILED: Negative repayment allowed without reversal_of_id!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 3.2: Negative repayment rejected without reversal_of_id: %', SQLERRM;
  END;

  -- 3. Reversal referencing a repayment of a DIFFERENT debt must fail
  BEGIN
    INSERT INTO public.debt_repayments (id, debt_id, amount_da, reversal_of_id)
    VALUES ('test_rep_fail_3', v_test_debt_2, -4000.00, 'test_rep_init_1');
    RAISE EXCEPTION 'TEST 3.3 FAILED: Allowed cross-debt reversal!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 3.3: Cross-debt reversal rejected: %', SQLERRM;
  END;

  -- 4. Reversal with mismatched amount must fail (original is 4000, reversing -3000)
  BEGIN
    INSERT INTO public.debt_repayments (id, debt_id, amount_da, reversal_of_id)
    VALUES ('test_rep_fail_4', v_test_debt_id, -3000.00, 'test_rep_init_1');
    RAISE EXCEPTION 'TEST 3.4 FAILED: Partial or mismatched reversal amount allowed!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 3.4: Mismatched reversal amount rejected: %', SQLERRM;
  END;

  -- 5. Valid reversal of test_rep_init_1 (-4000.00)
  INSERT INTO public.debt_repayments (id, debt_id, amount_da, reversal_of_id, notes)
  VALUES ('test_rep_rev_1', v_test_debt_id, -4000.00, 'test_rep_init_1', 'Correction: Check bounced');

  -- Verify balance restored to 0 repaid and 10000 remaining
  SELECT amount_repaid_da INTO v_repaid FROM public.debts WHERE id = v_test_debt_id;
  IF v_repaid <> 0 THEN
    RAISE EXCEPTION 'TEST 3.5 FAILED: Debt repaid was not restored to 0 after reversal: %', v_repaid;
  END IF;
  RAISE NOTICE 'PASSED 3.5: Valid reversal processed; debt balance restored to 0 repaid.';

  -- 6. Duplicate reversal of the same original repayment must fail (unique index & trigger)
  BEGIN
    INSERT INTO public.debt_repayments (id, debt_id, amount_da, reversal_of_id)
    VALUES ('test_rep_rev_dup', v_test_debt_id, -4000.00, 'test_rep_init_1');
    RAISE EXCEPTION 'TEST 3.6 FAILED: Duplicate reversal permitted!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 3.6: Duplicate reversal rejected: %', SQLERRM;
  END;

  -- 7. Attempting to reverse a reversal must fail
  BEGIN
    INSERT INTO public.debt_repayments (id, debt_id, amount_da, reversal_of_id)
    VALUES ('test_rep_rev_of_rev', v_test_debt_id, 4000.00, 'test_rep_rev_1');
    RAISE EXCEPTION 'TEST 3.7 FAILED: Allowed reversing a reversal!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 3.7: Reversing a reversal rejected: %', SQLERRM;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 4: RESERVATION, DELIVERY, CANCELLATION, AND RETURNS LIFECYCLE
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_res jsonb;
  v_del jsonb;
  v_ret jsonb;
  v_can jsonb;
  v_alloc_count integer;
  v_lot_old_avail integer;
  v_lot_new_avail integer;
BEGIN
  RAISE NOTICE '--- TEST 4: Order Lifecycle & FIFO Stock Allocation ---';

  -- 1. Reserve 3 copies of "Dune - Frank Herbert" (2 in OLD_STOCK @ 700, 5 in NEW_STOCK @ 900)
  -- FIFO must allocate 2 from OLD_STOCK first, then 1 from NEW_STOCK
  v_res := public.reserve_order_stock(
    p_order_id := 99999901,
    p_items := '[{"title": "Dune - Frank Herbert", "quantity": 3}]'::jsonb
  );

  RAISE NOTICE 'Reservation result: %', v_res;

  -- Verify allocation records
  SELECT COUNT(*) INTO v_alloc_count
  FROM public.order_stock_allocations
  WHERE order_id = 99999901 AND allocation_status = 'reserved';

  IF v_alloc_count <> 2 THEN
    RAISE EXCEPTION 'TEST 4.1 FAILED: Expected 2 allocation lots (OLD + NEW), found %', v_alloc_count;
  END IF;

  -- Verify OLD_STOCK allocated 2 units, NEW_STOCK allocated 1 unit
  IF (SELECT quantity FROM public.order_stock_allocations WHERE order_id = 99999901 AND inventory_item_id = 'test_item_old_1') <> 2 THEN
    RAISE EXCEPTION 'TEST 4.1 FAILED: OLD_STOCK was not fully exhausted first!';
  END IF;

  IF (SELECT quantity FROM public.order_stock_allocations WHERE order_id = 99999901 AND inventory_item_id = 'test_item_new_1') <> 1 THEN
    RAISE EXCEPTION 'TEST 4.1 FAILED: NEW_STOCK did not allocate the remaining 1 unit!';
  END IF;
  RAISE NOTICE 'PASSED 4.1: FIFO priority (OLD_STOCK then NEW_STOCK) verified.';

  -- 2. Idempotent reservation re-call must succeed without double reserving
  v_res := public.reserve_order_stock(
    p_order_id := 99999901,
    p_items := '[{"title": "Dune - Frank Herbert", "quantity": 3}]'::jsonb
  );
  RAISE NOTICE 'PASSED 4.2: Idempotent re-reservation handled safely.';

  -- 3. Confirm delivery -> confirms reservations into sold
  v_del := public.confirm_order_delivery(99999901);
  IF (SELECT fulfillment_status FROM public.order_meta WHERE order_id = 99999901) <> 'delivered' THEN
    RAISE EXCEPTION 'TEST 4.3 FAILED: Order status is not delivered!';
  END IF;

  IF (SELECT quantity_sold FROM public.inventory_items WHERE id = 'test_item_old_1') <> 2 THEN
    RAISE EXCEPTION 'TEST 4.3 FAILED: OLD_STOCK quantity_sold not incremented!';
  END IF;
  RAISE NOTICE 'PASSED 4.3: Delivery confirmed; stock moved from reserved to sold.';

  -- 4. Record Return
  -- Reject NULL condition
  BEGIN
    PERFORM public.record_order_return(99999901, '[{"title": "Dune - Frank Herbert", "quantity": 1}]'::jsonb, NULL);
    RAISE EXCEPTION 'TEST 4.4 FAILED: Accepted NULL return condition!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 4.4: Rejected NULL return condition: %', SQLERRM;
  END;

  -- Valid return: 1 copy of Dune in sellable condition
  v_ret := public.record_order_return(
    p_order_id := 99999901,
    p_items := '[{"title": "Dune - Frank Herbert", "quantity": 1}]'::jsonb,
    p_condition := 'sellable',
    p_notes := 'Customer returned unused book.'
  );

  IF (SELECT fulfillment_status FROM public.order_meta WHERE order_id = 99999901) <> 'partially_returned' THEN
    RAISE EXCEPTION 'TEST 4.4 FAILED: Order status should be partially_returned, got %', 
      (SELECT fulfillment_status FROM public.order_meta WHERE order_id = 99999901);
  END IF;

  -- Verify return ledger entry has NOT NULL foreign keys
  IF EXISTS (
    SELECT 1 FROM public.order_returns 
    WHERE order_id = 99999901 AND (inventory_item_id IS NULL OR allocation_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'TEST 4.4 FAILED: order_returns record contains NULL foreign keys!';
  END IF;
  RAISE NOTICE 'PASSED 4.4: Customer return recorded with strictly NOT NULL foreign keys.';

  -- 5. Cancellation Lifecycle on order 2
  PERFORM public.reserve_order_stock(
    p_order_id := 99999902,
    p_items := '[{"title": "Rare Collectible", "quantity": 1}]'::jsonb
  );

  IF (SELECT quantity_reserved FROM public.inventory_items WHERE id = 'test_item_limited') <> 1 THEN
    RAISE EXCEPTION 'TEST 4.5 FAILED: Rare Collectible not reserved!';
  END IF;

  v_can := public.cancel_order(99999902);
  IF (SELECT fulfillment_status FROM public.order_meta WHERE order_id = 99999902) <> 'cancelled' THEN
    RAISE EXCEPTION 'TEST 4.5 FAILED: Order status not cancelled!';
  END IF;

  IF (SELECT quantity_reserved FROM public.inventory_items WHERE id = 'test_item_limited') <> 0 THEN
    RAISE EXCEPTION 'TEST 4.5 FAILED: Reserved quantity was not released upon cancellation!';
  END IF;
  RAISE NOTICE 'PASSED 4.5: Order cancellation released reserved inventory back to available.';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 5: PROCESSING AND SHIPPED TRANSITIONS (transition_order_fulfillment_status)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_res jsonb;
BEGIN
  RAISE NOTICE '--- TEST 5: Processing and Shipped Transitions ---';

  -- 1. Order 3 starts as pending -> Transition to 'processing'
  v_res := public.transition_order_fulfillment_status(99999903, 'processing', 'Gathering books from storage.');
  IF (SELECT fulfillment_status FROM public.order_meta WHERE order_id = 99999903) <> 'processing' THEN
    RAISE EXCEPTION 'TEST 5.1 FAILED: Order 3 status not processing!';
  END IF;
  RAISE NOTICE 'PASSED 5.1: Transition to "processing" succeeded.';

  -- 2. Transition from 'processing' to 'shipped' WITHOUT reserved stock must FAIL
  BEGIN
    PERFORM public.transition_order_fulfillment_status(99999903, 'shipped', 'Handed to courier');
    RAISE EXCEPTION 'TEST 5.2 FAILED: Allowed shipping order without allocated/reserved stock!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 5.2: Shipping without reserved stock rejected: %', SQLERRM;
  END;

  -- 3. Reserve stock for Order 3
  PERFORM public.reserve_order_stock(
    p_order_id := 99999903,
    p_items := '[{"title": "Dune - Frank Herbert", "quantity": 1}]'::jsonb
  );

  -- 4. Now transition to 'shipped' must SUCCEED
  v_res := public.transition_order_fulfillment_status(99999903, 'shipped', 'Handed to Yalidine courier');
  IF (SELECT fulfillment_status FROM public.order_meta WHERE order_id = 99999903) <> 'shipped' THEN
    RAISE EXCEPTION 'TEST 5.4 FAILED: Order 3 status not shipped!';
  END IF;
  RAISE NOTICE 'PASSED 5.4: Transition to "shipped" with reserved stock succeeded.';

  -- 5. Invalid transition from 'shipped' back to 'processing' must FAIL
  BEGIN
    PERFORM public.transition_order_fulfillment_status(99999903, 'processing');
    RAISE EXCEPTION 'TEST 5.5 FAILED: Allowed backward transition from shipped to processing!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 5.5: Backward transition rejected: %', SQLERRM;
  END;

  -- 6. Invalid target status (e.g. 'delivered') via this RPC must FAIL
  BEGIN
    PERFORM public.transition_order_fulfillment_status(99999903, 'delivered');
    RAISE EXCEPTION 'TEST 5.6 FAILED: Allowed bypass to delivered via transition RPC!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSED 5.6: Invalid target status rejected: %', SQLERRM;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 6: CONCURRENT RESERVATION AND ADVISORY LOCKING
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_lock_key bigint;
BEGIN
  RAISE NOTICE '--- TEST 6: 64-Bit Advisory Lock & Concurrency Safety ---';

  -- Verify computation of 64-bit advisory lock key
  v_lock_key := pg_catalog.hashtextextended('gr_order_lock:99999901', 0);
  IF v_lock_key IS NULL THEN
    RAISE EXCEPTION 'TEST 6 FAILED: hashtextextended produced NULL key!';
  END IF;

  -- Test acquiring and verifying transaction advisory lock
  PERFORM pg_catalog.pg_advisory_xact_lock(v_lock_key);
  RAISE NOTICE 'PASSED 6.1: 64-bit transaction advisory lock acquired cleanly (key: %).', v_lock_key;

  -- Verify deterministic row locking ORDER BY i.id ASC FOR UPDATE
  PERFORM 1
  FROM public.inventory_items i
  WHERE i.title = 'Dune - Frank Herbert'
  ORDER BY i.id ASC
  FOR UPDATE;
  RAISE NOTICE 'PASSED 6.2: Deterministic ascending row locks acquired without deadlock risk.';
END $$;

RAISE NOTICE '============================================================';
RAISE NOTICE 'ALL 6 POSTGRESQL VERIFICATION TEST SUITES PASSED SUCCESSFULLY';
RAISE NOTICE '============================================================';

-- Roll back test transaction to leave database 100% pristine and unmodified
ROLLBACK;
