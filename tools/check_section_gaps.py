"""소개글 → 원(다이어그램) → 'Exhibition Design ✕ Media Art' 위아래 간격을 글자 잉크 기준으로 잰다.

  python tools/check_section_gaps.py [페이지 주소]
  (기본: 루트 index.html, 화면 1440·1920·1000·390)

2026-11-21: 원 아래 간격이 114px(위 73px)이라 .section-statement margin-top을 4rem − section-gap으로 맞춤 → 위아래 1~3px 안.
박스(getBoundingClientRect)만 보면 글자 아래 여백 때문에 실제 보이는 간격과 9~10px 다르므로 캡처 화소로 잉크 위치를 잰다.
"""
import asyncio, io, sys
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv) > 1 else (ROOT / "index.html").as_uri()
SIZES = (("desk1440", 1440, 900, False), ("desk1920", 1920, 1080, False),
         ("tab1000", 1000, 800, False), ("mob390", 390, 844, True))

MEASURE_JS = """() => {
  const R = e => e.getBoundingClientRect();
  const sub = document.querySelector('.philosophy-sub-text');
  const rg = document.createRange(); rg.selectNodeContents(sub);
  const last = Math.max(...[...rg.getClientRects()].map(x => x.bottom));
  const cs = [...document.querySelectorAll('.philosophy-diagram .circle')].map(R);
  const sr = R(document.querySelector('.statement-line'));
  return {subBottom: last, cTop: Math.min(...cs.map(c => c.top)), cBot: Math.max(...cs.map(c => c.bottom)),
          stTop: sr.top, stBot: sr.bottom, left: R(sub).left, right: Math.min(innerWidth, R(sub).left + 1100)};
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")  # 사용자 프로필과 분리된 헤드리스 크롬
        for name, vw, vh, mob in SIZES:
            pg = await b.new_page(viewport={"width": vw, "height": vh}, is_mobile=mob, has_touch=mob)
            await pg.goto(URL); await pg.wait_for_timeout(2000)
            for sel in (".section-philosophy", ".section-statement"):  # 나타나기 연출을 끝내 둠
                await pg.locator(sel).scroll_into_view_if_needed(); await pg.wait_for_timeout(1500)
            await pg.evaluate("""() => { const d = document.querySelector('.philosophy-diagram').getBoundingClientRect();
                                         scrollTo(0, scrollY + d.top + d.height / 2 - innerHeight / 2); }""")
            await pg.wait_for_timeout(1500)
            r = await pg.evaluate(MEASURE_JS)
            top = max(0, r["subBottom"] - 60); bot = min(vh, r["stBot"] + 10)
            png = await pg.screenshot(clip={"x": r["left"], "y": top, "width": r["right"] - r["left"], "height": bot - top})
            im = Image.open(io.BytesIO(png)).convert("L"); w, h = im.size
            bg = im.getpixel((w - 3, 3)); px = im.load()
            ink = [any(abs(px[x, y] - bg) > 60 for x in range(w)) for y in range(h)]
            runs, y = [], 0
            while y < h:
                if ink[y]:
                    s = y
                    while y < h and ink[y]: y += 1
                    runs.append((s + top, y - 1 + top))
                else:
                    y += 1
            text_bot = max(e for s, e in runs if e < r["cTop"] - 2)
            st_top = min(s for s, e in runs if s > r["cBot"] + 2)
            print(f"{name}: 소개글 → 원 위 {r['cTop'] - text_bot:.0f}px | 원 아래 → Exhibition {st_top - r['cBot']:.0f}px"
                  f"  (박스 기준 {r['cTop'] - r['subBottom']:.0f} / {r['stTop'] - r['cBot']:.0f})")
            await pg.close()
        await b.close()

asyncio.run(main())
