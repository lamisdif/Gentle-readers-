import subprocess, os
from PIL import Image

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
html_path = os.path.abspath('scratch/render_icon.html')
screenshot_path = os.path.abspath('scratch/screenshot_512.png')

html_content = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 512px;
    height: 512px;
    background-color: #FFF9EC;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  img {
    width: 440px;
    height: 440px;
    object-fit: contain;
  }
</style>
</head>
<body>
  <img src="../public/img/Perfectly made ones right.svg">
</body>
</html>
"""

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

cmd = [
    edge_path,
    '--headless',
    '--disable-gpu',
    f'--screenshot={screenshot_path}',
    '--window-size=512,512',
    '--hide-scrollbars',
    f'file:///{html_path.replace(os.sep, "/")}'
]

print("Running Edge headless screenshot...")
subprocess.run(cmd, check=True)

if os.path.exists(screenshot_path):
    print("Screenshot created:", os.path.getsize(screenshot_path), "bytes")
    im = Image.open(screenshot_path)
    # Ensure 512x512 crop
    im = im.crop((0, 0, 512, 512))

    icons_dir = os.path.abspath('public/manager/icons')
    os.makedirs(icons_dir, exist_ok=True)

    # 1. 512x512
    p512 = os.path.join(icons_dir, 'icon-512.png')
    im.save(p512, 'PNG')
    print("Saved:", p512)

    # 2. 192x192
    p192 = os.path.join(icons_dir, 'icon-192.png')
    im192 = im.resize((192, 192), Image.Resampling.LANCZOS)
    im192.save(p192, 'PNG')
    print("Saved:", p192)

    # 3. 180x180 (Apple touch icon)
    p180 = os.path.join(icons_dir, 'apple-touch-icon.png')
    im180 = im.resize((180, 180), Image.Resampling.LANCZOS)
    im180.save(p180, 'PNG')
    print("Saved:", p180)
else:
    print("Screenshot failed!")
