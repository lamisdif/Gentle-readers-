-- ============================================================================
-- GENTLE READERS: LIVE INVENTORY AUTO-DEDUCTION & PRICE FIX
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Helper function: normalize book title
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

-- 2. Smart item finder in public.inventory_items
CREATE OR REPLACE FUNCTION public.find_inventory_item_id(p_title text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_norm text;
    v_id text;
BEGIN
    IF p_title IS NULL OR trim(p_title) = '' THEN
        RETURN NULL;
    END IF;

    v_norm := public.normalize_book_title(p_title);

    -- 1. Exact normalized title match
    SELECT id INTO v_id
    FROM public.inventory_items
    WHERE public.normalize_book_title(title) = v_norm
    ORDER BY (quantity_received - quantity_sold - quantity_reserved) DESC, id ASC
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    -- 2. Substring match
    SELECT id INTO v_id
    FROM public.inventory_items
    WHERE (public.normalize_book_title(title) LIKE '%' || v_norm || '%'
       OR v_norm LIKE '%' || public.normalize_book_title(title) || '%')
      AND v_norm <> ''
    ORDER BY (quantity_received - quantity_sold - quantity_reserved) DESC, id ASC
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    -- 3. Core keyword matcher for specific editions / multi-volume sets
    SELECT id INTO v_id
    FROM public.inventory_items
    WHERE (
        (p_title ILIKE '%مثنوي%' AND title ILIKE '%مثنوي%') OR
        (p_title ILIKE '%قواعد العشق%' AND title ILIKE '%قواعد العشق%') OR
        (p_title ILIKE '%شمس التبريزي%' AND title ILIKE '%شمس التبريزي%') OR
        (p_title ILIKE '%نساء روحي%' AND title ILIKE '%نساء روحي%') OR
        (p_title ILIKE '%قصتي الوحيدة%' AND title ILIKE '%قصتي الوحيدة%') OR
        (p_title ILIKE '%استعدادات%' AND title ILIKE '%استعدادات%') OR
        (p_title ILIKE '%Whimsical Boots%' AND title ILIKE '%Whimsical Boots%')
    )
    ORDER BY (quantity_received - quantity_sold - quantity_reserved) DESC, id ASC
    LIMIT 1;

    RETURN v_id;
END;
$$;

-- 3. Fix المثنوي price to 10,000 DA
UPDATE public.inventory_items
SET selling_price_da = 10000,
    updated_at = clock_timestamp()
WHERE title ILIKE '%مثنوي%';

-- 4. Apply -1 inventory deduction for already-placed Orders #171 & #172
DO $$
DECLARE
    v_id text;
    v_targets text[] := ARRAY[
        'المثنوي ج1 الى 6',
        'قواعد العشق الاربعون دار اداب',
        'مختارات من ديوان شمس التبريزي',
        'نساء روحي',
        'قصتي الوحيدة: الصبي الذي كسر دائرة الصمت',
        'استعدادات لعقد قران',
        'Whimsical Boots Bookmarks'
    ];
    v_t text;
BEGIN
    FOREACH v_t IN ARRAY v_targets
    LOOP
        v_id := public.find_inventory_item_id(v_t);
        IF v_id IS NOT NULL THEN
            UPDATE public.inventory_items
            SET quantity_sold = quantity_sold + 1,
                updated_at = clock_timestamp()
            WHERE id = v_id
              AND (quantity_received - quantity_sold - quantity_reserved) > 0;
        END IF;
    END LOOP;
END $$;

-- 5. Automatic trigger for EVERY FUTURE ORDER placed on the database:
-- Automatically deducts stock from inventory_items by -1 down to 0
CREATE OR REPLACE FUNCTION public.trg_auto_deduct_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_elem jsonb;
    v_raw_text text;
    v_title text;
    v_qty integer;
    v_inv_id text;
    v_avail integer;
BEGIN
    -- Historical orders (ID <= 170) are permanently protected
    IF NEW.id <= 170 THEN
        RETURN NEW;
    END IF;

    IF NEW.items IS NOT NULL THEN
        FOR v_elem IN SELECT * FROM jsonb_array_elements(
            CASE 
                WHEN jsonb_typeof(NEW.items) = 'array' THEN NEW.items
                ELSE jsonb_build_array(NEW.items)
            END
        )
        LOOP
            IF jsonb_typeof(v_elem) = 'object' THEN
                v_title := v_elem->>'title';
                v_qty := coalesce((v_elem->>'quantity')::integer, 1);
            ELSE
                v_raw_text := trim(both '"' from v_elem::text);
                IF v_raw_text ~ '[×x]\s*\d+' THEN
                    v_qty := coalesce(substring(v_raw_text from '[×x]\s*(\d+)')::integer, 1);
                    v_title := trim(regexp_replace(v_raw_text, '\s*\[Accessory\]\s*|\s*[×x]\s*\d+.*$', ''));
                ELSE
                    v_qty := 1;
                    v_title := trim(regexp_replace(v_raw_text, '\s*\[Accessory\]\s*', ''));
                END IF;
                IF position(' / ' in v_title) > 0 THEN
                    v_title := trim(split_part(v_title, ' / ', 1));
                END IF;
            END IF;

            IF v_title IS NOT NULL AND v_title <> '' AND v_qty > 0 THEN
                v_inv_id := public.find_inventory_item_id(v_title);

                IF v_inv_id IS NOT NULL THEN
                    SELECT (quantity_received - quantity_sold - quantity_reserved - quantity_damaged)
                    INTO v_avail
                    FROM public.inventory_items
                    WHERE id = v_inv_id;

                    -- Decrement available inventory by incrementing quantity_sold
                    UPDATE public.inventory_items
                    SET quantity_sold = quantity_sold + LEAST(v_qty, GREATEST(0, v_avail)),
                        selling_price_da = CASE 
                            WHEN title ILIKE '%مثنوي%' THEN 10000 
                            ELSE selling_price_da 
                        END,
                        updated_at = clock_timestamp()
                    WHERE id = v_inv_id;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_auto_deduct_inventory ON public.orders;

CREATE TRIGGER trg_orders_auto_deduct_inventory
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_deduct_inventory();

-- 6. Updated create_storefront_order RPC with exact table column names
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
    v_inv_id text;
    v_avail_total integer;
    v_expected_items_total numeric(12,2) := 0;
    v_catalog_unit_price numeric(10,2);
BEGIN
    IF trim(coalesce(p_phone_number, '')) = '' THEN
        RAISE EXCEPTION 'CHECKOUT_VALIDATION_ERROR: Phone number is required.';
    END IF;
    IF p_requested_items IS NULL OR jsonb_array_length(p_requested_items) = 0 THEN
        RAISE EXCEPTION 'CHECKOUT_VALIDATION_ERROR: Order must contain at least one item.';
    END IF;

    -- Validate availability
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_requested_items) AS x(title text, quantity integer, type text)
    LOOP
        v_inv_id := public.find_inventory_item_id(v_item.title);
        IF v_inv_id IS NOT NULL THEN
            SELECT (quantity_received - quantity_sold - quantity_reserved - quantity_damaged),
                   coalesce(selling_price_da, 0)
            INTO v_avail_total, v_catalog_unit_price
            FROM public.inventory_items
            WHERE id = v_inv_id;

            IF v_avail_total < v_item.quantity THEN
                RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product "%" has only % copies available.', v_item.title, v_avail_total;
            END IF;
            v_expected_items_total := v_expected_items_total + (v_catalog_unit_price * v_item.quantity);
        END IF;
    END LOOP;

    -- Insert order into public.orders (Trigger trg_orders_auto_deduct_inventory automatically decrements stock!)
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

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_storefront_order TO anon, authenticated, service_role;
