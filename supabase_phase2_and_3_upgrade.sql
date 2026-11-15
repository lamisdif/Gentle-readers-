-- ============================================================================
-- GENTLE READERS — PHASE 2 & 3 PRODUCTION DATABASE MIGRATION
-- Atomic Transactional Checkout, FIFO Stock Reservation, Push Notifications
-- Compatible with all 139 historical orders | Non-destructive
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SERVER-SIDE TITLE NORMALIZATION HELPER
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. DEDICATED PUSH SUBSCRIPTIONS TABLE (Phase 3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamptz DEFAULT clock_timestamp(),
    last_active_at timestamptz DEFAULT clock_timestamp()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'push_subscriptions' 
      AND policyname = 'owner_push_subscriptions_all'
  ) THEN
    CREATE POLICY owner_push_subscriptions_all ON public.push_subscriptions
      FOR ALL TO authenticated
      USING (public.is_owner())
      WITH CHECK (public.is_owner());
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. ATOMIC STOREFRONT TRANSACTIONAL CHECKOUT RPC
-- Creates order & reserves inventory in the EXACT SAME PostgreSQL transaction
-- Validates prices and inventory server-side | Enforces strict FIFO
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_storefront_order(
    p_first_name text,
    p_family_name text,
    p_phone_number text,
    p_delivery_method text,
    p_wilaya text,
    p_daira text,
    p_address text,
    p_desk text,
    p_instagram_username text,
    p_shipping_price numeric,
    p_packaging_type text,
    p_packaging_price numeric,
    p_total_price numeric,
    p_legacy_items jsonb,
    p_requested_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order_id bigint;
    v_item record;
    v_lot record;
    v_norm_title text;
    v_matches_count integer;
    v_avail_total integer;
    v_needed integer;
    v_alloc integer;
    v_expected_items_total numeric(12,2) := 0;
    v_catalog_unit_price numeric(10,2);
    v_pkg_lot record;
    v_packaging_cogs numeric(10,2) := 0;
BEGIN
    -- 1. Validate mandatory fields
    IF trim(coalesce(p_phone_number, '')) = '' THEN
        RAISE EXCEPTION 'CHECKOUT_VALIDATION_ERROR: Phone number is required.';
    END IF;
    IF p_requested_items IS NULL OR jsonb_array_length(p_requested_items) = 0 THEN
        RAISE EXCEPTION 'CHECKOUT_VALIDATION_ERROR: Order must contain at least one item.';
    END IF;

    -- 2. Lock inventory deterministically by ID to avoid deadlocks
    PERFORM 1
    FROM public.inventory_items
    ORDER BY id ASC
    FOR UPDATE;

    -- 3. Server-side validation of products, availability, and prices
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_requested_items) AS x(title text, quantity integer, type text)
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'CHECKOUT_VALIDATION_ERROR: Invalid quantity % for product "%".', v_item.quantity, v_item.title;
        END IF;

        v_norm_title := public.normalize_book_title(v_item.title);

        -- Check for existence and ambiguity in catalog
        SELECT COUNT(DISTINCT normalized_title) INTO v_matches_count
        FROM public.inventory_items
        WHERE normalized_title = v_norm_title
           OR (normalized_title LIKE '%' || v_norm_title || '%' AND v_norm_title <> '');

        IF v_matches_count = 0 THEN
            RAISE EXCEPTION 'ITEM_NOT_FOUND: Product "%" was not found in active inventory.', v_item.title;
        ELSIF v_matches_count > 1 THEN
            RAISE EXCEPTION 'AMBIGUOUS_ITEM_MATCH: Multiple products match "%". Contact bookstore administrator.', v_item.title;
        END IF;

        -- Check total available physical stock
        SELECT coalesce(SUM(quantity_received - quantity_sold - quantity_reserved), 0)
        INTO v_avail_total
        FROM public.inventory_items
        WHERE normalized_title = v_norm_title;

        IF v_avail_total < v_item.quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product "%" has only % copies available, but % were requested.',
                v_item.title, v_avail_total, v_item.quantity;
        END IF;

        -- Fetch official catalog selling price from active lot
        SELECT unit_price_da INTO v_catalog_unit_price
        FROM public.inventory_items
        WHERE normalized_title = v_norm_title
        ORDER BY batch_id ASC, id ASC
        LIMIT 1;

        v_expected_items_total := v_expected_items_total + (coalesce(v_catalog_unit_price, 0) * v_item.quantity);
    END LOOP;

    -- 4. Server-side price integrity check (prevents client price tampering)
    IF p_total_price < (v_expected_items_total + coalesce(p_shipping_price, 0) + coalesce(p_packaging_price, 0) - 1.0) THEN
        RAISE EXCEPTION 'PRICE_MISMATCH: Order total (%) does not match server-verified price (%).',
            p_total_price, (v_expected_items_total + coalesce(p_shipping_price, 0) + coalesce(p_packaging_price, 0));
    END IF;

    -- 5. Insert order into public.orders
    INSERT INTO public.orders (
        "firstName", "familyName", "phoneNumber", "deliveryMethod",
        wilaya, daira, address, desk, "instagramUsername",
        shipping_price, packaging_type, packaging_price, total_price,
        items
    ) VALUES (
        p_first_name, p_family_name, p_phone_number, p_delivery_method,
        p_wilaya, p_daira, p_address, p_desk, p_instagram_username,
        p_shipping_price, p_packaging_type, p_packaging_price, p_total_price,
        p_legacy_items
    )
    RETURNING id INTO v_order_id;

    -- 6. Allocate stock per lot using strict FIFO (Old Stock / lowest batch_id first)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_requested_items) AS x(title text, quantity integer, type text)
    LOOP
        v_norm_title := public.normalize_book_title(v_item.title);
        v_needed := v_item.quantity;

        FOR v_lot IN
            SELECT id, batch_id, unit_cost_da, (quantity_received - quantity_sold - quantity_reserved) AS avail
            FROM public.inventory_items
            WHERE normalized_title = v_norm_title
              AND (quantity_received - quantity_sold - quantity_reserved) > 0
            ORDER BY batch_id ASC, id ASC
        LOOP
            EXIT WHEN v_needed = 0;

            v_alloc := LEAST(v_needed, v_lot.avail);

            UPDATE public.inventory_items
            SET quantity_reserved = quantity_reserved + v_alloc,
                updated_at = clock_timestamp()
            WHERE id = v_lot.id;

            INSERT INTO public.order_stock_allocations (
                order_id, inventory_item_id, quantity, unit_cost_da, allocation_status
            ) VALUES (
                v_order_id, v_lot.id, v_alloc, v_lot.unit_cost_da, 'reserved'
            );

            v_needed := v_needed - v_alloc;
        END LOOP;
    END LOOP;

    -- 7. Packaging material tracking (if customized packaging is used)
    IF p_packaging_type IS NOT NULL AND p_packaging_type <> '' AND lower(p_packaging_type) <> 'standard' THEN
        SELECT id, unit_cost_da INTO v_pkg_lot
        FROM public.inventory_items
        WHERE category = 'packaging'
          AND (normalized_title LIKE '%' || public.normalize_book_title(p_packaging_type) || '%'
               OR title ILIKE '%' || p_packaging_type || '%')
          AND (quantity_received - quantity_sold - quantity_reserved) > 0
        ORDER BY id ASC
        LIMIT 1;

        IF FOUND THEN
            v_packaging_cogs := v_pkg_lot.unit_cost_da;
            UPDATE public.inventory_items
            SET quantity_reserved = quantity_reserved + 1,
                updated_at = clock_timestamp()
            WHERE id = v_pkg_lot.id;

            INSERT INTO public.order_stock_allocations (
                order_id, inventory_item_id, quantity, unit_cost_da, allocation_status
            ) VALUES (
                v_order_id, v_pkg_lot.id, 1, v_pkg_lot.unit_cost_da, 'reserved'
            );
        END IF;
    END IF;

    -- 8. Create order metadata
    INSERT INTO public.order_meta (
        order_id, fulfillment_status, payment_status,
        packaging_used, packaging_cost_da, shipping_fee_da
    ) VALUES (
        v_order_id, 'pending', 'unpaid',
        p_packaging_type, v_packaging_cogs, p_shipping_price
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'status', 'reserved',
        'message', 'Order created and stock atomically reserved via FIFO.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_storefront_order TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. HARDENED IDEMPOTENT ORDER DELIVERY CONFIRMATION RPC
-- Converts reserved stock to sold | Strictly protects historical orders #1-#139
-- ----------------------------------------------------------------------------
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
BEGIN
    IF NOT public.is_owner() THEN
        RAISE EXCEPTION 'Unauthorized: only bookstore owner can confirm order delivery.';
    END IF;

    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'p_order_id cannot be null.';
    END IF;

    -- Historical order protection
    IF p_order_id <= 139 THEN
        RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
    END IF;

    -- Advisory transaction lock
    PERFORM pg_advisory_xact_lock(hashtextextended('gr_order_lock:' || p_order_id::text, 0));

    PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

    SELECT fulfillment_status INTO v_status
    FROM public.order_meta
    WHERE order_id = p_order_id;

    -- Idempotency check: Already delivered
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
        RAISE EXCEPTION 'Cannot confirm delivery for order %: no reserved stock allocations found.', p_order_id;
    END IF;

    -- Lock affected inventory items deterministically
    PERFORM 1
    FROM public.inventory_items i
    WHERE i.id IN (
        SELECT DISTINCT inventory_item_id
        FROM public.order_stock_allocations
        WHERE order_id = p_order_id AND allocation_status = 'reserved'
    )
    ORDER BY i.id ASC
    FOR UPDATE;

    -- Convert reserved stock to permanently sold
    FOR v_alloc IN
        SELECT a.id, a.inventory_item_id, a.quantity, i.quantity_reserved, i.title
        FROM public.order_stock_allocations a
        JOIN public.inventory_items i ON a.inventory_item_id = i.id
        WHERE a.order_id = p_order_id AND a.allocation_status = 'reserved'
    LOOP
        UPDATE public.inventory_items
        SET quantity_reserved = GREATEST(0, quantity_reserved - v_alloc.quantity),
            quantity_sold = quantity_sold + v_alloc.quantity,
            updated_at = clock_timestamp()
        WHERE id = v_alloc.inventory_item_id;

        UPDATE public.order_stock_allocations
        SET allocation_status = 'confirmed',
            updated_at = clock_timestamp()
        WHERE id = v_alloc.id;
    END LOOP;

    UPDATE public.order_meta
    SET fulfillment_status = 'delivered',
        updated_at = clock_timestamp()
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'fulfillment_status', 'delivered',
        'message', 'Order delivered successfully; reserved stock converted to sold.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_delivery TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. HARDENED IDEMPOTENT ORDER CANCELLATION RPC
-- Releases reserved stock back to available | Strictly protects historical orders
-- ----------------------------------------------------------------------------
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
BEGIN
    IF NOT public.is_owner() THEN
        RAISE EXCEPTION 'Unauthorized: only bookstore owner can cancel orders.';
    END IF;

    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'p_order_id cannot be null.';
    END IF;

    IF p_order_id <= 139 THEN
        RAISE EXCEPTION 'HISTORICAL_ORDER_PROTECTION: Order #% is an archived historical order and cannot be modified.', p_order_id;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('gr_order_lock:' || p_order_id::text, 0));

    PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

    SELECT fulfillment_status INTO v_status
    FROM public.order_meta
    WHERE order_id = p_order_id;

    -- Idempotency check: Already cancelled
    IF v_status = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'fulfillment_status', 'cancelled', 'message', 'Order already cancelled.');
    END IF;

    IF v_status = 'delivered' THEN
        RAISE EXCEPTION 'Cannot cancel order %: order is already delivered. Use customer return instead.', p_order_id;
    END IF;

    -- Lock affected inventory items deterministically
    PERFORM 1
    FROM public.inventory_items i
    WHERE i.id IN (
        SELECT DISTINCT inventory_item_id
        FROM public.order_stock_allocations
        WHERE order_id = p_order_id AND allocation_status = 'reserved'
    )
    ORDER BY i.id ASC
    FOR UPDATE;

    -- Release reserved stock back to inventory
    FOR v_alloc IN
        SELECT a.id, a.inventory_item_id, a.quantity, i.quantity_reserved, i.title
        FROM public.order_stock_allocations a
        JOIN public.inventory_items i ON a.inventory_item_id = i.id
        WHERE a.order_id = p_order_id AND a.allocation_status = 'reserved'
    LOOP
        UPDATE public.inventory_items
        SET quantity_reserved = GREATEST(0, quantity_reserved - v_alloc.quantity),
            updated_at = clock_timestamp()
        WHERE id = v_alloc.inventory_item_id;

        UPDATE public.order_stock_allocations
        SET allocation_status = 'released',
            updated_at = clock_timestamp()
        WHERE id = v_alloc.id;
    END LOOP;

    UPDATE public.order_meta
    SET fulfillment_status = 'cancelled',
        updated_at = clock_timestamp()
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'fulfillment_status', 'cancelled',
        'message', 'Order cancelled successfully; reserved stock safely released.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. REALTIME PUBLICATION CONFIGURATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'order_meta'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_meta;
  END IF;
END $$;

COMMIT;
