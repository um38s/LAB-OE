"""모달 사진 축소본 생성 — 기존 img/thumbs 규칙과 같게(가로 680px, WebP q80). 이미 있는 것은 건너뜀"""
import re, os
from PIL import Image, ImageOps
html = open('index.html', encoding='utf-8').read()
srcs = sorted({s.strip() for m in re.findall(r'data-img="([^"]+)"', html) for s in m.split(',')})
made = 0
for s in srcs:
    t = re.sub(r'\.[A-Za-z]+$', '.webp', s.replace('img/', 'img/thumbs/', 1))
    if os.path.exists(t):
        continue
    im = ImageOps.exif_transpose(Image.open(s)).convert('RGB')
    h = round(im.height * 680 / im.width)
    os.makedirs(os.path.dirname(t), exist_ok=True)
    im.resize((680, h), Image.LANCZOS).save(t, 'WEBP', quality=80, method=6)
    made += 1
    print(t, (680, h), os.path.getsize(t) // 1024, 'KB')
print('생성', made)
