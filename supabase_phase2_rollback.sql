-- ============================================================================
-- GENTLE READERS — PHASE 2 CLEAN ROLLBACK SCRIPT (CORRECTED & HARDENED)
-- Target Database: Supabase PostgreSQL
-- Scope: Removes Phase 2 management tables, triggers, and RPCs
-- Non-Destructive: ZERO modification to public.orders, profiles, or checkout
--
-- IMPORTANT DATA RETENTION NOTICE:
-- Executing this rollback permanently and irrecoverably drops all Phase 2
-- management data (inventory items, batches, suppliers, debts, repayments,
-- expenses, opening position, stock allocations, order metadata, returns).
-- It does NOT restore previously imported records. Ensure you have exported
-- an offline JSON backup or database snapshot before running this rollback.
-- Customer orders in public.orders and storefront tables remain 100% untouched.
-- ============================================================================

BEGIN;

-- 1. DROP PROTECTION & BUSINESS LOGIC TRIGGERS
DROP TRIGGER IF EXISTS trg_set_order_meta_updated_at ON public.order_meta;
DROP TRIGGER IF EXISTS trg_enforce_allocation_immutability ON public.order_stock_allocations;
DROP TRIGGER IF EXISTS trg_protect_order_returns ON public.order_returns;
DROP TRIGGER IF EXISTS trg_enforce_debt_balance_integrity ON public.debts;
DROP TRIGGER IF EXISTS trg_validate_debt_repayment_entry ON public.debt_repayments;
DROP TRIGGER IF EXISTS trg_protect_debt_repayments_mutation ON public.debt_repayments;
DROP TRIGGER IF EXISTS trg_sync_debt_balance ON public.debt_repayments;

-- 2. DROP TRIGGER & RPC FUNCTIONS (In reverse dependency order)
DROP FUNCTION IF EXISTS public.record_order_return(bigint, jsonb, text, text);
DROP FUNCTION IF EXISTS public.cancel_order(bigint);
DROP FUNCTION IF EXISTS public.confirm_order_delivery(bigint);
DROP FUNCTION IF EXISTS public.reserve_order_stock(bigint, jsonb);
DROP FUNCTION IF EXISTS public.transition_order_fulfillment_status(bigint, text, text);
DROP FUNCTION IF EXISTS public.update_order_operational_meta(bigint, text, text, text, numeric, numeric, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.sync_debt_balance_on_repayment();
DROP FUNCTION IF EXISTS public.validate_debt_repayment_entry();
DROP FUNCTION IF EXISTS public.enforce_debt_repayment_immutability();
DROP FUNCTION IF EXISTS public.enforce_debt_balance_integrity();
DROP FUNCTION IF EXISTS public.prevent_immutable_return_mutation();
DROP FUNCTION IF EXISTS public.enforce_stock_allocation_immutability();
DROP FUNCTION IF EXISTS public.set_order_meta_updated_at();

-- 3. DROP MANAGEMENT TABLES (In strict reverse-dependency order using RESTRICT)
DROP TABLE IF EXISTS public.order_returns RESTRICT;
DROP TABLE IF EXISTS public.order_stock_allocations RESTRICT;
DROP TABLE IF EXISTS public.order_meta RESTRICT;
DROP TABLE IF EXISTS public.inventory_items RESTRICT;
DROP TABLE IF EXISTS public.purchase_batches RESTRICT;
DROP TABLE IF EXISTS public.suppliers RESTRICT;
DROP TABLE IF EXISTS public.debt_repayments RESTRICT;
DROP TABLE IF EXISTS public.debts RESTRICT;
DROP TABLE IF EXISTS public.operating_expenses RESTRICT;
DROP TABLE IF EXISTS public.opening_position RESTRICT;

-- 4. DROP OWNER SECURITY DEFINER FUNCTION
DROP FUNCTION IF EXISTS public.is_owner() RESTRICT;

COMMIT;
