import json

data = json.load(open('public/cms-books.json', encoding='utf-8'))
for b in data:
    t = b.get('title', '')
    for k in ['المثنوي', 'قواعد العشق', 'شمس التبريزي', 'نساء روحي', 'قصتي الوحيدة', 'استعدادات لعقد قران']:
        if k in t:
            print(f"{t}: Price={b.get('price')}, Status={b.get('status')}, Stock={b.get('stock')}")
