import openpyxl, json, re

# 1. Load Excel items
wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.user_uploaded\media_1794075421146_d814f8cb.xlsx', data_only=True)

new_batch_items = []
ws_new = wb['NEW BATCH']
for r in range(2, ws_new.max_row + 1):
    title = ws_new.cell(r, 3).value
    if title:
        new_batch_items.append({
            'row': r,
            'sheet': 'NEW BATCH',
            'supplier': ws_new.cell(r, 1).value,
            'title': str(title).strip(),
            'author': ws_new.cell(r, 4).value,
            'qty_received': ws_new.cell(r, 7).value or 0,
            'unit_cost': ws_new.cell(r, 12).value,
            'selling_price': ws_new.cell(r, 13).value
        })

old_stock_items = []
ws_old = wb['OLD STOCK']
for r in range(2, ws_old.max_row + 1):
    title = ws_old.cell(r, 1).value
    if title:
        old_stock_items.append({
            'row': r,
            'sheet': 'OLD STOCK',
            'title': str(title).strip(),
            'author': ws_old.cell(r, 2).value,
            'qty_received': ws_old.cell(r, 5).value or 0,
            'unit_cost': ws_old.cell(r, 6).value,
            'selling_price': ws_old.cell(r, 7).value
        })

# 2. Load CMS books
with open('public/cms-books.json', 'r', encoding='utf-8') as f:
    cms_books = json.load(f)

# 3. Load Accessories
with open('public/cms-accessories.json', 'r', encoding='utf-8') as f:
    cms_acc = json.load(f)
with open('public/cms-bookmarks.json', 'r', encoding='utf-8') as f:
    cms_bm = json.load(f)

print(f"Loaded {len(new_batch_items)} NEW BATCH items, {len(old_stock_items)} OLD STOCK items, {len(cms_books)} CMS books.")

def normalize(s):
    if not s: return ''
    s = str(s).lower()
    s = re.sub(r'[أإآ]', 'ا', s)
    s = re.sub(r'ة', 'ه', s)
    s = re.sub(r'ى', 'ي', s)
    s = re.sub(r'[^\w\s\u0600-\u06FF]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def extract_tokens(s):
    norm = normalize(s)
    # remove common noise
    words = re.sub(r'\b(ج\d+|\d+|الى|الي|جزء|دار|ديوان|مختارات|وقصص|قصص|اخرى|لعقد|قران|رواية|كتاب|في|من|عن|على)\b', ' ', norm)
    words = re.sub(r'\bال([^\s]{3,})\b', r'\1', words)
    tokens = set(w for w in words.split() if len(w) >= 3)
    return tokens

# Test matching each ordered item
orders = [
    (171, 'Samira Radoui', ['المثنوي ج1 الى 6 × 1', 'قواعد العشق الاربعون  دار اداب × 1', 'مختارات من ديوان شمس التبريزي × 1']),
    (172, 'Kaouthar Laouadi', ['نساء روحي × 1', 'قصتي الوحيدة: الصبي الذي كسر دائرة الصمت × 1', 'استعدادات لعقد قران × 1', 'Whimsical Boots Bookmarks / فاصل الأحذية المميز [Accessory] × 1']),
    (173, 'متو حمودي', ['كبرياء وهوى × 1']),
    (174, 'Marwa Zermane', ['قواعد العشق الأربعون × 1']),
    (175, 'يسرى اميرة قادة', ['ارجوك اعتني بأمي × 1', 'شذرات الرعب × 1']),
    (176, 'Kaouthar Sd', ['قلق السعي الى المكانة × 1', 'ربما يجب أن تكلم أحدا × 1', 'مزرعة الحيوان × 1', 'رسائل إلى ميلينا × 1', 'كبرياء وهوى × 1', 'مئة عام من العزلة × 1']),
    (177, 'Samira Radoui', ['مِريكَل كريك × 1', 'المادة السوداء × 1', 'جنتلمان في موسكو × 1', 'شبح كانترفيل × 1', 'شؤون عائلية × 1', 'كبرياء وهوى × 1', 'آمال عظيمة × 1']),
    (178, 'Fares Roubihie', ['أيها العالم الجميل اين انت × 1'])
]

def find_match(ordered_title):
    ot = ordered_title
    # clean accessory / qty
    m = re.search(r'^(.*?)(?:\s*\[Accessory\])?\s*[×x]\s*(\d+)$', ot.strip())
    raw_title = m.group(1).strip() if m else ot.strip()
    qty = int(m.group(2)) if m else 1
    clean_title = raw_title.split(' / ')[0].strip()

    # Match in NEW BATCH first
    tokens = extract_tokens(clean_title)
    
    best_new = None
    best_new_score = 0
    for it in new_batch_items:
        it_tokens = extract_tokens(it['title'])
        inter = len(tokens.intersection(it_tokens))
        if normalize(clean_title) == normalize(it['title']):
            inter += 10
        elif normalize(it['title']) in normalize(clean_title) or normalize(clean_title) in normalize(it['title']):
            inter += 5
        if inter > best_new_score:
            best_new_score = inter
            best_new = it

    best_old = None
    best_old_score = 0
    for it in old_stock_items:
        it_tokens = extract_tokens(it['title'])
        inter = len(tokens.intersection(it_tokens))
        if normalize(clean_title) == normalize(it['title']):
            inter += 10
        elif normalize(it['title']) in normalize(clean_title) or normalize(clean_title) in normalize(it['title']):
            inter += 5
        if inter > best_old_score:
            best_old_score = inter
            best_old = it

    # Check CMS
    best_cms = None
    best_cms_score = 0
    for it in cms_books:
        it_tokens = extract_tokens(it.get('title', ''))
        inter = len(tokens.intersection(it_tokens))
        if normalize(clean_title) == normalize(it.get('title', '')):
            inter += 10
        elif normalize(it.get('title', '')) in normalize(clean_title) or normalize(clean_title) in normalize(it.get('title', '')):
            inter += 5
        if inter > best_cms_score:
            best_cms_score = inter
            best_cms = it

    return {
        'raw_title': raw_title,
        'clean_title': clean_title,
        'qty': qty,
        'best_new': best_new if best_new_score >= 1 else None,
        'new_score': best_new_score,
        'best_old': best_old if best_old_score >= 1 else None,
        'old_score': best_old_score,
        'best_cms': best_cms if best_cms_score >= 1 else None,
        'cms_score': best_cms_score
    }

print("\n--- MATCHING RESULTS ---")
total_items = 0
for oid, cust, itms in orders:
    print(f"\nOrder #{oid} ({cust}):")
    for itm in itms:
        total_items += 1
        res = find_match(itm)
        n_match = res['best_new']['title'] + f" (Rec: {res['best_new']['qty_received']})" if res['best_new'] else "None"
        o_match = res['best_old']['title'] + f" (Rec: {res['best_old']['qty_received']})" if res['best_old'] else "None"
        c_match = res['best_cms']['title'] + f" (Stock: {res['best_cms']['stock']})" if res['best_cms'] else "None"
        print(f"  Item: '{itm}' (Qty: {res['qty']})")
        print(f"    -> NEW BATCH: {n_match}")
        print(f"    -> OLD STOCK: {o_match}")
        print(f"    -> CMS:       {c_match}")

print(f"\nTotal items processed across 8 orders: {total_items}")
