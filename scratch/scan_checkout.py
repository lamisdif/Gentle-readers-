with open('public/checkout.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in checkout.js: {len(lines)}")
for i, line in enumerate(lines, 1):
    if any(w in line.lower() for w in ['match', 'lookup', 'inventory', 'checkstock', 'avail', 'out of stock', 'instock']):
        print(f"L{i}: {line.strip()[:100]}")
