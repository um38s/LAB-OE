// 감각적인 WebGL 배경 (에르메스 오렌지빛 파티클 웨이브 효과)
const container = document.getElementById('canvas-container');

// 씬, 카메라, 렌더러 설정
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.002); // 배경색과 자연스럽게 섞이는 안개 효과

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;
camera.position.y = 10;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// 파티클 생성
const geometry = new THREE.BufferGeometry();
const count = 1500;
const positions = new Float32Array(count * 3);
const sizes = new Float32Array(count);

for (let i = 0; i < count; i++) {
    // x, y, z 좌표로 파티클 넓게 퍼트리기
    positions[i * 3] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

    // 3가지 고정된 작은 크기 중 하나를 무작위로 선택 (기존 크기에서 40% 추가 감소: 0.15, 0.3, 0.45)
    const randomSize = Math.random();
    if (randomSize < 0.33) {
        sizes[i] = 0.15;
    } else if (randomSize < 0.66) {
        sizes[i] = 0.3;
    } else {
        sizes[i] = 0.45;
    }
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

// GLSL 직접 작성 (파티클 웨이브 애니메이션)
const material = new THREE.ShaderMaterial({
    uniforms: {
        // 기존 #FF6B00 에서 명도를 40% 정도 낮춘 어두운 오렌지(#994000)로 변경하여 전경 텍스트와 분리되도록 함
        color: { value: new THREE.Color(0x994000) },
        time: { value: 0 },
        mouse: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
        uniform float time;
        uniform vec2 mouse;
        attribute float size;
        varying vec3 vPosition;
        
        void main() {
            vPosition = position;
            vec3 pos = position;
            
            // 파도의 움직임 부여 (Sin, Cos 활용)
            pos.y += sin(pos.x * 0.1 + time * 0.5) * 2.0;
            pos.y += cos(pos.z * 0.1 + time * 0.3) * 2.0;
            
            // 마우스 커서 주변으로 파티클이 밀려나는 효과
            float dist = distance(pos.xz, mouse * 20.0);
            if(dist < 10.0) {
                pos.y += (10.0 - dist) * 0.5;
            }
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z); // 원근감에 따른 입자 크기
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        varying vec3 vPosition;
        
        void main() {
            // 사각형 파티클을 선명한 원형으로 깎아냄 (블러 없음)
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            // smoothstep 제거하여 경계가 뚜렷한(sharp) 파티클 생성, 최대 투명도 조절
            gl_FragColor = vec4(color, 0.7); 
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending // 블렌딩 모드를 일반적인 것으로 반경 (너무 눈부시지 않게)
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// 마우스 움직임 추적
let mouseX = 0; let mouseY = 0;
let targetX = 0; let targetY = 0;

document.addEventListener('mousemove', (event) => {
    // x, y를 -1 ~ 1 사이로 정규화
    targetX = (event.clientX / window.innerWidth) * 2 - 1;
    targetY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// 애니메이션 루프
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // 부드러운 마우스 반발을 위한 보간 (Lerp)
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;

    material.uniforms.time.value = elapsedTime;
    material.uniforms.mouse.value.set(mouseX, mouseY);

    // 전체 공간 천천히 회전
    particles.rotation.y = elapsedTime * 0.02;

    // 카메라가 마우스를 따라 부드럽게 이동 (Parallax 효과)
    camera.position.x += (mouseX * 5 - camera.position.x) * 0.02;
    camera.position.y += (mouseY * 2 + 10 - camera.position.y) * 0.02;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
}
animate();

// 리사이징 대응
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
