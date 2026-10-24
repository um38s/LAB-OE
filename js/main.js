/* =========================================================
   LAB-OE Portfolio ver02 — main.js
   구성: 튜닝 파라미터 / 테마 토글(원형 전환) / 인트로 오버레이 /
        히어로 키네틱 타이포 / Lenis+ScrollTrigger /
        대표작 영상 / 섹션 진행 표시 / 리스트 호버 프리뷰 /
        커스텀 커서 / 이미지 모달(제자리 확대·스와이프) / 푸터
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
    HERO_PULL: 0.04,      // 히어로 글자가 커서 쪽으로 끌리는 최대 거리 = 글자 높이 × 이 값
    OUT_WEIGHT: 200,      // 히어로를 스크롤로 벗어날 때 글자가 가늘어지는 끝 웨이트
    PREVIEW_TILT: 0.05,   // 호버 프리뷰 기울기: 추적 지연 거리(px) × 이 값 = 각도(°)
    PREVIEW_TILT_MAX: 7,  // 호버 프리뷰 최대 기울기(°)
    MAGNET: 0.3,          // 푸터 이메일 버튼이 커서 쪽으로 끌려가는 비율
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
    const applyTheme = (next) => {
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { /* 저장 불가(사생활 보호 모드 등)여도 전환은 진행 */ }
        // 모바일 브라우저 상단 UI 색 동기화 (초기값은 head 인라인 스크립트가 설정)
        const meta = document.getElementById('meta-theme-color');
        if (meta) meta.setAttribute('content', next === 'dark' ? '#141414' : '#F5F4F0');
    };

    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        // View Transitions 미지원·모션 최소화: 기존처럼 색만 부드럽게 전환
        if (!document.startViewTransition || reducedMotion) {
            applyTheme(next);
            return;
        }
        // 토글 버튼에서 새 테마가 빛처럼 원형으로 번져 나감
        const r = themeToggle.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        const root = document.documentElement;
        root.classList.add('theme-switching'); // 스냅샷이 색 전환 중간값으로 찍히지 않게 transition 정지
        const vt = document.startViewTransition(() => applyTheme(next));
        vt.ready.then(() => {
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
                { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
            );
        }).catch(() => {});
        vt.finished.finally(() => root.classList.remove('theme-switching'));
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
    // 푸터 서울 현재 시각 (GSAP과 무관 — CDN 실패해도 동작)
    const timeEl = document.getElementById('local-time');
    if (timeEl) {
        const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
        const tickTime = () => { timeEl.textContent = fmt.format(new Date()); };
        tickTime();
        setInterval(tickTime, 15000);
    }

    // 섹션 제목 밑줄을 그어진 상태로 즉시 표시 (모션 없음 경로 공용)
    const drawAllTitles = () => document.querySelectorAll('.section-title').forEach((el) => el.classList.add('is-drawn'));

    // CDN 로드 실패 시에도 콘텐츠는 보여야 함 — 오버레이 제거 + 히어로 즉시 표시 후 종료
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        const ov = document.getElementById('intro-overlay');
        if (ov) ov.remove();
        const title = document.querySelector('.hero-title');
        if (title) title.classList.add('is-split', 'is-revealed');
        document.querySelectorAll('.hero-subtitle, .scroll-indicator').forEach((el) => {
            el.style.opacity = 1;
        });
        drawAllTitles();
        return;
    }
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
    const charState = heroChars.map(() => ({
        w: PARAMS.HOVER_WEIGHT_MIN + 30, applied: PARAMS.HOVER_WEIGHT_MIN + 30,
        x: 0, y: 0, ax: 0, ay: 0, // 커서 쪽으로 끌리는 이동량(px)과 마지막으로 쓴 값
    }));
    let kineticOn = false;
    let heroVisible = true;
    let heroOut = 0; // 히어로를 스크롤로 벗어난 정도 0~1 (가늘어지며 사라짐)

    if (heroTitle && 'IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            heroVisible = entries[0].isIntersecting;
        }).observe(heroTitle);
    }

    function startKinetic() {
        // 리빌 완료 표시 후 키네틱 웨이트 시작
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

        // 읽기 페이즈: 레이아웃 읽기를 먼저 몰아서 강제 리플로우를 프레임당 1회로 제한.
        // 글자 자체는 끌림으로 움직이므로 위치는 움직이지 않는 바깥 마스크에서 잼
        const rects = idle ? null : heroChars.map((c) => c.parentElement.getBoundingClientRect());

        // 쓰기 페이즈
        heroChars.forEach((c, i) => {
            let target;
            let tx = 0;
            let ty = 0;
            if (idle) {
                // 좌→우로 흐르는 사인 웨이브 (절제된 400~650)
                const phase = (t / PARAMS.IDLE_PERIOD) * Math.PI * 2 - i * 0.55;
                target = PARAMS.IDLE_WEIGHT_MIN + ((Math.sin(phase) + 1) / 2) * range;
            } else {
                // 커서 근접 보간: 400 → 800, 가까울수록 글자가 커서 쪽으로 살짝 기움(자석)
                const r = rects[i];
                const dx = mouse.x - (r.left + r.width / 2);
                const dy = mouse.y - (r.top + r.height / 2);
                const d = Math.hypot(dx, dy);
                if (d < PARAMS.HERO_RADIUS) {
                    const k = 1 - d / PARAMS.HERO_RADIUS;
                    target = PARAMS.HOVER_WEIGHT_MIN + k * (PARAMS.HOVER_WEIGHT_MAX - PARAMS.HOVER_WEIGHT_MIN);
                    const pull = k * k * r.height * PARAMS.HERO_PULL;
                    tx = (dx / (d || 1)) * pull;
                    ty = (dy / (d || 1)) * pull;
                } else {
                    target = PARAMS.HOVER_WEIGHT_MIN;
                }
            }
            const s = charState[i];
            s.w += (target - s.w) * PARAMS.HERO_LERP;
            s.x += (tx - s.x) * PARAMS.HERO_LERP;
            s.y += (ty - s.y) * PARAMS.HERO_LERP;
            // 스크롤로 벗어날수록 가늘게 (변수 폰트 웨이트로 '증발'하듯)
            const w = s.w + (PARAMS.OUT_WEIGHT - s.w) * heroOut;
            // 변화가 미미하면 쓰기 생략 — 수렴 상태에서 스타일 무효화 방지
            if (Math.abs(w - s.applied) > 0.5) {
                s.applied = w;
                c.style.fontVariationSettings = `'wght' ${w.toFixed(1)}`;
            }
            if (Math.abs(s.x - s.ax) > 0.05 || Math.abs(s.y - s.ay) > 0.05) {
                s.ax = s.x;
                s.ay = s.y;
                c.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
            }
        });
    }

    // =====================================================
    // 히어로 — 로드 리빌 시퀀스
    // =====================================================
    function buildHeroReveal() {
        // 키노트식 소프트 블러 인: 글자마다 흐릿하게 아래에서 떠올라 초점이 맞음 (순서대로)
        const tl = gsap.timeline({ onComplete: startKinetic });
        tl.from(mainChars, {
            yPercent: 28,
            opacity: 0,
            filter: 'blur(14px)',
            duration: 1.1,
            ease: 'power3.out',
            stagger: 0.07,
            clearProps: 'filter,opacity,transform',
        })
        .from(nameChars, {
            yPercent: 24,
            opacity: 0,
            filter: 'blur(10px)',
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.025,
            clearProps: 'filter,opacity,transform',
        }, 0.35)
        .to('.hero-subtitle', {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.9,
            ease: 'power3.out',
            startAt: { y: 16, filter: 'blur(6px)' },
            clearProps: 'filter',
        }, 0.6)
        .to('.scroll-indicator', {
            opacity: 1,
            duration: 0.6,
            onComplete() {
                indicatorTween = gsap.to('.scroll-indicator', {
                    y: 8, duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
                });
            },
        }, 0.7);
        return tl;
    }

    // 화면 밖 요소의 무한 애니메이션 일시정지 (보이는 결과 동일, 유휴 비용 절약)
    let indicatorTween = null;
    if ('IntersectionObserver' in window) {
        const indicator = document.querySelector('.scroll-indicator');
        if (indicator) {
            new IntersectionObserver((entries) => {
                if (!indicatorTween) return;
                if (entries[0].isIntersecting) indicatorTween.play();
                else indicatorTween.pause();
            }).observe(indicator);
        }
        const diagram = document.querySelector('.philosophy-diagram');
        if (diagram) {
            new IntersectionObserver((entries) => {
                diagram.classList.toggle('is-offscreen', !entries[0].isIntersecting);
            }).observe(diagram);
        }
    }

    function showHeroInstant() {
        gsap.set(heroChars, { yPercent: 0 });
        gsap.set(['.hero-subtitle', '.scroll-indicator'], { opacity: 1 });
        startKinetic();
    }

    // =====================================================
    // 인트로 오버레이 (매 로드마다, 곡선이 위로 걷힘)
    // =====================================================
    const overlay = document.getElementById('intro-overlay');

    // 인트로는 매 로드마다 재생 (모션 최소화 설정 시에만 생략)
    if (overlay && !reducedMotion) {
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
    if (reducedMotion) drawAllTitles();
    if (!reducedMotion) {
        // 히어로를 벗어날 때(스크롤에 묶임, 애플 제품 페이지식 물러남): 다음 장면이 올라오는 동안
        // 제목 덩어리는 살짝 작아지며 초점이 흐려지고, 글자는 가늘어지며(kineticTick의 heroOut) 사라짐
        if (heroTitle) {
            const outro = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 };
            // SCROLL 안내는 스크롤을 시작하자마자 사라짐 (요소 자체는 로드 리빌·위아래 흔들림이 쓰므로 자식에 적용)
            const indicatorKids = gsap.utils.toArray('.scroll-indicator > *');
            ScrollTrigger.create({
                ...outro,
                onUpdate: (self) => {
                    heroOut = self.progress;
                    const o = String(Math.max(0, 1 - self.progress * 5));
                    indicatorKids.forEach((el) => { el.style.opacity = o; });
                },
            });
            // 제목은 스크롤의 절반 속도로만 올라가 화면에 머무는 동안 물러나고(깊이감), 다음 장면이 그 위로 올라옴.
            // 흐림·투명은 처음엔 천천히, 뒤로 갈수록 빠르게(power2.in) — 처음 몇 px 스크롤로 글자가 흐려지지 않게
            gsap.timeline({ scrollTrigger: { ...outro, invalidateOnRefresh: true } })
                .to('.hero-content', { y: () => window.innerHeight * 0.5, ease: 'none', duration: 1 }, 0)
                .to('.hero-content', {
                    scale: 0.9,
                    opacity: 0,
                    filter: 'blur(12px)',
                    transformOrigin: 'left center',
                    ease: 'power2.in',
                    duration: 0.8,
                }, 0);
        }

        // 섹션 제목: 가는 밑줄이 왼쪽에서 그어지고(CSS 전환) 제목은 아래에서 올라옴
        gsap.utils.toArray('.section-title').forEach((el) => {
            gsap.from(el, {
                y: 14,
                opacity: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    once: true,
                    onEnter: () => el.classList.add('is-drawn'),
                },
            });
        });

        gsap.utils.toArray('.philosophy-content, .statement-line, .footer').forEach((el) => {
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
    // 대표작: 살짝 작은 틀 → 리스트 폭으로 열림(스크롤 연동) + 보일 때만 영상 재생
    // =====================================================
    const works = gsap.utils.toArray('.work');
    // 모달이 열려 있는 동안 영상 정지 → 닫으면 화면에 보이던 것만 다시 재생 (모달 코드에서 호출)
    let pauseWorkVideos = () => {};
    let resumeWorkVideos = () => {};
    if (works.length) {
        if (!reducedMotion) {
            works.forEach((work) => {
                const media = work.querySelector('.work-media');
                const video = work.querySelector('.work-video');
                const caption = work.querySelector('.work-caption');
                gsap.fromTo(media,
                    { clipPath: 'inset(6% 6% 6% 6% round 6px)' },
                    {
                        clipPath: 'inset(0% 0% 0% 0% round 0px)',
                        ease: 'none',
                        scrollTrigger: { trigger: media, start: 'top 90%', end: 'center 60%', scrub: 0.6 },
                    });
                // 열리는 동안 영상은 살짝 줌아웃 — 틀과 내용이 다른 속도로 움직이는 깊이감
                // (확대는 8%까지만: 1080p 원본이 흐려지지 않게)
                if (video) {
                    gsap.fromTo(video, { scale: 1.08 }, {
                        scale: 1,
                        ease: 'none',
                        scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
                    });
                }
                if (caption) {
                    gsap.from(caption, {
                        y: 20,
                        opacity: 0,
                        duration: 0.8,
                        ease: 'power3.out',
                        scrollTrigger: { trigger: caption, start: 'top 92%', once: true },
                    });
                }
            });
        }

        // 모션 최소화 설정이면 자동 재생 없이 포스터만 (영상 파일도 받지 않음)
        const videos = works.map((w) => w.querySelector('.work-video')).filter(Boolean);
        if (!reducedMotion && 'IntersectionObserver' in window) {
            // 폰(정사각 틀)은 가운데 정사각만 담은 900px 경량본
            const useMobileSrc = window.matchMedia('(max-width: 768px)').matches;
            const loadVideo = (v) => {
                const src = (useMobileSrc && v.dataset.srcM) || v.dataset.src;
                if (!v.getAttribute('src') && src) {
                    v.preload = 'auto';
                    v.src = src;
                }
            };
            // 화면 600px 앞에서 미리 받기 — 멀리 있는 영상은 받지 않음
            const loader = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    loadVideo(e.target);
                    loader.unobserve(e.target);
                });
            }, { rootMargin: '600px 0px' });
            // 보일 때만 재생, 벗어나면 정지 (배터리·GPU 절약)
            let modalOpen = false;
            const playVideo = (v) => {
                loadVideo(v);
                const p = v.play();
                if (p) p.catch(() => {});
            };
            const player = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    const v = e.target;
                    v.dataset.inView = e.isIntersecting ? '1' : '0';
                    if (e.isIntersecting && !modalOpen) playVideo(v);
                    else v.pause();
                });
            }, { threshold: 0.15 });
            pauseWorkVideos = () => {
                modalOpen = true;
                videos.forEach((v) => v.pause());
            };
            resumeWorkVideos = () => {
                modalOpen = false;
                videos.forEach((v) => { if (v.dataset.inView === '1') playVideo(v); });
            };
            videos.forEach((v) => {
                loader.observe(v);
                player.observe(v);
            });
        }
    }

    // =====================================================
    // 섹션 진행 표시 (데스크톱 왼쪽 아래): "03 / 07  MEDIA ART EXHIBITIONS"
    // 히어로를 지나면 나타나고 푸터에 닿으면 사라짐. 번호는 위/아래로 굴러 바뀜
    // =====================================================
    const progressEl = document.querySelector('.section-progress');
    const progressSections = gsap.utils.toArray('.section-title').map((t) => t.closest('section')).filter(Boolean);
    if (progressEl && progressSections.length && isDesktop) {
        const curEl = progressEl.querySelector('.sp-cur');
        const totalEl = progressEl.querySelector('.sp-total');
        const nameEl = progressEl.querySelector('.sp-name');
        const pad = (n) => String(n).padStart(2, '0');
        const names = progressSections.map((s) => s.querySelector('.section-title').textContent.trim());
        let activeIdx = -1;
        totalEl.textContent = pad(progressSections.length);

        const setActive = (i) => {
            if (i === activeIdx) return;
            const dir = i > activeIdx ? 1 : -1;
            activeIdx = i;
            curEl.textContent = pad(i + 1);
            nameEl.textContent = names[i];
            if (!reducedMotion) {
                gsap.fromTo(curEl, { xPercent: -100 * dir, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out', overwrite: true });
                gsap.fromTo(nameEl, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', overwrite: true });
            }
        };

        progressSections.forEach((sec, i) => {
            ScrollTrigger.create({
                trigger: sec,
                start: 'top 55%',
                end: 'bottom 55%',
                onToggle: (self) => { if (self.isActive) setActive(i); },
            });
        });
        const footerEl = document.querySelector('.footer');
        ScrollTrigger.create({
            trigger: progressSections[0],
            start: 'top 80%',
            endTrigger: footerEl || progressSections[progressSections.length - 1],
            end: footerEl ? 'top 85%' : 'bottom 55%',
            onToggle: (self) => progressEl.classList.toggle('is-visible', self.isActive),
        });
    }

    // =====================================================
    // 씬 스냅: 히어로 ↔ 철학(스테이트먼트 포함) 두 장면만 스냅.
    // 철학 장면을 지나 리스트 구간부터는 자유 스크롤.
    // =====================================================
    const philSection = document.querySelector('.section-philosophy');
    if (philSection && !reducedMotion) {
        const SNAP = {
            DELAY: 140,      // 스크롤 멈춤 감지 대기(ms)
            DURATION: 1.0,   // 스냅 이동 시간(s)
            OFFSET: 110,     // 철학 섹션 타이틀 상단 여백(px)
            EPSILON: 4,      // 이미 정착한 것으로 보는 오차(px)
            BIAS: 0.2,       // 진행 방향으로 20%만 넘어가면 다음 장면으로
        };
        let snapTimer = null;
        let snapping = false;
        let lastY = window.scrollY;
        let dirDown = true;

        const philY = () => Math.max(0, philSection.offsetTop - SNAP.OFFSET);

        const scrollToY = (y) => {
            snapping = true;
            if (lenis) {
                // lock 없음 — 스냅 이동 중에도 휠/터치 입력이 즉시 가로챌 수 있게 (인터럽트 가능)
                lenis.scrollTo(y, {
                    duration: SNAP.DURATION,
                    easing: (t) => 1 - Math.pow(1 - t, 3),
                    onComplete: () => { snapping = false; },
                });
                // onComplete 미발화 대비 안전 해제
                setTimeout(() => { snapping = false; }, SNAP.DURATION * 1000 + 300);
            } else {
                window.scrollTo({ top: y, behavior: 'smooth' });
                setTimeout(() => { snapping = false; }, 700);
            }
        };

        // 스냅 중 사용자 입력이 들어오면 스냅 상태 즉시 해제 —
        // 입력이 끝나고 멈춘 지점에서 스냅 판정이 새로 이뤄짐
        const cancelSnap = () => { snapping = false; };
        window.addEventListener('wheel', cancelSnap, { passive: true });
        window.addEventListener('touchstart', cancelSnap, { passive: true });

        const trySnap = () => {
            if (snapping) return;
            const y = window.scrollY;
            const p = philY();
            // 철학 장면을 지나면(리스트 구간) 스냅 없음
            if (y > p + SNAP.EPSILON) return;
            // 이미 장면에 정착한 상태면 무시
            if (y <= SNAP.EPSILON || Math.abs(y - p) <= SNAP.EPSILON) return;
            // 진행 방향 쪽으로 BIAS만큼 넘었으면 다음 장면, 아니면 원래 장면 유지
            const target = dirDown
                ? (y > p * SNAP.BIAS ? p : 0)
                : (y < p * (1 - SNAP.BIAS) ? 0 : p);
            scrollToY(target);
        };

        const onScroll = () => {
            const y = window.scrollY;
            if (Math.abs(y - lastY) > 0.5) dirDown = y > lastY;
            lastY = y;
            if (snapping) return;
            clearTimeout(snapTimer);
            snapTimer = setTimeout(trySnap, SNAP.DELAY);
        };

        if (lenis) lenis.on('scroll', onScroll);
        else window.addEventListener('scroll', onScroll, { passive: true });
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

    // 프리뷰 축소본 경로: img/a.png → img/thumbs/a.webp (원본은 모달에서만 로드)
    function thumbSrc(src) {
        return src.replace(/^img\//, 'img/thumbs/').replace(/\.[A-Za-z]+$/, '.webp');
    }

    function showPreview(src) {
        if (!preview || !previewImg) return;
        if (previewImg.getAttribute('src') !== src) {
            // 이미 떠 있는 프리뷰에서 행만 바뀌면 새 사진이 아래에서 커튼처럼 올라오며 교체
            const swapping = !reducedMotion && gsap.getProperty(previewInner, 'opacity') > 0.2;
            previewImg.setAttribute('src', src);
            if (swapping) {
                gsap.fromTo(previewImg, { clipPath: 'inset(100% 0% 0% 0%)' }, {
                    clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: 'power3.out', overwrite: true,
                });
            }
        }
        if (!previewActive) {
            // 등장 시 현재 커서 위치에서 시작
            previewPos.x = mouse.x;
            previewPos.y = mouse.y;
        }
        previewActive = true;
        if (cursorEl) cursorEl.classList.add('is-hidden');
        gsap.to(previewInner, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out', overwrite: true });
        gsap.fromTo(viewBtn, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(1.4)', overwrite: true });
    }

    function hidePreview() {
        if (!preview) return;
        previewActive = false;
        // 모바일에서는 터치 중일 때만 포인터 복귀 (터치가 끝났으면 숨김 유지)
        if (cursorEl && (isDesktop || touchActive)) cursorEl.classList.remove('is-hidden');
        // overwrite: 빠르게 들어왔다 나가면 먼저 시작한 '나타나기'가 나중에 끝나 프리뷰가 남던 문제 방지
        gsap.to(previewInner, { opacity: 0, scale: 0.9, duration: 0.25, ease: 'power2.out', overwrite: true });
        gsap.to(viewBtn, { scale: 0, duration: 0.2, ease: 'power2.in', overwrite: true });
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
                if (firstImg) showPreview(thumbSrc(firstImg));
            });

            li.addEventListener('mouseleave', () => {
                const ul = li.closest('.exhibition-list');
                if (ul) ul.classList.remove('is-dimmed');
                li.classList.remove('is-hovered');
                if (firstImg) hidePreview();
            });
        });

        // 커서는 가만히 있고 화면만 스크롤되면 mouseleave가 늦거나 안 옴 →
        // 스크롤할 때 커서 아래가 여전히 그 행인지 확인해, 벗어났으면 프리뷰·행 강조를 정리
        let scrollCheckQueued = false;
        const checkRowUnderCursor = () => {
            scrollCheckQueued = false;
            const hovered = document.querySelector('.exhibition-list li.is-hovered');
            if (!hovered && !previewActive) return;
            const el = document.elementFromPoint(mouse.x, mouse.y);
            const li = el ? el.closest('.exhibition-list li') : null;
            if (!li || li !== hovered) {
                hidePreview();
                clearRowStates();
            }
        };
        const onScrollCheck = () => {
            if (scrollCheckQueued) return;
            scrollCheckQueued = true;
            requestAnimationFrame(checkRowUnderCursor);
        };
        if (lenis) lenis.on('scroll', onScrollCheck);
        else window.addEventListener('scroll', onScrollCheck, { passive: true });
    }

    // =====================================================
    // 커스텀 커서 (명세 5)
    // =====================================================
    const cursorPos = { x: -9999, y: -9999 };

    if (isDesktop && cursorEl) {
        document.addEventListener('mouseover', (e) => {
            const interactive = e.target.closest('a, button');
            const inList = e.target.closest('.exhibition-list');
            const onWork = e.target.closest('.work-link'); // 대표작 영상 위: "View" 원형 커서
            cursorEl.classList.toggle('is-label', !!onWork);
            cursorEl.classList.toggle('is-grown', !!interactive && !inList && !onWork);
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
    let previewTilt = 0;

    function masterTick(now) {
        kineticTick(now);

        if (isDesktop && previewActive && preview) {
            previewPos.x += (mouse.x - previewPos.x) * PARAMS.PREVIEW_LERP;
            previewPos.y += (mouse.y - previewPos.y) * PARAMS.PREVIEW_LERP;
            // 커서를 빨리 움직일수록(추적 지연 거리가 클수록) 진행 방향으로 살짝 기울어짐
            const tiltTarget = reducedMotion ? 0 : Math.max(-PARAMS.PREVIEW_TILT_MAX,
                Math.min(PARAMS.PREVIEW_TILT_MAX, (mouse.x - previewPos.x) * PARAMS.PREVIEW_TILT));
            previewTilt += (tiltTarget - previewTilt) * 0.12;
            preview.style.transform =
                `translate3d(${(previewPos.x - 170).toFixed(1)}px, ${(previewPos.y - 113).toFixed(1)}px, 0) rotate(${previewTilt.toFixed(2)}deg)`;
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
    let lastFocusedEl = null; // 모달 닫을 때 포커스 복귀 지점

    // 크기를 알 수 있을 때(디코드 후) 애니메이션 시작
    const whenImageReady = (fn) => {
        if (!modalImg) return;
        if (modalImg.complete && modalImg.naturalWidth) fn();
        else if (modalImg.decode) modalImg.decode().then(fn, fn);
        else modalImg.addEventListener('load', fn, { once: true });
    };

    // 표시 크기를 사진 비율로 직접 정함 — 축소본(680px)에서 원본으로 바꿔 끼워도 크기가 튀지 않게
    const fitModalImage = () => {
        if (!modalImg || !modalImg.naturalWidth) return;
        modalImg.style.width = '';
        modalImg.style.height = '';
        const cs = getComputedStyle(modalImg);
        const maxW = parseFloat(cs.maxWidth) || window.innerWidth * 0.78;
        const maxH = parseFloat(cs.maxHeight) || window.innerHeight * 0.7;
        const ar = modalImg.naturalWidth / modalImg.naturalHeight;
        const w = Math.min(maxW, maxH * ar);
        modalImg.style.width = `${w.toFixed(1)}px`;
        modalImg.style.height = `${(w / ar).toFixed(1)}px`;
    };
    window.addEventListener('resize', () => {
        if (modal && modal.classList.contains('show')) fitModalImage();
    }, { passive: true });

    // 원본은 수 MB~17MB라 디코드가 늦음 → 축소본을 바로 띄워 애니메이션을 시작하고,
    // 원본이 준비되면 같은 자리에서 바꿔 끼움 (그 사이 다른 사진으로 넘어갔으면 무시)
    let fullLoadToken = 0;
    const loadFullImage = (full) => {
        const token = ++fullLoadToken;
        const loader = new Image();
        loader.src = full;
        const swap = () => {
            if (token === fullLoadToken && modal && modal.classList.contains('show')) modalImg.src = full;
        };
        if (loader.decode) loader.decode().then(swap, () => {});
        else loader.onload = swap;
    };

    // dir: 1 = 다음(오른쪽에서 들어옴), -1 = 이전, 0 = 애니메이션 없이 교체
    const updateModalImage = (index, dir = 0) => {
        if (modalImg && currentImageArray[index]) {
            const full = currentImageArray[index].trim();
            modalImg.src = thumbSrc(full);
            loadFullImage(full);
            if (dir && !reducedMotion) {
                gsap.set(modalImg, { opacity: 0 });
                whenImageReady(() => {
                    fitModalImage();
                    gsap.fromTo(modalImg, { x: 48 * dir, opacity: 0 }, {
                        x: 0, y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out', overwrite: true,
                    });
                });
            } else {
                whenImageReady(fitModalImage);
            }
        }
        if (currentImageArray.length > 1) {
            document.querySelectorAll('.indicator-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
    };

    const stepImage = (dir) => {
        if (currentImageArray.length < 2) return;
        currentImageIndex = (currentImageIndex + dir + currentImageArray.length) % currentImageArray.length;
        updateModalImage(currentImageIndex, dir);
    };

    if (modalPrev && modalNext) {
        modalPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            stepImage(-1);
        });
        modalNext.addEventListener('click', (e) => {
            e.stopPropagation();
            stepImage(1);
        });
    }

    if (modal && modalImg && closeBtn) {
        // 모달 사진이 날아올 출발 위치: 대표작 영상 틀 또는 떠 있는 호버 프리뷰 (없으면 제자리에서 등장)
        const getOpenSourceRect = (link) => {
            const media = link.querySelector('.work-media');
            if (media) return media.getBoundingClientRect();
            if (previewImg && previewInner && gsap.getProperty(previewInner, 'opacity') > 0.2) {
                return previewImg.getBoundingClientRect();
            }
            return null;
        };

        // 클릭한 자리(프리뷰·영상)에서 사진이 화면 가운데로 커지며 자리 잡음
        const animateModalIn = (from) => {
            gsap.killTweensOf(modalImg);
            gsap.set(modalImg, { opacity: 0, x: 0, y: 0, scale: 1 });
            whenImageReady(() => {
                if (!modal.classList.contains('show')) return;
                fitModalImage();
                const to = modalImg.getBoundingClientRect();
                if (!from || reducedMotion || !to.width) {
                    gsap.fromTo(modalImg, { opacity: 0, scale: reducedMotion ? 1 : 0.97 }, {
                        opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out',
                    });
                    return;
                }
                const s = from.width / to.width;
                const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
                const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
                gsap.fromTo(modalImg, { x: dx, y: dy, scale: s, opacity: 1 }, {
                    x: 0, y: 0, scale: 1, duration: 0.75, ease: 'expo.out',
                });
            });
        };

        const openModalFromLink = (link) => {
            const dataImg = link.getAttribute('data-img');
            const fallbackImg = link.querySelector('img');
            const imgSrc = dataImg || (fallbackImg ? fallbackImg.getAttribute('src') : null);
            if (!imgSrc) return;
            const fromRect = getOpenSourceRect(link); // 프리뷰를 숨기기 전에 위치 기록
            gsap.set(modalImg, { opacity: 0 });

            currentImageArray = imgSrc.split(',').map((s) => s.trim()).filter(Boolean);
            currentImageIndex = 0;

            if (indicatorsContainer) {
                indicatorsContainer.innerHTML = '';
                if (currentImageArray.length > 1) {
                    currentImageArray.forEach((_, i) => {
                        const dot = document.createElement('button');
                        dot.type = 'button';
                        dot.className = 'indicator-dot';
                        dot.setAttribute('aria-label', `${i + 1}번째 이미지`);
                        if (i === 0) dot.classList.add('active');
                        dot.addEventListener('click', (evt) => {
                            evt.stopPropagation();
                            const dir = Math.sign(i - currentImageIndex);
                            currentImageIndex = i;
                            updateModalImage(currentImageIndex, dir);
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
            lastFocusedEl = document.activeElement;
            modal.classList.add('show');
            animateModalIn(fromRect);
            pauseWorkVideos();
            closeBtn.focus();
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
            gsap.to(previewInner, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.out', overwrite: true });
            gsap.fromTo(viewBtn, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(1.4)', overwrite: true });
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
                        showPreviewAtRow(li, thumbSrc(dataImg.split(',')[0].trim()));
                        return;
                    }
                    // 같은 행 두 번째 탭: 모달
                    clearArmed();
                }
                openModalFromLink(link);
            });
        });

        // 대표작 영상 클릭: 바로 모달 (리스트와 같은 이미지·유튜브 링크)
        document.querySelectorAll('.work-link').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
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
            modal.classList.remove('show', 'is-dragging');
            modal.style.opacity = ''; // 아래로 끌던 중 닫혀도 CSS 페이드가 이어지게
            if (!reducedMotion) gsap.to(modalImg, { scale: 0.96, duration: 0.35, ease: 'power2.out', overwrite: true });
            resumeWorkVideos();
            fullLoadToken++; // 아직 받는 중인 원본은 바꿔 끼우지 않음
            setTimeout(() => {
                gsap.set(modalImg, { clearProps: 'transform,opacity,width,height' });
                if (modalImg) modalImg.src = '';
                if (indicatorsContainer) indicatorsContainer.innerHTML = '';
                if (modalYoutube) modalYoutube.style.display = 'none';
                if (modalPrev) modalPrev.style.display = 'none';
                if (modalNext) modalNext.style.display = 'none';
                currentImageArray = [];
                currentImageIndex = 0;
            }, 350);
            if (lenis) lenis.start();
            // 모달을 연 리스트 행으로 포커스 복귀
            if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
            lastFocusedEl = null;
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
            // 포커스가 모달 밖으로 새지 않게 순환 (간단 포커스 트랩)
            if (e.key === 'Tab') {
                const focusables = Array.from(modal.querySelectorAll('button, a'))
                    .filter((el) => el.offsetParent !== null);
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        const wrapper = document.querySelector('.modal-body-wrapper');
        if (wrapper) wrapper.addEventListener('click', (e) => e.stopPropagation());

        // ---- 터치 스와이프: 좌우 = 이전/다음, 아래로 끌기 = 닫기 (손을 뗄 때까지 사진이 손끝을 따라옴) ----
        let swipe = null;
        modal.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1 || !modal.classList.contains('show')) return;
            const t = e.touches[0];
            swipe = { x0: t.clientX, y0: t.clientY, dx: 0, dy: 0, axis: null };
        }, { passive: true });

        modal.addEventListener('touchmove', (e) => {
            if (!swipe) return;
            const t = e.touches[0];
            swipe.dx = t.clientX - swipe.x0;
            swipe.dy = t.clientY - swipe.y0;
            if (!swipe.axis && Math.hypot(swipe.dx, swipe.dy) > 10) {
                swipe.axis = Math.abs(swipe.dx) > Math.abs(swipe.dy) ? 'x' : 'y';
                if (swipe.axis === 'y') modal.classList.add('is-dragging');
            }
            if (swipe.axis === 'y') {
                const d = Math.max(0, swipe.dy);
                gsap.set(modalImg, { y: d, scale: 1 - Math.min(d / 1500, 0.12) });
                modal.style.opacity = String(1 - Math.min(d / 700, 0.6));
            } else if (swipe.axis === 'x' && currentImageArray.length > 1) {
                gsap.set(modalImg, { x: swipe.dx * 0.6 });
            }
        }, { passive: true });

        const endSwipe = () => {
            if (!swipe) return;
            const { axis, dx, dy } = swipe;
            swipe = null;
            modal.classList.remove('is-dragging');
            if (axis === 'y') {
                if (dy > 90) {
                    closeModal();
                    return;
                }
                modal.style.opacity = '';
                gsap.to(modalImg, { y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.6)', overwrite: true });
            } else if (axis === 'x' && currentImageArray.length > 1) {
                if (Math.abs(dx) > 50) stepImage(dx < 0 ? 1 : -1);
                else gsap.to(modalImg, { x: 0, duration: 0.4, ease: 'back.out(1.6)', overwrite: true });
            }
        };
        modal.addEventListener('touchend', endSwipe, { passive: true });
        modal.addEventListener('touchcancel', endSwipe, { passive: true });
    }

    // =====================================================
    // 푸터 — 이메일 버튼이 커서 쪽으로 살짝 끌려옴 (데스크톱), 떠나면 탄성 있게 제자리
    // =====================================================
    const pill = document.querySelector('.contact-pill');
    if (pill && isDesktop && !reducedMotion) {
        const pillLabel = pill.querySelector('.contact-pill-label');
        pill.addEventListener('mousemove', (e) => {
            const r = pill.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height / 2);
            gsap.to(pill, { x: dx * PARAMS.MAGNET, y: dy * PARAMS.MAGNET * 1.2, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
            if (pillLabel) gsap.to(pillLabel, { x: dx * PARAMS.MAGNET * 0.4, y: dy * PARAMS.MAGNET * 0.5, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        });
        pill.addEventListener('mouseleave', () => {
            gsap.to([pill, pillLabel].filter(Boolean), { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
        });
    }
});
