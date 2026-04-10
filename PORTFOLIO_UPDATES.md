# Portfolio Update Log — 2026-03-25

이 파일은 포트폴리오 사이트(`portfolio/`)에서 진행된 주요 업데이트 이력과 기술 설계를 정리한 문서입니다.

---

## 주요 변경 사항

### 1. 오타 수정
- `index.html` 및 `resume_text.txt` 내 "초정작가" → **"초청작가"** 수정

---

### 2. 다크 / 라이트 모드 구현

#### 토글 버튼 (`index.html` + `style.css`)
- 우측 상단에 알약(pill) 형태의 고급스러운 테마 토글 스위치 추가
- CSS 변수(`--bg-color`, `--text-primary`, `--point-color` 등) 기반으로 전체 색상 시스템 구성
- `localStorage`로 사용자 선택 저장, `prefers-color-scheme` 시스템 설정 우선 감지

#### 라이트 모드 디자인 원칙
- 배경: `#f4f4f4` (눈이 편안한 웜그레이)
- 텍스트: `#222222` (진한 무채색)
- 포인트 컬러: `#333333` (섹션 제목 강조, 무채색)
- `mix-blend-mode: difference` → `normal` 전환으로 텍스트 가독성 확보

---

### 3. WebGL 배경 파티클 (`three-bg.js`)

#### 테마 연동
- `themeChanged` 커스텀 이벤트로 테마 전환 시 즉각 반영
- **다크 모드**: 오렌지 파티클 (`0x994000`), 기본 크기 (`sizeMultiplier: 1.0`)
- **라이트 모드**: 짙은 회색 파티클 (`0x111111`), 최소 크기 (`sizeMultiplier: 0.7`)

#### 성능 최적화
- 파티클 수: ~~3,000개~~ → **1,200개** (과부하 방지)
- FPS 상한 제거 (30fps 제한 시 마우스 반응이 버벅였음) → 네이티브 `requestAnimationFrame` 사용
- `visibilitychange` 이벤트로 탭 비활성화 시 렌더링 자동 중단
- `const clock = new THREE.Clock()` 선언 위치 주의: **반드시 `animate()` 함수 선언 이전에 위치**

```js
// ✅ 올바른 순서
const clock = new THREE.Clock();
function animate() { ... }
animate();

// ❌ 잘못된 순서 (clock undefined 에러 발생)
function animate() { const elapsedTime = clock.getElapsedTime(); } // clock 미선언
const clock = new THREE.Clock();
```

---

### 4. 모달(Modal) 이미지 뷰어 개선 (`style.css` + `main.js`)

| 항목 | 다크 모드 | 라이트 모드 |
|---|---|---|
| 배경 파티클 색상 | 회색 (`160, 160, 160`) | 회색 (`100, 100, 100`) |
| 유튜브 링크 텍스트 | `var(--text-primary)` | `var(--text-primary)` |
| 인디케이터 점(dot) | `rgba(255,255,255,0.3)` | `rgba(0,0,0,0.2)` |
| Back 버튼 위치 | `top: 6.5rem` (토글 아래) | 동일 |
| Back 버튼 크기 | `72px × 32px` | 동일 (테마 스위치와 동일) |

---

### 5. 모바일 반응형 최적화 (`style.css`)
- Hero 섹션 타이틀: `clamp(3rem, 8vw, 10rem)` 으로 모든 화면에 맞게 유동 조절
- 모달 이미지: 모바일 환경 크기 및 인디케이터 위치 최적화

---

### 6. 원형 다이어그램 (Design Philosophy 섹션)
- **라이트 모드**: 테두리 색상 `rgba(0,0,0,0.15)` → `rgba(0,0,0,0.30)` (더 잘 보이게)
- 라이트 모드에서 내부 텍스트(공간, 다양성 등) `color: var(--text-primary)` 적용
- 가운데 X자 `.cross` 도 라이트 모드에서 진한 회색으로 전환

---

### 7. 타이포그래피
- `KIM YOUNG TAE` 줄: `transform: translateY(-2vh)` 로 위쪽 `LAB OE` 와 시각적으로 밀착되도록 조정
- `MEDIA ARTIST & EXHIBITION DESIGNER` 부제: `margin-left: 0.3em` 으로 좌측 정렬 맞춤

---

## 파일별 주요 수정 목록

| 파일 | 주요 변경 내용 |
|---|---|
| `index.html` | 테마 토글 마크업 추가, 초청작가 오타 수정 |
| `css/style.css` | CSS 변수 다크/라이트 정의, 토글 스타일, 모달/다이어그램 라이트 모드 재정의, 반응형 미디어 쿼리 |
| `js/main.js` | 테마 유지 로직(`localStorage`), 모달 파티클 색상 테마 분기 |
| `js/three-bg.js` | 테마 연동 함수 `applyThreeTheme()`, 성능 최적화, 파티클 파라미터 |

---

## 향후 포인트 컬러 추가 방법

라이트 모드에서 특정 부분에 포인트 컬러를 넣고 싶을 때:

```css
[data-theme="light"] {
    --point-color: #FF6B35; /* 원하는 포인트 컬러로 변경 */
}
```

특정 요소만 변경하려면 해당 선택자에 직접 색상 지정:
```css
[data-theme="light"] .hero-subtitle {
    color: #FF6B35;
}
```

---

### 8. 2026 전시 이력 추가 및 다중 이미지 연동
- **위치**: `index.html` 내 MEDIA ART EXHIBITIONS 섹션 최상단
- **내용**: ‘2026 해치마당 미디어월 봄 전시’ 전문작가 기획전 전시 추가
- **적용**: 3장의 관련 이미지(`img/2026/001.png`, `002.png`, `003.png`)를 `data-img` 속성에 콤마(,)로 연결해 입력하여, 클릭 시 기존 모달 갤러리 뷰어에서 여러 장의 이미지를 넘겨볼 수 있도록 구현했습니다.
