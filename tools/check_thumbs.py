"""data-img 원본마다 img/thumbs/*.webp 축소본이 있는지, 가로세로 비율이 같은지"""
import re
from PIL import Image
html = open('index.html', encoding='utf-8').read()
srcs = sorted({s.strip() for m in re.findall(r'data-img="([^"]+)"', html) for s in m.split(',')})
bad = 0
for s in srcs:
    t = re.sub(r'\.[A-Za-z]+$', '.webp', s.replace('img/', 'img/thumbs/', 1))
    try:
        a = Image.open(s).size; b = Image.open(t).size
        r = abs(a[0] / a[1] - b[0] / b[1])
        if r > 0.01: bad += 1; print('비율 다름', s, a, b)
    except Exception as e:
        bad += 1; print('없음', s, '->', t, type(e).__name__)
print(f'원본 {len(srcs)}개, 문제 {bad}개')
