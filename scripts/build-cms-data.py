import os
import json
import glob
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def safe_read_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None

def normalize_images(data):
    images = data.get('images', [])
    res = []
    if isinstance(images, list):
        for item in images:
            if isinstance(item, str) and item.strip():
                res.append(item.strip())
            elif isinstance(item, dict):
                img = item.get('image') or item.get('url')
                if img and str(img).strip():
                    res.append(str(img).strip())
    elif isinstance(images, str) and images.strip():
        res.append(images.strip())

    single_image = data.get('image')
    if single_image and isinstance(single_image, str) and single_image.strip():
        s = single_image.strip()
        if s not in res:
            res.insert(0, s)

    # Clean leading slash
    cleaned = []
    for img in res:
        if img.startswith('/') and not img.startswith('//'):
            cleaned.append(img[1:])
        else:
            cleaned.append(img)
    return cleaned

def build_bookmarks():
    src_dir = os.path.join(ROOT, 'src', 'data', 'bookmarks')
    out_file = os.path.join(ROOT, 'public', 'cms-bookmarks.json')
    if not os.path.exists(src_dir):
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write('[]\n')
        return

    bookmarks = []
    for fname in os.listdir(src_dir):
        if not fname.lower().endswith('.json'):
            continue
        fp = os.path.join(src_dir, fname)
        data = safe_read_json(fp)
        if not data:
            continue

        slug = os.path.splitext(fname)[0]
        images = normalize_images(data)
        main_img = images[0] if images else (data.get('image') or '').lstrip('/')
        
        price = data.get('price')
        if price is not None and str(price).strip() != '':
            try:
                price = float(price) if '.' in str(price) else int(price)
            except:
                price = None
        else:
            price = None

        bookmarks.append({
            'id': 'bookmark_' + slug,
            'slug': slug,
            'name': data.get('name') or data.get('title') or slug,
            'price': price,
            'active': data.get('active') is not False,
            'order': int(data.get('order', 99)),
            'description': data.get('description', ''),
            'images': images,
            'image': main_img,
            'draft': bool(data.get('draft', False))
        })

    published = [b for b in bookmarks if not b['draft']]
    published.sort(key=lambda b: (b['order'], b['name']))

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(published, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"Wrote {len(published)} bookmarks to {out_file}")

def build_accessories():
    src_dir = os.path.join(ROOT, 'src', 'data', 'accessories')
    out_file = os.path.join(ROOT, 'public', 'cms-accessories.json')
    if not os.path.exists(src_dir):
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write('[]\n')
        return

    accessories = []
    for fname in os.listdir(src_dir):
        if not fname.lower().endswith('.json'):
            continue
        fp = os.path.join(src_dir, fname)
        data = safe_read_json(fp)
        if not data:
            continue

        slug = os.path.splitext(fname)[0]
        images = normalize_images(data)
        main_img = images[0] if images else (data.get('image') or '').lstrip('/')
        
        price = data.get('price')
        if price is not None and str(price).strip() != '':
            try:
                price = float(price) if '.' in str(price) else int(price)
            except:
                price = None
        else:
            price = None

        accessories.append({
            'id': 'acc_' + slug,
            'slug': slug,
            'name': data.get('name') or data.get('title') or slug,
            'category': data.get('category', 'Accessory'),
            'price': price,
            'active': data.get('active') is not False,
            'order': int(data.get('order', 99)),
            'description': data.get('description', ''),
            'images': images,
            'image': main_img,
            'draft': bool(data.get('draft', False))
        })

    published = [a for a in accessories if not a['draft']]
    published.sort(key=lambda a: (a['order'], a['name']))

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(published, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"Wrote {len(published)} accessories to {out_file}")

if __name__ == '__main__':
    build_bookmarks()
    build_accessories()
