import json
import re

def normalize_text(s):
    s = str(s or '').lower()
    s = re.sub(r'[أإآ]', 'ا', s)
    s = re.sub(r'ة', 'ه', s)
    s = re.sub(r'ى', 'ي', s)
    s = re.sub(r'[^\w\s\u0600-\u06FF]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def extract_tokens(s):
    s = str(s or '').lower()
    s = re.sub(r'[أإآ]', 'ا', s)
    s = re.sub(r'ة', 'ه', s)
    s = re.sub(r'ى', 'ي', s)
    s = re.sub(r'[^\w\s\u0600-\u06FF]', ' ', s)
    s = re.sub(r'\b(ج\d+|\d+|الى|الي|جزء|ج|دار|ديوان|مختارات|وقصص|قصص|اخرى|لعقد|قران)\b', ' ', s)
    s = re.sub(r'\bال([^\s]{3,})\b', r'\1', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return set(w for w in s.split() if len(w) >= 3)

def find_item(title, inventory):
    norm_target = normalize_text(title)
    for inv in inventory:
        if normalize_text(inv['title']) == norm_target:
            return inv
    for inv in inventory:
        ni = normalize_text(inv['title'])
        if norm_target in ni or ni in norm_target:
            return inv
    target_tokens = extract_tokens(title)
    best = None
    max_inter = 0
    for inv in inventory:
        inv_tokens = extract_tokens(inv['title'])
        inter = len(target_tokens.intersection(inv_tokens))
        if inter > max_inter:
            max_inter = inter
            best = inv
    if best and max_inter >= 1:
        return best
    return None

inventory = [
    {'id': 1, 'title': 'مثنوي 1-6', 'quantity_received': 1, 'selling_price_da': 8200, 'unit_purchase_cost_da': 4000},
    {'id': 2, 'title': 'قواعد العشق الاربعون', 'quantity_received': 2, 'selling_price_da': 3000, 'unit_purchase_cost_da': 1900},
    {'id': 3, 'title': 'مختارات من ديوان شمس التبريزي', 'quantity_received': 1, 'selling_price_da': 1200, 'unit_purchase_cost_da': 525},
    {'id': 4, 'title': 'نساء روحي', 'quantity_received': 1, 'selling_price_da': 1500, 'unit_purchase_cost_da': 1200},
    {'id': 5, 'title': 'قصتي الوحيدة: الصبي الذي كسر دائرة الصمت', 'quantity_received': 1, 'selling_price_da': 2250, 'unit_purchase_cost_da': 1125},
    {'id': 6, 'title': 'استعدادات و قصص اخرى', 'quantity_received': 1, 'selling_price_da': 1200, 'unit_purchase_cost_da': 525},
    {'id': 7, 'title': 'Whimsical Boots Bookmarks', 'quantity_received': 10, 'selling_price_da': 500, 'unit_purchase_cost_da': 200}
]

orders = [
    {
        'id': 171,
        'items': ['المثنوي ج1 الى 6 × 1', 'قواعد العشق الاربعون  دار اداب × 1', 'مختارات من ديوان شمس التبريزي × 1']
    },
    {
        'id': 172,
        'items': ['نساء روحي × 1', 'قصتي الوحيدة: الصبي الذي كسر دائرة الصمت × 1', 'استعدادات لعقد قران × 1', 'Whimsical Boots Bookmarks / فاصل الأحذية المميز [Accessory] × 1']
    }
]

for inv in inventory:
    inv['quantity_sold'] = 0
    inv['quantity_reserved'] = 0
    if 'مثنوي' in inv['title']:
        inv['selling_price_da'] = 10000

for o in orders:
    for raw in o['items']:
        m = re.match(r'^(.*?)(?:\s*\[.*?\])?(?:\s*[×x*]\s*(\d+))?$', raw)
        t = m.group(1).strip() if m else raw
        q = int(m.group(2)) if m and m.group(2) else 1
        matched = find_item(t, inventory)
        if matched:
            matched['quantity_reserved'] += q
            print(f"Order #{o['id']} item '{t}' matched '{matched['title']}' (+{q} reserved)")
        else:
            print(f"Order #{o['id']} item '{t}' NOT matched!")

print("\nFinal Inventory Status:")
for inv in inventory:
    rec = inv['quantity_received']
    res = inv['quantity_reserved']
    avail = rec - res
    print(f"- {inv['title']}: Rec={rec}, Res={res}, Avail={avail}, Price={inv['selling_price_da']} DA")
