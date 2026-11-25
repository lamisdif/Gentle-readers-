-- ============================================================================
-- GENTLE READERS — PHASE 6: ACCOUNTING, ARABIC MATCHING & LOT ALLOCATION FIX
-- Safe, Non-Destructive & Idempotent
-- Preserves all orders, inventory batches, historical figures, & storefront
-- ============================================================================

BEGIN;

-- 1. Normalize Book Title (strips Arabic diacritics, tatweel, Arabic numerals, alef/taa/yaa variants)
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
            regexp_replace(
              lower(coalesce(p_title, '')),
              '[\u064B-\u065F\u0670\u0640]', '', 'g'
            ),
            '[أإآٱ]', 'ا', 'g'
          ),
          'ة', 'ه', 'g'
        ),
        '[ىئ]', 'ي', 'g'
      ),
      '[^\w\s\u0600-\u06FF]', ' ', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

GRANT EXECUTE ON FUNCTION public.normalize_book_title(text) TO anon, authenticated, service_role;

-- 2. Strict FIFO Inventory Finder (NO cross-title false matches; OLD_STOCK first, then NEW_STOCK)
CREATE OR REPLACE FUNCTION public.find_inventory_item_id(p_title text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_norm text;
  v_canonical text;
  v_id text;
BEGIN
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RETURN NULL;
  END IF;

  v_norm := public.normalize_book_title(p_title);

  -- Verified storefront -> warehouse title aliases
  v_canonical := CASE
    WHEN v_norm = public.normalize_book_title('المثنوي ج1 الى 6') THEN public.normalize_book_title('مثنوي 1-6')
    WHEN v_norm = public.normalize_book_title('استعدادات لعقد قران') THEN public.normalize_book_title('استعدادات و قصص اخرى')
    WHEN v_norm = public.normalize_book_title('اخرج مع فتاة تحب الكتابة') THEN public.normalize_book_title('اخرج في موعد مع فتاة تحب الكتابة')
    ELSE v_norm
  END;

  -- Tier 1: Exact normalized match (strict FIFO: available > 0 preferred, OLD_STOCK first, acquisition_date ASC)
  SELECT id INTO v_id
  FROM public.inventory_items
  WHERE public.normalize_book_title(title) = v_canonical
  ORDER BY
    CASE WHEN COALESCE(quantity_available, (quantity_received + quantity_count_adjustment - quantity_sold - quantity_reserved - quantity_damaged)) > 0 THEN 0 ELSE 1 END ASC,
    CASE WHEN stock_group = 'OLD_STOCK' THEN 0 ELSE 1 END ASC,
    acquisition_date ASC NULLS LAST,
    created_at ASC,
    id ASC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Tier 2: Space-insensitive exact match (e.g. كبرياء وهوى vs كبرياء و هوى)
  SELECT id INTO v_id
  FROM public.inventory_items
  WHERE replace(public.normalize_book_title(title), ' ', '') = replace(v_canonical, ' ', '')
  ORDER BY
    CASE WHEN COALESCE(quantity_available, (quantity_received + quantity_count_adjustment - quantity_sold - quantity_reserved - quantity_damaged)) > 0 THEN 0 ELSE 1 END ASC,
    CASE WHEN stock_group = 'OLD_STOCK' THEN 0 ELSE 1 END ASC,
    acquisition_date ASC NULLS LAST,
    created_at ASC,
    id ASC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Tier 3: Word-boundary prefix edition match only (never short single-word substring match)
  SELECT id INTO v_id
  FROM public.inventory_items
  WHERE length(public.normalize_book_title(title)) >= 8
    AND array_length(string_to_array(public.normalize_book_title(title), ' '), 1) >= 2
    AND (
      v_canonical LIKE public.normalize_book_title(title) || ' %'
      OR public.normalize_book_title(title) LIKE v_canonical || ' %'
    )
  ORDER BY
    CASE WHEN COALESCE(quantity_available, (quantity_received + quantity_count_adjustment - quantity_sold - quantity_reserved - quantity_damaged)) > 0 THEN 0 ELSE 1 END ASC,
    CASE WHEN stock_group = 'OLD_STOCK' THEN 0 ELSE 1 END ASC,
    acquisition_date ASC NULLS LAST,
    created_at ASC,
    id ASC
  LIMIT 1;

  RETURN v_id;
END;
$$;

-- 3. Auto-deduct trigger on future storefront orders + permanently record allocated lot
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
  v_cost numeric(10,2);
  v_take integer;
BEGIN
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
          v_title := trim(regexp_replace(v_raw_text, '\s*\[(Accessory|Packaging|Book)\]\s*|\s*[×x]\s*\d+.*$', ''));
        ELSE
          v_qty := 1;
          v_title := trim(regexp_replace(v_raw_text, '\s*\[(Accessory|Packaging|Book)\]\s*', ''));
        END IF;
        IF position(' / ' in v_title) > 0 AND v_title NOT ILIKE '%Bookmark%' AND v_title NOT ILIKE '%Reading Log%' THEN
          v_title := trim(split_part(v_title, ' / ', 1));
        END IF;
      END IF;

      IF v_title IS NOT NULL AND v_title <> '' AND v_qty > 0 THEN
        v_inv_id := public.find_inventory_item_id(v_title);

        IF v_inv_id IS NOT NULL THEN
          SELECT
            COALESCE(quantity_available, (quantity_received + quantity_count_adjustment - quantity_sold - quantity_reserved - quantity_damaged)),
            unit_purchase_cost_da
          INTO v_avail, v_cost
          FROM public.inventory_items
          WHERE id = v_inv_id
          FOR UPDATE;

          v_take := LEAST(v_qty, GREATEST(0, COALESCE(v_avail, 0)));

          IF v_take > 0 THEN
            UPDATE public.inventory_items
            SET quantity_sold = quantity_sold + v_take,
                updated_at = clock_timestamp()
            WHERE id = v_inv_id;
          END IF;

          -- Permanently record stock lot allocation (idempotent guard)
          IF NOT EXISTS (
            SELECT 1 FROM public.order_stock_allocations
            WHERE order_id = NEW.id AND inventory_item_id = v_inv_id AND allocation_status <> 'released'
          ) THEN
            INSERT INTO public.order_stock_allocations (
              order_id, inventory_item_id, quantity, unit_purchase_cost_da, cost_basis, allocation_status
            ) VALUES (
              NEW.id, v_inv_id, v_qty, v_cost, 'fifo', 'confirmed'
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
