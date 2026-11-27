"""Card thumbnails: the map images are 1024x1024 JPEGs (~100-300 KB) shown at about 330x92.
Makes a 640x180 WebP (~10-20 KB) per map, cropped like the card's `background-size: cover`.
Only maps without a thumbnail are processed, so this does real work once per map.

    python3 scripts/thumbs.py            (needs Pillow: pip install pillow)
"""
import io, json, os, sys, time, urllib.request
from PIL import Image

W, H = 640, 180
maps = json.load(open('data/maps.json'))
os.makedirs('thumbs', exist_ok=True)
todo = [m for m in maps if m.get('thumb') and not os.path.exists(f"thumbs/{m['id']}.webp")]
made = failed = 0
for m in todo:
    try:
        req = urllib.request.Request(m['thumb'], headers={'User-Agent': 'KackyReloadedProject/1.0'})
        img = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=20).read())).convert('RGB')
        scale = max(W / img.width, H / img.height)
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        left, top = (img.width - W) // 2, (img.height - H) // 2
        img.crop((left, top, left + W, top + H)).save(f"thumbs/{m['id']}.webp", 'WEBP', quality=72, method=6)
        made += 1
    except Exception as e:  # keep going; the site falls back to the original image
        failed += 1
        print(f"thumb {m['id']}: {e}", file=sys.stderr)
    time.sleep(0.05)
print(f'thumbs: made {made}, failed {failed}, already had {len(maps) - len(todo)}')
