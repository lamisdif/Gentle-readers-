import re

def parse_item(raw):
    # e.g. "المثنوي ج1 الى 6 × 1"
    # or "Whimsical Boots Bookmarks / فاصل الأحذية المميز [Accessory] × 1"
    m = re.search(r'^(.*?)(?:\s*\[Accessory\])?\s*[×x]\s*(\d+)$', raw.strip())
    if m:
        title = m.group(1).strip()
        qty = int(m.group(2))
    else:
        title = raw.strip()
        qty = 1
    # Clean slash in bilingual titles
    if ' / ' in title:
        parts = [p.strip() for p in title.split(' / ')]
        title = parts[0] # English or primary
    return title, qty

test_items = [
    'المثنوي ج1 الى 6 × 1',
    'قواعد العشق الاربعون  دار اداب × 1',
    'مختارات من ديوان شمس التبريزي × 1',
    'نساء روحي × 1',
    'قصتي الوحيدة: الصبي الذي كسر دائرة الصمت × 1',
    'استعدادات لعقد قران × 1',
    'Whimsical Boots Bookmarks / فاصل الأحذية المميز [Accessory] × 1'
]

for t in test_items:
    print(t, '===>', parse_item(t))
