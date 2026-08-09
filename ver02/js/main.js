/* =========================================================
   LAB-OE Portfolio ver02 — main.js
   구성: 튜닝 파라미터 / 테마 토글 / 인트로 오버레이 /
        히어로 키네틱 타이포 / Lenis+ScrollTrigger /
        리스트 호버 프리뷰 / 커스텀 커서 / 이미지 모달
========================================================= */

// ---------- 튜닝 파라미터 (명세 9) ----------
const PARAMS = {
    PREVIEW_LERP: 0.09,   // 호버 프리뷰 커서 추적 지연
    HERO_RADIUS: 200,     // 히어로 커서 영향 반경(px)
    IDLE_DELAY: 3000,     // idle 모드 진입 대기(ms)
    IDLE_PERIOD: 4,       // idle 웨이브 주기(s)
    IDLE_WEIGHT_MIN: 400, // idle 웨이브 최소 웨이트
    IDLE_WEIGHT_MAX: 650, // idle 웨이브 최대 웨이트
    HOVER_WEIGHT_MIN: 400,// 커서 인터랙션 기본 웨이트
    HOVER_WEIGHT_MAX: 800,// 커서 인터랙션 최대 웨이트
    HERO_LERP: 0.12,      // 웨이트 복원 보간
    SCROLL_LERP: 0.1,     // Lenis 스크롤 감쇠
    CURSOR_LERP: 0.15,    // 커스텀 커서 추적 지연
    INTRO_DURATION: 0.8,  // 인트로 오버레이 걷힘 시간(s)
};

const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 전역 마우스 좌표 (히어로/프리뷰/커서 공용)
const mouse = { x: -9999, y: -9999 };
let lastMouseMove = 0;
let touchActive = false; // 모바일: 손가락이 화면에 닿아 있는 동안 true

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    lastMouseMove = performance.now();
}, { passive: true });

// ---------- 테마 토글 ----------
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });
}

// ---------- Lenis 스무스 스크롤 ----------
let lenis = null;
if (typeof Lenis !== 'undefined' && !reducedMotion) {
    lenis = new Lenis({
        lerp: PARAMS.SCROLL_LERP,
        smoothTouch: false,
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Lenis ↔ GSAP 연동
    if (lenis) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    // =====================================================
    // 히어로 — 글자 분해 (마스크 리빌 + 키네틱용)
    // =====================================================
    const heroTitle = document.querySelector('.hero-title');
    const heroChars = [];      // 전체 char 요소
    const mainChars = [];      // "LAB OE"
    const nameChars = [];      // "KIM YOUNG TAE"

    function wrapText(text, bucket) {
        const frag = document.createDocumentFragment();
        [...text].forEach((ch) => {
            const mask = document.createElement('span');
            mask.className = 'char-mask';
            const c = document.createElement('span');
            c.className = 'char';
            c.textContent = ch === ' ' ? ' ' : ch;
            mask.appendChild(c);
            frag.appendChild(mask);
            heroChars.push(c);
            bucket.push(c);
        });
        return frag;
    }

    if (heroTitle) {
        const nodes = Array.from(heroTitle.childNodes);
        const frag = document.createDocumentFragment();
        nodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const t = node.textContent.replace(/\s+/g, ' ').trim();
                if (t) frag.appendChild(wrapText(t, mainChars));
            } else if (node.nodeName === 'BR') {
                frag.appendChild(document.createElement('br'));
            } else if (node.classList && node.classList.contains('hero-title-name')) {
                const span = document.createElement('span');
                span.className = 'hero-title-name';
                span.appendChild(wrapText(node.textContent.trim(), nameChars));
                frag.appendChild(span);
            }
        });
        heroTitle.innerHTML = '';
        heroTitle.appendChild(frag);
        heroTitle.classList.add('is-split');
    }

    // =====================================================
    // 히어로 — 키네틱 웨이트 루프 (커서 근접 + idle 웨이브)
    // =====================================================
    const charState = heroChars.map(() => ({ w: PARAMS.HOVER_WEIGHT_MIN + 30, applied: PARAMS.HOVER_WEIGHT_MIN + 30 }));
    let kineticOn = false;
    let heroVisible = true;

    if (heroTitle && 'IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            heroVisible = entries[0].isIntersecting;
        }).observe(heroTitle);
    }

    function startKinetic() {
        // 리빌 완료 후 마스크 클리핑 해제 (웨이트 변화로 글자가 잘리지 않게)
        if (heroTitle) heroTitle.classList.add('is-revealed');
        if (reducedMotion || heroChars.length === 0) return;
        kineticOn = true;
    }

    function kineticTick(now) {
        if (!kineticOn || !heroVisible) return;
        // 데스크톱: 마우스 유휴 3초 후 웨이브 / 모바일: 터치 중엔 손끝 근접 반응, 평소엔 웨이브
        const idle = isDesktop ? (now - lastMouseMove > PARAMS.IDLE_DELAY) : !touchActive;
        const t = now / 1000;
        const range = PARAMS.IDLE_WEIGHT_MAX - PARAMS.IDLE_WEIGHT_MIN;

        // 읽기 페이즈: 레이아웃 읽기를 먼저 몰아서 강제 리플로우를 프레임당 1회로 제한
        const rects = idle ? null : heroChars.map((c) => c.getBoundingClientRect());

        // 쓰기 페이즈
        heroChars.forEach((c, i) => {
            let target;
            if (idle) {
                // 좌→우로 흐르는 사인 웨이브 (절제된 400~650)
                const phase = (t / PARAMS.IDLE_PERIOD) * Math.PI * 2 - i * 0.55;
                target = PARAMS.IDLE_WEIGHT_MIN + ((Math.sin(phase) + 1) / 2) * range;
            } else {
                // 커서 근접 보간: 400 → 800
                const r = rects[i];
                const dx = mouse.x - (r.left + r.width / 2);
                const dy = mouse.y - (r.top + r.height / 2);
                const d = Math.hypot(dx, dy);
                target = d < PARAMS.HERO_RADIUS
                    ? PARAMS.HOVER_WEIGHT_MIN + (1 - d / PARAMS.HERO_RADIUS) * (PARAMS.HOVER_WEIGHT_MAX - PARAMS.HOVER_WEIGHT_MIN)
                    : PARAMS.HOVER_WEIGHT_MIN;
            }
            const s = charState[i];
            s.w += (target - s.w) * PARAMS.HERO_LERP;
            // 변화가 미미하면 쓰기 생략 — 수렴 상태에서 스타일 무효화 방지
            if (Math.abs(s.w - s.applied) > 0.5) {
                s.applied = s.w;
                c.style.fontVariationSettings = `'wght' ${s.w.toFixed(1)}`;
            }
        });
    }

    // =====================================================
    // 히어로 — 로드 리빌 시퀀스
    // =====================================================
    function buildHeroReveal() {
        const tl = gsap.timeline({ onComplete: startKinetic });
        tl.from(mainChars.map(c => c), {
            yPercent: 110,
            duration: 0.9,
            ease: 'power4.out',
            stagger: 0.08,
        })
        .from(nameChars.map(c => c), {
            yPercent: 110,
            duration: 0.8,
            ease: 'power4.out',
            stagger: 0.03,
        }, 0.25)
        .to('.hero-subtitle', {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            startAt: { y: 24 },
        }, 0.3)
        .to('.scroll-indicator', {
            opacity: 1,
            duration: 0.6,
            onComplete() {
                gsap.to('.scroll-indicator', {
                    y: 8, duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
                });
            },
        }, 0.7);
        return tl;
    }

    function showHeroInstant() {
        gsap.set(heroChars, { yPercent: 0 });
        gsap.set(['.hero-subtitle', '.scroll-indicator'], { opacity: 1 });
        startKinetic();
    }

    // =====================================================
    // 인트로 오버레이 (세션당 1회, 곡선이 위로 걷힘)
    // =====================================================
    const overlay = document.getElementById('intro-overlay');
    const introPlayed = sessionStorage.getItem('laboe_intro_played') === '1';

    if (overlay && !introPlayed && !reducedMotion) {
        sessionStorage.setItem('laboe_intro_played', '1');
        if (lenis) lenis.stop();
        window.scrollTo(0, 0);

        const master = gsap.timeline();
        master.to(overlay, {
            y: '-114vh', // 100vh + 곡선 반경 여유
            duration: PARAMS.INTRO_DURATION,
            ease: 'power2.inOut',
            delay: 0.15,
            onComplete() {
                overlay.remove();
                if (lenis) lenis.start();
            },
        });
        // 오버레이 0.8s 완료 직후 타이포 리빌 시작 (사용자 지정 타이밍)
        master.add(buildHeroReveal(), '>');
    } else {
        if (overlay) overlay.remove();
        if (reducedMotion) showHeroInstant();
        else buildHeroReveal();
    }

    // =====================================================
    // 스크롤 진입 애니메이션 (명세 4)
    // =====================================================
    if (!reducedMotion) {
        gsap.utils.toArray('.section-title').forEach((el) => {
            gsap.from(el, {
                y: 20,
                opacity: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 85%', once: true },
            });
        });

        gsap.utils.toArray('.philosophy-content, .footer').forEach((el) => {
            gsap.from(el, {
                y: 24,
                opacity: 0,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 85%', once: true },
            });
        });

        document.querySelectorAll('.exhibition-list').forEach((ul) => {
            const rows = ul.querySelectorAll('li');
            gsap.set(rows, { y: 24, opacity: 0 });
            ScrollTrigger.batch(rows, {
                start: 'top 90%',
                once: true,
                onEnter: (batch) => gsap.to(batch, {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    ease: 'power3.out',
                    stagger: 0.05,
                    clearProps: 'all', // 완료 후 인라인 스타일 제거 → 호버 디밍과 충돌 방지
                }),
            });
        });
    }

    // =====================================================
    // 리스트 호버 프리뷰 + 행 상태 (명세 3)
    // =====================================================
    const preview = document.getElementById('hover-preview');
    const previewInner = preview ? preview.querySelector('.preview-inner') : null;
    const previewImg = document.getElementById('hover-preview-img');
    const viewBtn = preview ? preview.querySelector('.view-btn') : null;
    const cursorEl = document.getElementById('cursor');
    let previewActive = false;

    const previewPos = { x: 0, y: 0 };

    function showPreview(src) {
        if (!preview || !previewImg) return;
        if (previewImg.getAttribute('src') !== src) previewImg.setAttribute('src', src);
        if (!previewActive) {
            // 등장 시 현재 커서 위치에서 시작
            previewPos.x = mouse.x;
            previewPos.y = mouse.y;
        }
        previewActive = true;
        if (cursorEl) cursorEl.classList.add('is-hidden');
        gsap.to(previewInner, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out' });
        gsap.fromTo(viewBtn, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
    }

    function hidePreview() {
        if (!preview) return;
        previewActive = false;
        // 모바일에서는 터치 중일 때만 포인터 복귀 (터치가 끝났으면 숨김 유지)
        if (cursorEl && (isDesktop || touchActive)) cursorEl.classList.remove('is-hidden');
        gsap.to(previewInner, { opacity: 0, scale: 0.9, duration: 0.25, ease: 'power2.out' });
        gsap.to(viewBtn, { scale: 0, duration: 0.2, ease: 'power2.in' });
    }

    function clearRowStates() {
        document.querySelectorAll('.exhibition-list.is-dimmed').forEach((ul) => ul.classList.remove('is-dimmed'));
        document.querySelectorAll('.exhibition-list li.is-hovered').forEach((li) => li.classList.remove('is-hovered'));
        document.querySelectorAll('.exhibition-list li.is-armed').forEach((li) => li.classList.remove('is-armed'));
    }

    if (isDesktop) {
        document.querySelectorAll('.exhibition-list li').forEach((li) => {
            const link = li.querySelector('a');
            const dataImg = link ? link.getAttribute('data-img') : null;
            const firstImg = dataImg ? dataImg.split(',')[0].trim() : null;

            li.addEventListener('mouseenter', () => {
                const ul = li.closest('.exhibition-list');
                if (ul) ul.classList.add('is-dimmed');
                li.classList.add('is-hovered');
                if (firstImg) showPreview(firstImg);
            });

            li.addEventListener('mouseleave', () => {
                const ul = li.closest('.exhibition-list');
                if (ul) ul.classList.remove('is-dimmed');
                li.classList.remove('is-hovered');
                if (firstImg) hidePreview();
            });
        });
    }

    // =====================================================
    // 커스텀 커서 (명세 5)
    // =====================================================
    const cursorPos = { x: -9999, y: -9999 };

    if (isDesktop && cursorEl) {
        document.addEventListener('mouseover', (e) => {
            const interactive = e.target.closest('a, button');
            const inList = e.target.closest('.exhibition-list');
            cursorEl.classList.toggle('is-grown', !!interactive && !inList);
        });
        document.addEventListener('mouseleave', () => {
            cursorEl.classList.add('is-hidden');
        });
        document.addEventListener('mouseenter', () => {
            if (!previewActive) cursorEl.classList.remove('is-hidden');
        });
    }

    // =====================================================
    // 모바일: 손끝 추적 블루 포인터 + 드래그 중 근처 행 강조
    // =====================================================
    let lastTouchLi = null;

    function highlightRowAtPoint(x, y) {
        const el = document.elementFromPoint(x, y);
        const li = el ? el.closest('.exhibition-list li') : null;
        if (li === lastTouchLi) return;

        // 이전 행 강조 해제 (2단계 탭으로 고정된 행은 유지)
        if (lastTouchLi && !lastTouchLi.classList.contains('is-armed')) {
            lastTouchLi.classList.remove('is-hovered');
            const prevUl = lastTouchLi.closest('.exhibition-list');
            if (prevUl && !prevUl.querySelector('li.is-hovered')) prevUl.classList.remove('is-dimmed');
        }

        if (li) {
            li.classList.add('is-hovered');
            const ul = li.closest('.exhibition-list');
            if (ul) ul.classList.add('is-dimmed');
        }
        lastTouchLi = li;
    }

    if (!isDesktop && cursorEl) {
        cursorEl.classList.add('is-hidden'); // 터치 전엔 숨김

        const updateFromTouch = (e) => {
            const t = e.touches[0];
            if (!t) return;
            mouse.x = t.clientX;
            mouse.y = t.clientY;
            lastMouseMove = performance.now();
        };

        window.addEventListener('touchstart', (e) => {
            touchActive = true;
            updateFromTouch(e);
            // 포인터가 화면을 가로질러 날아오지 않게 터치 지점에서 시작
            cursorPos.x = mouse.x;
            cursorPos.y = mouse.y;
            cursorEl.style.transform = `translate3d(${mouse.x.toFixed(1)}px, ${mouse.y.toFixed(1)}px, 0)`;
            if (!previewActive) cursorEl.classList.remove('is-hidden');
            highlightRowAtPoint(mouse.x, mouse.y);
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            updateFromTouch(e);
            highlightRowAtPoint(mouse.x, mouse.y);
        }, { passive: true });

        const endTouch = () => {
            touchActive = false;
            cursorEl.classList.add('is-hidden');
            if (lastTouchLi && !lastTouchLi.classList.contains('is-armed')) {
                lastTouchLi.classList.remove('is-hovered');
                const ul = lastTouchLi.closest('.exhibition-list');
                if (ul && !ul.querySelector('li.is-hovered')) ul.classList.remove('is-dimmed');
            }
            lastTouchLi = null;
        };
        window.addEventListener('touchend', endTouch, { passive: true });
        window.addEventListener('touchcancel', endTouch, { passive: true });
    }

    // =====================================================
    // 통합 rAF 루프: 키네틱 + 프리뷰 추적 + 커서 추적
    // =====================================================
    function masterTick(now) {
        kineticTick(now);

        if (isDesktop && previewActive && preview) {
            previewPos.x += (mouse.x - previewPos.x) * PARAMS.PREVIEW_LERP;
            previewPos.y += (mouse.y - previewPos.y) * PARAMS.PREVIEW_LERP;
            preview.style.transform =
                `translate3d(${(previewPos.x - 170).toFixed(1)}px, ${(previewPos.y - 113).toFixed(1)}px, 0)`;
        }
        // 커서 도트: 데스크톱은 상시, 모바일은 터치 중에만 추적
        if (cursorEl && (isDesktop || touchActive)) {
            const dx = mouse.x - cursorPos.x;
            const dy = mouse.y - cursorPos.y;
            // 수렴 후에는 쓰기 생략 (포인터 정지 시 프레임당 스타일 갱신 방지)
            if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
                cursorPos.x += dx * PARAMS.CURSOR_LERP;
                cursorPos.y += dy * PARAMS.CURSOR_LERP;
                cursorEl.style.transform =
                    `translate3d(${cursorPos.x.toFixed(1)}px, ${cursorPos.y.toFixed(1)}px, 0)`;
            }
        }
        requestAnimationFrame(masterTick);
    }
    requestAnimationFrame(masterTick);

    // =====================================================
    // 이미지 모달 (ver01 로직 유지 + 정리)
    // =====================================================
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const closeBtn = document.querySelector('.close-modal');
    const modalYoutube = document.getElementById('modal-youtube');
    const modalPrev = document.getElementById('modal-prev');
    const modalNext = document.getElementById('modal-next');
    const indicatorsContainer = document.getElementById('modal-indicators');

    let currentImageArray = [];
    let currentImageIndex = 0;

    const updateModalImage = (index) => {
        if (modalImg && currentImageArray[index]) {
            modalImg.src = currentImageArray[index].trim();
        }
        if (currentImageArray.length > 1) {
            document.querySelectorAll('.indicator-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
    };

    if (modalPrev && modalNext) {
        modalPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentImageArray.length > 1) {
                currentImageIndex = (currentImageIndex - 1 + currentImageArray.length) % currentImageArray.length;
                updateModalImage(currentImageIndex);
            }
        });
        modalNext.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentImageArray.length > 1) {
                currentImageIndex = (currentImageIndex + 1) % currentImageArray.length;
                updateModalImage(currentImageIndex);
            }
        });
    }

    if (modal && modalImg && closeBtn) {
        const openModalFromLink = (link) => {
            const dataImg = link.getAttribute('data-img');
            const fallbackImg = link.querySelector('img');
            const imgSrc = dataImg || (fallbackImg ? fallbackImg.getAttribute('src') : null);
            if (!imgSrc) return;

            currentImageArray = imgSrc.split(',').map((s) => s.trim()).filter(Boolean);
            currentImageIndex = 0;

            if (indicatorsContainer) {
                indicatorsContainer.innerHTML = '';
                if (currentImageArray.length > 1) {
                    currentImageArray.forEach((_, i) => {
                        const dot = document.createElement('div');
                        dot.className = 'indicator-dot';
                        if (i === 0) dot.classList.add('active');
                        dot.addEventListener('click', (evt) => {
                            evt.stopPropagation();
                            currentImageIndex = i;
                            updateModalImage(currentImageIndex);
                        });
                        indicatorsContainer.appendChild(dot);
                    });
                    if (modalPrev) modalPrev.style.display = 'block';
                    if (modalNext) modalNext.style.display = 'block';
                } else {
                    if (modalPrev) modalPrev.style.display = 'none';
                    if (modalNext) modalNext.style.display = 'none';
                }
            }

            updateModalImage(currentImageIndex);

            const youtubeUrl = link.getAttribute('data-youtube');
            if (youtubeUrl && modalYoutube) {
                modalYoutube.href = youtubeUrl;
                modalYoutube.style.display = 'inline-block';
            } else if (modalYoutube) {
                modalYoutube.style.display = 'none';
                modalYoutube.href = '#';
            }

            // 프리뷰/행 상태 정리 후 모달 오픈
            hidePreview();
            clearRowStates();
            modal.classList.add('show');
            if (lenis) lenis.stop();
        };

        // ---- 모바일 2단계 탭: 첫 탭 = 프리뷰 표시, 같은 행 재탭 = 모달 오픈 ----
        let armedLi = null;
        let armedLink = null;

        const clearArmed = () => {
            if (!armedLi) return;
            armedLi.classList.remove('is-hovered');
            armedLi.classList.remove('is-armed');
            const ul = armedLi.closest('.exhibition-list');
            if (ul) ul.classList.remove('is-dimmed');
            armedLi = null;
            armedLink = null;
            hidePreview();
        };

        // 탭한 행 바로 아래(공간 없으면 위)에 프리뷰 고정 배치
        const showPreviewAtRow = (li, src) => {
            if (!preview || !previewImg) return;
            if (previewImg.getAttribute('src') !== src) previewImg.setAttribute('src', src);
            const rect = li.getBoundingClientRect();
            const pw = preview.offsetWidth;
            const ph = preview.offsetHeight;
            const x = Math.max(12, (window.innerWidth - pw) / 2);
            let y = rect.bottom + 12;
            if (y + ph > window.innerHeight - 12) y = Math.max(12, rect.top - ph - 12);
            preview.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            previewActive = true;
            gsap.to(previewInner, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out' });
            gsap.fromTo(viewBtn, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
        };

        document.querySelectorAll('.exhibition-list li a').forEach((link) => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href') !== '#') return;
                e.preventDefault();

                const dataImg = link.getAttribute('data-img');
                if (!isDesktop && dataImg) {
                    const li = link.closest('li');
                    if (armedLi !== li) {
                        // 첫 탭: 행 강조 + 프리뷰
                        clearArmed();
                        armedLi = li;
                        armedLink = link;
                        li.classList.add('is-hovered');
                        li.classList.add('is-armed');
                        const ul = li.closest('.exhibition-list');
                        if (ul) ul.classList.add('is-dimmed');
                        showPreviewAtRow(li, dataImg.split(',')[0].trim());
                        return;
                    }
                    // 같은 행 두 번째 탭: 모달
                    clearArmed();
                }
                openModalFromLink(link);
            });
        });

        // 프리뷰 자체를 탭해도 모달 오픈
        if (preview) {
            preview.addEventListener('click', () => {
                if (isDesktop || !armedLink) return;
                const link = armedLink;
                clearArmed();
                openModalFromLink(link);
            });
        }

        // 리스트 밖 탭 또는 스크롤 시 프리뷰 해제
        document.addEventListener('click', (e) => {
            if (isDesktop || !armedLi) return;
            if (!e.target.closest('.exhibition-list li') && !e.target.closest('#hover-preview')) clearArmed();
        });
        window.addEventListener('scroll', () => {
            if (!isDesktop) clearArmed();
        }, { passive: true });

        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modalImg) modalImg.src = '';
                if (indicatorsContainer) indicatorsContainer.innerHTML = '';
                if (modalYoutube) modalYoutube.style.display = 'none';
                if (modalPrev) modalPrev.style.display = 'none';
                if (modalNext) modalNext.style.display = 'none';
                currentImageArray = [];
                currentImageIndex = 0;
            }, 350);
            if (lenis) lenis.start();
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (
                e.target === modal ||
                (e.target.closest('.modal-body-wrapper') === null &&
                    !closeBtn.contains(e.target) &&
                    !e.target.classList.contains('indicator-dot') &&
                    !e.target.closest('.modal-nav'))
            ) {
                closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!modal.classList.contains('show')) return;
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft' && modalPrev) modalPrev.click();
            if (e.key === 'ArrowRight' && modalNext) modalNext.click();
        });

        const wrapper = document.querySelector('.modal-body-wrapper');
        if (wrapper) wrapper.addEventListener('click', (e) => e.stopPropagation());
    }
});
