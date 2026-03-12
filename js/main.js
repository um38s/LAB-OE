// Lenis를 사용한 부드러운 스크롤 (관성 스크롤) 초기화
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
})

function raf(time) {
    lenis.raf(time)
    requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

// 애니메이션 세팅 (GSAP)
document.addEventListener("DOMContentLoaded", () => {
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
                start: "top 80%", // 뷰포트의 80% 지점에 닿았을 때 실행
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
                // Determine if this is a click on a real link or an empty #
                const href = link.getAttribute("href");
                if (href === "#") {
                    e.preventDefault();
                    
                    const img = link.querySelector("img");
                    const dataImg = link.getAttribute("data-img");
                    const imgSrc = dataImg || (img ? img.getAttribute("src") : null);
                    
                    if (imgSrc) {
                        const imageArray = imgSrc.split(',');
                        let currentIndex = 0;
                        
                        // 전시별 고유 클래스 추가 (첫 번째 이미지 파일명 기준)
                        const firstImage = imageArray[0].trim();
                        const fileName = firstImage.split('/').pop().split('.')[0];
                        modal.classList.add(`modal-${fileName}`);
                        
                        const updateModalImage = (index) => {
                            modalImg.src = imageArray[index].trim();
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
                                        evt.stopPropagation(); // Prevent modal from closing
                                        currentIndex = i;
                                        updateModalImage(currentIndex);
                                    });
                                    indicatorsContainer.appendChild(dot);
                                });
                            }
                        }
                        
                        updateModalImage(currentIndex);
                        
                        // Check for YouTube link
                        const youtubeUrl = link.getAttribute("data-youtube");
                        if (youtubeUrl && modalYoutube) {
                            modalYoutube.href = youtubeUrl;
                            modalYoutube.style.display = "inline-block";
                        } else if (modalYoutube) {
                            modalYoutube.style.display = "none";
                            modalYoutube.href = "#";
                        }
                        
                        modal.classList.add("show");
                        lenis.stop(); // Disable scroll
                    }
                }
            });
        });

        const closeModal = () => {
            modal.classList.remove("show");
            
            // 전시별 고유 클래스 제거
            Array.from(modal.classList).forEach(cls => {
                if (cls.startsWith('modal-') && cls !== 'modal-body-wrapper') {
                    modal.classList.remove(cls);
                }
            });

            setTimeout(() => { 
                modalImg.src = ""; 
                const indicatorsContainer = document.getElementById("modal-indicators");
                if (indicatorsContainer) indicatorsContainer.innerHTML = '';
                if (modalYoutube) modalYoutube.style.display = "none";
            }, 300);
            lenis.start(); // Enable scroll
        };

        closeBtn.addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal || e.target.closest('.modal-body-wrapper') === null && e.target !== closeBtn && !closeBtn.contains(e.target) && !e.target.classList.contains('indicator-dot')) {
                 // Close when clicking empty space
                 closeModal();
            }
        });
        
        // Ensure clicking inside the image/button wrapper doesn't close it
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

    let particles = [];
    let animationId = null;
    const PARTICLE_COUNT = 72; /* 기존 60에서 1.2배 증가 */

    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const isBright = Math.random() < 0.2; /* 약 20%는 밝은 파티클 */
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
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
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * pulse})`;
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
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
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

