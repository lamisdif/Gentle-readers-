import os, re

keywords = [
    'inventory lookup',
    'title matching',
    'available quantity',
    'available-quantity',
    'stock availability',
    'check_stock',
    'findinventory',
    'matchinventory',
    'lookupinventory'
]

for root, dirs, files in os.walk('.'):
    if any(p in root for p in ['.git', 'node_modules', '.gemini']):
        continue
    for f in files:
        if f.endswith('.js') or f.endswith('.html') or f.endswith('.sql') or f.endswith('.ts') or f.endswith('.json'):
            fpath = os.path.join(root, f)
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
                for idx, line in enumerate(fp, 1):
                    line_l = line.lower()
                    for kw in keywords:
                        if kw in line_l:
                            print(f"{fpath}:{idx}: [{kw}] {line.strip()[:100]}")
