// Theme Toggle Logic
const themeSwitch = document.getElementById('theme-switch');

// Initial toggle state based on data-theme attribute (already set in <head>)
if (themeSwitch && document.documentElement.getAttribute('data-theme') === 'light') {
    themeSwitch.checked = true;
}

if (themeSwitch) {
    themeSwitch.addEventListener('change', function(e) {
        const theme = e.target.checked ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        window.dispatchEvent(new Event('themeChanged'));
    });
}

// Lenis를 사용한 부드러운 스크롤 (관성 스크롤) 초기화
let lenis = null;
try {
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    function raf(time) {
        if (lenis) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
    }
    requestAnimationFrame(raf);
} catch (e) {
    console.warn("Lenis smooth scroll failed to initialize:", e);
}

// 애니메이션 세팅 (GSAP)
document.addEventListener("DOMContentLoaded", () => {
    // GSAP exists check
    if (typeof gsap === 'undefined') return;
    
    gsap.registerPlugin(ScrollTrigger);

    // 1. Hero 타이틀 등장 애니메이션
    gsap.from(".hero-title", {
        y: 80,
        opacity: 0,
        duration: 1.5,
        ease: "power4.out",
        delay: 0.2
    });

    gsap.from(".hero-subtitle", {
        y: 40,
        opacity: 0,
        duration: 1.5,
        ease: "power4.out",
        delay: 0.5
    });

    // 2. 스크롤할 때 나타나는(Fade-up) 컨텐츠 효과
    const sections = gsap.utils.toArray('section:not(.hero)');
    sections.forEach(section => {
        gsap.from(section, {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
                trigger: section,
                start: "top 80%",
                toggleActions: "play none none reverse"
            }
        });
    });

    // 3. Image Modal Interaction
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    const closeBtn = document.querySelector(".close-modal");
    const modalYoutube = document.getElementById("modal-youtube");

    if (modal && modalImg && closeBtn) {
        document.querySelectorAll(".exhibition-list li a").forEach(link => {
            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href");
                if (href === "#") {
                    e.preventDefault();
                    
                    const img = link.querySelector("img");
                    const dataImg = link.getAttribute("data-img");
                    const imgSrc = dataImg || (img ? img.getAttribute("src") : null);
                    
                    if (imgSrc) {
                        const imageArray = imgSrc.split(',').map(s => s.trim()).filter(s => s !== "");
                        let currentIndex = 0;
                        
                        const firstImage = imageArray[0].trim();
                        const fileName = firstImage.split('/').pop().split('.')[0];
                        modal.classList.add(`modal-${fileName}`);
                        
                        const updateModalImage = (index) => {
                            if (modalImg) modalImg.src = imageArray[index].trim();
                            if (imageArray.length > 1) {
                                document.querySelectorAll('.indicator-dot').forEach((dot, i) => {
                                    dot.classList.toggle('active', i === index);
                                });
                            }
                        };
                        
                        const indicatorsContainer = document.getElementById("modal-indicators");
                        if (indicatorsContainer) {
                            indicatorsContainer.innerHTML = '';
                            if (imageArray.length > 1) {
                                imageArray.forEach((_, i) => {
                                    const dot = document.createElement("div");
                                    dot.className = "indicator-dot";
                                    if (i === 0) dot.classList.add("active");
                                    dot.addEventListener("click", (evt) => {
                                        evt.stopPropagation();
                                        currentIndex = i;
                                        updateModalImage(currentIndex);
                                    });
                                    indicatorsContainer.appendChild(dot);
                                });
                            }
                        }
                        
                        updateModalImage(currentIndex);
                        
                        const youtubeUrl = link.getAttribute("data-youtube");
                        if (youtubeUrl && modalYoutube) {
                            modalYoutube.href = youtubeUrl;
                            modalYoutube.style.display = "inline-block";
                        } else if (modalYoutube) {
                            modalYoutube.style.display = "none";
                            modalYoutube.href = "#";
                        }
                        
                        modal.classList.add("show");
                        if (lenis) lenis.stop();
                    }
                }
            });
        });

        const closeModal = () => {
            modal.classList.remove("show");
            
            Array.from(modal.classList).forEach(cls => {
                if (cls.startsWith('modal-') && cls !== 'modal-body-wrapper') {
                    modal.classList.remove(cls);
                }
            });

            setTimeout(() => { 
                if (modalImg) modalImg.src = ""; 
                const indicatorsContainer = document.getElementById("modal-indicators");
                if (indicatorsContainer) indicatorsContainer.innerHTML = '';
                if (modalYoutube) modalYoutube.style.display = "none";
            }, 300);
            if (lenis) lenis.start();
        };

        closeBtn.addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal || (e.target.closest('.modal-body-wrapper') === null && e.target !== closeBtn && !closeBtn.contains(e.target) && !e.target.classList.contains('indicator-dot'))) {
                 closeModal();
            }
        });
        
        const wrapper = document.querySelector('.modal-body-wrapper');
        if (wrapper) {
            wrapper.addEventListener('click', (e) => e.stopPropagation());
        }
    }
});

// ====================================
// Modal Particle Background Animation
// ====================================
(function() {
    const canvas = document.getElementById('modal-particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles = [];
    let animationId = null;
    const PARTICLE_COUNT = 72;

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const isBright = Math.random() < 0.2;
            particles.push({
                x: Math.random() * (canvas.width || 800),
                y: Math.random() * (canvas.height || 600),
                radius: isBright ? Math.random() * 1.5 + 1.5 : Math.random() * 1.5 + 0.5,
                opacity: isBright ? Math.random() * 0.3 + 0.6 : Math.random() * 0.4 + 0.1,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                pulseSpeed: Math.random() * 0.01 + 0.005,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function drawParticles() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.phase += p.pulseSpeed;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            const pulse = Math.sin(p.phase) * 0.15 + 0.85;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            const colorStr = isLight ? `100, 100, 100` : `160, 160, 160`;
            ctx.fillStyle = `rgba(${colorStr}, ${p.opacity * pulse})`;
            ctx.fill();
        });
        animationId = requestAnimationFrame(drawParticles);
    }

    function startParticles() {
        resizeCanvas();
        createParticles();
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(drawParticles);
    }

    function stopParticles() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const modalEl = document.getElementById('image-modal');
    if (modalEl) {
        const observer = new MutationObserver(() => {
            if (modalEl.classList.contains('show')) startParticles();
            else stopParticles();
        });
        observer.observe(modalEl, { attributes: true, attributeFilter: ['class'] });
    }

    window.addEventListener('resize', () => {
        if (animationId) { resizeCanvas(); createParticles(); }
    });
})();

