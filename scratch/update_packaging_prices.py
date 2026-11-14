import re

# 1. Update public/checkout.js
with open('public/checkout.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace prices in PACKAGING_PRICES
old_dict = """const PACKAGING_PRICES = {
  'none': 0,
  'papier_craft': 600,
  'surprise': 600,
  'paper_wildflowers': 600,
  'paper_pine_berries': 600,
  'paper_celestial_crane': 600
};"""

new_dict = """const PACKAGING_PRICES = {
  'none': 0,
  'papier_craft': 500,
  'surprise': 500,
  'paper_wildflowers': 600,
  'paper_pine_berries': 600,
  'paper_celestial_crane': 800
};"""

assert old_dict in js, "PACKAGING_PRICES not found in checkout.js"
js = js.replace(old_dict, new_dict, 1)

with open('public/checkout.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated public/checkout.js successfully")

# 2. Update public/checkout.html
with open('public/checkout.html', 'r', encoding='utf-8') as f:
    html = f.read()

# papier_craft: 600 DA -> 500 DA
target_pc = """<label class="packaging-option">
                <input type="radio" name="packaging" value="papier_craft">
                <img src="/img/papier-craft.PNG" alt="Papier Craft" width="65" height="65" loading="lazy">
                <div class="packaging-emoji">🎁</div>
                <div class="packaging-info">
                  <div class="packaging-title">Papier Craft / ورق كرافت</div>
                  <div class="packaging-price">600 DA</div>"""

repl_pc = """<label class="packaging-option">
                <input type="radio" name="packaging" value="papier_craft">
                <img src="/img/papier-craft.PNG" alt="Papier Craft" width="65" height="65" loading="lazy">
                <div class="packaging-emoji">🎁</div>
                <div class="packaging-info">
                  <div class="packaging-title">Papier Craft / ورق كرافت</div>
                  <div class="packaging-price">500 DA</div>"""

assert target_pc in html, "papier_craft block not found in checkout.html"
html = html.replace(target_pc, repl_pc, 1)

# surprise: 600 DA -> 500 DA
target_surp = """<label class="packaging-option">
                <input type="radio" name="packaging" value="surprise">
                <img src="/img/surprise.PNG" alt="Surprise" width="65" height="65" loading="lazy">
                <div class="packaging-emoji">✨</div>
                <div class="packaging-info">
                  <div class="packaging-title">Surprise / مفاجأة</div>
                  <div class="packaging-price">600 DA <span style="font-size: 11px; color: #666; font-weight: 500;">— samples on Instagram / شاهد على إنستغرام</span></div>"""

repl_surp = """<label class="packaging-option">
                <input type="radio" name="packaging" value="surprise">
                <img src="/img/surprise.PNG" alt="Surprise" width="65" height="65" loading="lazy">
                <div class="packaging-emoji">✨</div>
                <div class="packaging-info">
                  <div class="packaging-title">Surprise / مفاجأة</div>
                  <div class="packaging-price">500 DA <span style="font-size: 11px; color: #666; font-weight: 500;">— samples on Instagram / شاهد على إنستغرام</span></div>"""

assert target_surp in html, "surprise block not found in checkout.html"
html = html.replace(target_surp, repl_surp, 1)

# celestial crane: 600 DA -> 800 DA
target_crane = """<label class="packaging-option">
                <input type="radio" name="packaging" value="paper_celestial_crane">
                <img src="img/new%20products/wrapping%20paper/packaging%20paper%203.jpg" alt="Celestial Crane & Mountains" width="65" height="65" loading="lazy">
                <div class="packaging-emoji">🕊️</div>
                <div class="packaging-info">
                  <div class="packaging-title">Celestial Crane & Mountain / ورق الرافعات والجبال الذهبي</div>
                  <div class="packaging-sub">Traditional oriental landscape with golden clouds & blue peaks / طيور كركي وجبال ذهبية ساحرة</div>
                  <div class="packaging-price">600 DA</div>"""

repl_crane = """<label class="packaging-option">
                <input type="radio" name="packaging" value="paper_celestial_crane">
                <img src="img/new%20products/wrapping%20paper/packaging%20paper%203.jpg" alt="Celestial Crane & Mountains" width="65" height="65" loading="lazy">
                <div class="packaging-emoji">🕊️</div>
                <div class="packaging-info">
                  <div class="packaging-title">Celestial Crane & Mountain / ورق الرافعات والجبال الذهبي</div>
                  <div class="packaging-sub">Traditional oriental landscape with golden clouds & blue peaks / طيور كركي وجبال ذهبية ساحرة</div>
                  <div class="packaging-price">800 DA</div>"""

assert target_crane in html, "celestial crane block not found in checkout.html"
html = html.replace(target_crane, repl_crane, 1)

with open('public/checkout.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated public/checkout.html successfully")

# 3. Update public/index.html
with open('public/index.html', 'r', encoding='utf-8') as f:
    idx = f.read()

# Crane card price
target_card = """<div class="cute-card-price" style="color: #5e2217;">600 DA</div>"""
repl_card = """<div class="cute-card-price" style="color: #5e2217;">800 DA</div>"""
# In celestial crane card:
crane_card_pos = idx.find('id="packaging-card-celestial-crane"')
assert crane_card_pos != -1, "packaging-card-celestial-crane not found in index.html"
part1 = idx[:crane_card_pos]
part2 = idx[crane_card_pos:]
part2 = part2.replace(target_card, repl_card, 1)
idx = part1 + part2

# Also available notice:
target_notice = "Classic Papier Craft (600 DA) and Mystery Surprise Wrap (600 DA)."
repl_notice = "Classic Papier Craft (500 DA) and Mystery Surprise Wrap (500 DA)."
assert target_notice in idx, "Also available notice not found in index.html"
idx = idx.replace(target_notice, repl_notice, 1)

# productGalleryState crane price
target_gallery = """'paper_celestial_crane': {
            id: 'paper_celestial_crane',
            slug: 'paper_celestial_crane',
            type: 'packaging',
            name: 'Celestial Crane & Mountain Wrapping Paper / ورق الرافعات والجبال السماوية',
            description: 'Majestic oriental cranes soaring above mist-shrouded peaks and pines against deep indigo tones. Available exclusively when ordering a book.',
            price: 600,
            priceText: '600 DA (Book Orders Only)',"""

repl_gallery = """'paper_celestial_crane': {
            id: 'paper_celestial_crane',
            slug: 'paper_celestial_crane',
            type: 'packaging',
            name: 'Celestial Crane & Mountain Wrapping Paper / ورق الرافعات والجبال السماوية',
            description: 'Majestic oriental cranes soaring above mist-shrouded peaks and pines against deep indigo tones. Available exclusively when ordering a book.',
            price: 800,
            priceText: '800 DA (Book Orders Only)',"""

assert target_gallery in idx, "target_gallery not found in index.html"
idx = idx.replace(target_gallery, repl_gallery, 1)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(idx)
print("Updated public/index.html successfully")
