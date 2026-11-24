import json

orders = [
    (171, '2026-11-14T22:26:27', 'Samira Radoui', ['المثنوي ج1 الى 6 × 1', 'قواعد العشق الاربعون  دار اداب × 1', 'مختارات من ديوان شمس التبريزي × 1']),
    (172, '2026-11-14T22:59:25', 'Kaouthar Laouadi', ['نساء روحي × 1', 'قصتي الوحيدة: الصبي الذي كسر دائرة الصمت × 1', 'استعدادات لعقد قران × 1', 'Whimsical Boots Bookmarks / فاصل الأحذية المميز [Accessory] × 1']),
    (173, '2026-11-15T09:11:52', 'متو حمودي', ['كبرياء وهوى × 1']),
    (174, '2026-11-15T10:19:12', 'Marwa Zermane', ['قواعد العشق الأربعون × 1']),
    (175, '2026-11-15T10:57:59', 'يسرى اميرة قادة', ['ارجوك اعتني بأمي × 1', 'شذرات الرعب × 1']),
    (176, '2026-11-15T17:09:37', 'Kaouthar Sd', ['قلق السعي الى المكانة × 1', 'ربما يجب أن تكلم أحدا × 1', 'مزرعة الحيوان × 1', 'رسائل إلى ميلينا × 1', 'كبرياء وهوى × 1', 'مئة عام من العزلة × 1']),
    (177, '2026-11-15T19:13:18', 'Samira Radoui', ['مِريكَل كريك × 1', 'المادة السوداء × 1', 'جنتلمان في موسكو × 1', 'شبح كانترفيل × 1', 'شؤون عائلية × 1', 'كبرياء وهوى × 1', 'آمال عظيمة × 1']),
    (178, '2026-11-15T19:32:29', 'Fares Roubihie', ['أيها العالم الجميل اين انت × 1'])
]

# Tally items
import re
tally = {}
for oid, dt, cust, itms in orders:
    for itm in itms:
        m = re.search(r'^(.*?)(?:\s*\[Accessory\])?\s*[×x]\s*(\d+)$', itm.strip())
        raw_title = m.group(1).strip() if m else itm.strip()
        qty = int(m.group(2)) if m else 1
        clean_title = raw_title.split(' / ')[0].strip()

        if clean_title not in tally:
            tally[clean_title] = {
                'raw_title': raw_title,
                'total_qty': 0,
                'orders': []
            }
        tally[clean_title]['total_qty'] += qty
        tally[clean_title]['orders'].append({
            'order_id': oid,
            'datetime': dt,
            'customer': cust,
            'qty': qty
        })

print(f"Total distinct titles ordered since yesterday: {len(tally)}")
for title, data in sorted(tally.items(), key=lambda x: x[1]['total_qty'], reverse=True):
    print(f"- **{title}**: Total Sold = {data['total_qty']}")
    for ord_info in data['orders']:
        print(f"    * Order #{ord_info['order_id']} ({ord_info['datetime']}) - {ord_info['customer']}: {ord_info['qty']} copy")
