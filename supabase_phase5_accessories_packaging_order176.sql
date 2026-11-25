-- ============================================================================
-- GENTLE READERS — PHASE 5: ACCESSORIES, PACKAGING PAPER & ORDER #176 FIX
-- Safe, additive, and 100% idempotent (rerunnable without duplicating data).
-- Preserves all existing books, inventory lots, orders, FIFO logic, and rules.
-- ============================================================================

BEGIN;

-- 1. Seed the 4 website-linked Accessories into public.inventory_items (if absent)
INSERT INTO public.inventory_items (
  id, title, author, category, stock_group, batch_id,
  quantity_received, quantity_sold, quantity_reserved, quantity_damaged,
  unit_purchase_cost_da, selling_price_da, supplier_name, acquisition_date, condition, notes
) VALUES
(
  'a0000000-0000-4000-8000-000000000001',
  'Whimsical Boots Bookmarks / فاصل الأحذية المميز',
  'Gentle Readers Collection',
  'bookmark',
  'NEW_STOCK',
  NULL,
  3, 3, 0, 0,
  263, 1000,
  'Accessories Supplier',
  '2026-10-15',
  'New',
  'Linked Web Product: bookmark_boot-shaped-bookmarks | Category: bookmark | StockGroup: ACCESSORIES | [ACC_HISTORY:{"webId":"bookmark_boot-shaped-bookmarks","slug":"boot-shaped-bookmarks","baselinePreLiveSold":2,"salesTiers":[{"qty":2,"unitPriceDa":850,"offline":true,"label":"First 2 sold at 850 DA"},{"qty":1,"unitPriceDa":1000,"orderId":198,"label":"Last 1 sold at 1,000 DA (Order #198)"}]}] | [PRICE_HISTORY:{"beforeDate":"2026-11-14T21:10:00Z","unitPriceDa":850}]'
),
(
  'a0000000-0000-4000-8000-000000000002',
  'Acrylic Cat Bookmarks / فواصل قطط لطيفة',
  'Gentle Readers Collection',
  'bookmark',
  'NEW_STOCK',
  NULL,
  2, 1, 0, 0,
  143, 450,
  'Accessories Supplier',
  '2026-10-15',
  'New',
  'Linked Web Product: bookmark_cat-bookmarks | Category: bookmark | StockGroup: ACCESSORIES | [ACC_HISTORY:{"webId":"bookmark_cat-bookmarks","slug":"cat-bookmarks","baselinePreLiveSold":1,"salesTiers":[{"qty":1,"unitPriceDa":450,"orderId":169,"label":"Order #169"}]}]'
),
(
  'a0000000-0000-4000-8000-000000000003',
  'Metallic Leaf Chain Bookmarks / فواصل أوراق شجر معدنية ذهبية',
  'Gentle Readers Collection',
  'bookmark',
  'NEW_STOCK',
  NULL,
  4, 2, 0, 0,
  173, 800,
  'Accessories Supplier',
  '2026-10-15',
  'New',
  'Linked Web Product: bookmark_metallic-leaf-bookmarks | Category: bookmark | StockGroup: ACCESSORIES | [ACC_HISTORY:{"webId":"bookmark_metallic-leaf-bookmarks","slug":"metallic-leaf-bookmarks","baselinePreLiveSold":2,"salesTiers":[{"qty":2,"unitPriceDa":750,"orderIds":[168,170],"label":"First 2 sold at 750 DA (Orders #168 & #170)"}]}] | [PRICE_HISTORY:{"beforeDate":"2026-11-10T17:11:29Z","unitPriceDa":750}]'
),
(
  'a0000000-0000-4000-8000-000000000004',
  'Reading Log & Book Tracker / بطاقة تتبع القراءة والمراجعات',
  'Gentle Readers Collection',
  'accessory',
  'NEW_STOCK',
  NULL,
  20, 2, 0, 0,
  62, 150,
  'Accessories Supplier',
  '2026-10-15',
  'New',
  'Linked Web Product: acc_book-tracker | Category: accessory | StockGroup: ACCESSORIES | [ACC_HISTORY:{"webId":"acc_book-tracker","slug":"book-tracker","baselinePreLiveSold":2,"salesTiers":[{"qty":1,"unitPriceDa":150,"orderId":170,"label":"Order #170"},{"qty":1,"unitPriceDa":150,"offline":true,"label":"Direct / offline sale"}]}]'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed the 4 Packaging Paper Variants into public.inventory_items (provisional ~3m = 300cm, NULL per-cm cost)
INSERT INTO public.inventory_items (
  id, title, author, category, stock_group, batch_id,
  quantity_received, quantity_sold, quantity_reserved, quantity_damaged,
  unit_purchase_cost_da, selling_price_da, supplier_name, acquisition_date, condition, notes
) VALUES
(
  'b0000000-0000-4000-8000-000000000001',
  'Surprise / مفاجأة (Wrapping Paper)',
  NULL,
  'packaging',
  'NEW_STOCK',
  NULL,
  300, 0, 0, 0,
  NULL, 500,
  'Packaging Supplier',
  '2026-11-01',
  'New',
  'Category: packaging | StockGroup: PACKAGING | Provisional ~3m roll | [PKG_META:{"variantKey":"surprise","shortName":"Surprise","purchasedMeters":3,"isProvisionalQty":true,"provisionalTotalCostDa":null,"isCostConfirmed":false,"cmPerWrapOverride":null}]'
),
(
  'b0000000-0000-4000-8000-000000000002',
  'Vintage Wildflowers / ورق زهور برية كلاسيكي',
  NULL,
  'packaging',
  'NEW_STOCK',
  NULL,
  300, 0, 0, 0,
  NULL, 600,
  'Packaging Supplier',
  '2026-11-01',
  'New',
  'Category: packaging | StockGroup: PACKAGING | Provisional ~3m roll | [PKG_META:{"variantKey":"paper_wildflowers","shortName":"Vintage","purchasedMeters":3,"isProvisionalQty":true,"provisionalTotalCostDa":840,"isCostConfirmed":false,"cmPerWrapOverride":null}]'
),
(
  'b0000000-0000-4000-8000-000000000003',
  'Festive Pine & Berries (Christmas) / ورق صنوبر وتوت شتوي',
  NULL,
  'packaging',
  'NEW_STOCK',
  NULL,
  300, 0, 0, 0,
  NULL, 600,
  'Packaging Supplier',
  '2026-11-01',
  'New',
  'Category: packaging | StockGroup: PACKAGING | Provisional ~3m roll | [PKG_META:{"variantKey":"paper_pine_berries","shortName":"Christmas","purchasedMeters":3,"isProvisionalQty":true,"provisionalTotalCostDa":822,"isCostConfirmed":false,"cmPerWrapOverride":null}]'
),
(
  'b0000000-0000-4000-8000-000000000004',
  'Celestial Crane & Mountain (Swan) / ورق الرافعات والجبال الذهبي',
  NULL,
  'packaging',
  'NEW_STOCK',
  NULL,
  300, 0, 0, 0,
  NULL, 800,
  'Packaging Supplier',
  '2026-11-01',
  'New',
  'Category: packaging | StockGroup: PACKAGING | Provisional ~3m roll | [PKG_META:{"variantKey":"paper_celestial_crane","shortName":"Swan","purchasedMeters":3,"isProvisionalQty":true,"provisionalTotalCostDa":1627,"isCostConfirmed":false,"cmPerWrapOverride":null}]'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Ensure auto-deduct trigger cleanly strips both [Accessory] and quantity suffix
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
                    v_title := trim(regexp_replace(v_raw_text, '\s*\[Accessory\]\s*|\s*[×x]\s*\d+.*$', '', 'g'));
                ELSE
                    v_qty := 1;
                    v_title := trim(regexp_replace(v_raw_text, '\s*\[Accessory\]\s*', '', 'g'));
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

-- 4. Idempotent Order #176 Correction ("ربما يجب أن تكلم أحدا × 1" = 2,500 DA unavailable & not delivered)
DO $$
DECLARE
    v_items jsonb;
    v_total numeric;
    v_new_items jsonb;
    v_audit_note text := 'Order #176 Correction: Removed unavailable item "ربما يجب أن تكلم أحدا × 1" (-2,500 DA). Order total adjusted from 10,200 DA to 7,700 DA (6,950 DA books + 750 DA shipping). [ORDER_CORRECTION:{"orderId":176,"removedItems":[{"raw":"ربما يجب أن تكلم أحدا × 1","title":"ربما يجب أن تكلم أحدا","qty":1,"unitPriceDa":2500,"amountDa":2500}],"previousTotalDa":10200,"correctedTotalDa":7700,"shippingDa":750,"correctedBookRevenueDa":6950,"reason":"Unavailable book (\"ربما يجب أن تكلم أحدا\") not delivered/taken by customer"}]';
BEGIN
    SELECT items, total_price INTO v_items, v_total
    FROM public.orders
    WHERE id = 176
    FOR UPDATE;

    IF FOUND AND v_total = 10200 AND v_items::text LIKE '%تكلم أحد%' THEN
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        INTO v_new_items
        FROM jsonb_array_elements(v_items) AS elem
        WHERE elem::text NOT LIKE '%تكلم أحد%';

        UPDATE public.orders
        SET items = v_new_items,
            total_price = 7700
        WHERE id = 176;

        INSERT INTO public.order_meta (order_id, fulfillment_status, payment_status, notes, updated_at)
        VALUES (176, 'shipped', 'unpaid', v_audit_note, timezone('utc'::text, now()))
        ON CONFLICT (order_id) DO UPDATE SET
            notes = CASE
                WHEN coalesce(public.order_meta.notes, '') LIKE '%[ORDER_CORRECTION:%' THEN public.order_meta.notes
                WHEN coalesce(trim(public.order_meta.notes), '') = '' THEN v_audit_note
                ELSE public.order_meta.notes || E'\n' || v_audit_note
            END,
            updated_at = timezone('utc'::text, now());
    END IF;
END $$;

COMMIT;
