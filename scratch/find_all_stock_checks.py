import os, re

for root, dirs, files in os.walk('public'):
    for f in files:
        if f.endswith('.js') or f.endswith('.html'):
            fpath = os.path.join(root, f)
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
                for idx, line in enumerate(fp, 1):
                    if any(k in line.lower() for k in ['out of stock', 'insufficient_stock', 'نفدت']):
                        print(f"{fpath}:{idx}: {line.strip()[:100]}")
