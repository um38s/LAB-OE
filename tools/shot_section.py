"""한 섹션을 데스크톱(1440)·폰(390, 2배) 크기로 캡처해 previews/에 저장 — 문구·줄바꿈 확인용.

  python tools/shot_section.py [페이지(index.html|ver01/index.html)] [CSS 선택자] [이름]
  예) python tools/shot_section.py ver01/index.html .philosophy-content ver01_intro

헤드리스 크롬(사용자 프로필과 분리)이라 사용자 브라우저 상태를 건드리지 않는다.
"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else "index.html"
SEL = sys.argv[2] if len(sys.argv) > 2 else ".philosophy-content"
NAME = sys.argv[3] if len(sys.argv) > 3 else "intro"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome")
        for tag, vw, vh, mob in (("desk", 1440, 900, False), ("mob", 390, 844, True)):
            pg = await b.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=2 if mob else 1,
                                  is_mobile=mob, has_touch=mob)
            await pg.goto((ROOT / PAGE).as_uri()); await pg.wait_for_timeout(2500)
            el = pg.locator(SEL)
            await el.scroll_into_view_if_needed()
            for _ in range(6):  # 스크롤 연동 나타나기 연출을 끝내 둠
                await pg.mouse.wheel(0, 120); await pg.wait_for_timeout(250)
            await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(2500)
            out = ROOT / "previews" / f"{NAME}_{tag}.png"
            out.parent.mkdir(exist_ok=True)
            await el.screenshot(path=str(out))
            print(out)
            await pg.close()
        await b.close()

asyncio.run(main())
