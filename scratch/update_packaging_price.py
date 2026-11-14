# Update packaging prices to 600 DA across all storefront files

# 1. public/checkout.js
with open('public/checkout.js', 'r', encoding='utf-8') as f:
    c = f.read()

c_new = c.replace("'papier_craft': 500,", "'papier_craft': 600,").replace("'surprise': 500,", "'surprise': 600,")
if c != c_new:
    with open('public/checkout.js', 'w', encoding='utf-8') as f:
        f.write(c_new)
    print("Updated public/checkout.js: all packaging options now 600 DA")

# 2. public/checkout.html
with open('public/checkout.html', 'r', encoding='utf-8') as f:
    h = f.read()

h_new = h.replace('<div class="packaging-price">500 DA</div>', '<div class="packaging-price">600 DA</div>')
h_new = h_new.replace(
    '<div class="packaging-price">500 DA <span style="font-size: 11px; color: #666; font-weight: 500;">— samples on Instagram / شاهد على إنستغرام</span></div>',
    '<div class="packaging-price">600 DA <span style="font-size: 11px; color: #666; font-weight: 500;">— samples on Instagram / شاهد على إنستغرام</span></div>'
)
if h != h_new:
    with open('public/checkout.html', 'w', encoding='utf-8') as f:
        f.write(h_new)
    print("Updated public/checkout.html: packaging options display 600 DA")

# 3. public/index.html
with open('public/index.html', 'r', encoding='utf-8') as f:
    idx = f.read()

idx_new = idx.replace(
    'Classic Papier Craft (500 DA) and Mystery Surprise Wrap (500 DA)',
    'Classic Papier Craft (600 DA) and Mystery Surprise Wrap (600 DA)'
)
if idx != idx_new:
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(idx_new)
    print("Updated public/index.html: packaging showcase notes 600 DA")
