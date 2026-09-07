# 4. 구현 가이드

## 3.1 파일 구조

```text
frontend/
├─ index.html             # 페이지 구조와 콘텐츠
├─ css/
│  └─ style.css           # 공통 스타일과 반응형 스타일
├─ js/
│  └─ main.js             # 메뉴, 테마 등 상호작용
└─ assets/
   ├─ images/             # 프로필 및 프로젝트 이미지
   └─ icons/              # 필요한 로컬 아이콘
```

초기에는 파일을 단순하게 유지하고 코드가 충분히 커진 뒤 기능별 분리를 검토합니다.

## 3.2 HTML 작성 기준

- 문서 언어는 `<html lang="ko">`로 지정한다.
- `header`, `nav`, `main`, `section`, `article`, `footer` 등 의미에 맞는 태그를 사용한다.
- 페이지의 `h1`은 프로필 이름 또는 핵심 제목 하나로 사용한다.
- 각 주요 섹션은 `h2`, 내부 카드 제목은 `h3`로 구성한다.
- 같은 페이지 내 이동 링크는 섹션 `id`와 연결한다.
- 클릭 동작은 링크 또는 버튼으로 구현하고 일반 `div`에 이벤트를 붙이지 않는다.
- 새 탭 링크에는 `target="_blank" rel="noopener noreferrer"`를 사용한다.

권장 뼈대:

```html
<body>
  <a class="skip-link" href="#main-content">본문 바로가기</a>
  <header>...</header>
  <main id="main-content">
    <section id="home">...</section>
    <section id="about">...</section>
    <section id="skills">...</section>
    <section id="projects">...</section>
    <section id="experience">...</section>
    <section id="contact">...</section>
  </main>
  <footer>...</footer>
  <script src="./js/main.js" defer></script>
</body>
```

## 3.3 CSS 작성 기준

1. 브라우저 기본 스타일을 최소한으로 정리한다.
2. 색상, 간격, 글꼴을 CSS 변수로 정의한다.
3. 모바일 화면을 기본으로 작성한다.
4. 레이아웃은 Flexbox와 Grid를 사용한다.
5. 컴포넌트 클래스는 역할을 알 수 있게 작성한다.
6. 섹션 이동 시 고정 헤더에 가려지지 않도록 `scroll-margin-top`을 설정한다.

예시 클래스 이름:

```text
.site-header
.main-nav
.hero
.section-heading
.skill-list
.project-grid
.project-card
.contact-links
.site-footer
```

## 3.4 JavaScript 작성 기준

- `<script>`에 `defer`를 사용한다.
- DOM 요소가 존재하는지 확인한 뒤 이벤트를 연결한다.
- HTML 인라인 이벤트(`onclick`) 대신 `addEventListener`를 사용한다.
- 메뉴 버튼에는 `aria-expanded` 상태를 반영한다.
- 테마 선택을 구현할 경우 `localStorage`에 저장하되 저장소 사용이 실패해도 페이지가 동작하게 한다.
- JavaScript 없이도 소개와 프로젝트 등 핵심 콘텐츠는 보이게 한다.

필수 기능의 책임:

| 기능 | 구현 위치 | 핵심 고려사항 |
|---|---|---|
| 모바일 메뉴 | `main.js` | 열림 상태와 `aria-expanded` 동기화 |
| 메뉴 링크 이동 | HTML/CSS 중심 | 앵커와 `scroll-behavior` 사용 |
| 푸터 연도 | `main.js` | 현재 연도를 `textContent`로 표시 |
| 테마 전환(선택) | `main.js` | 시스템 설정 및 저장된 설정 반영 |

## 3.5 콘텐츠 작성 원칙

- 자기소개는 2~4문단 이내로 핵심을 먼저 작성한다.
- 기술은 단순 나열보다 실제 사용 맥락을 함께 제공한다.
- 프로젝트 설명에는 해결한 문제, 맡은 역할, 결과를 포함한다.
- 프로젝트 카드마다 사용 기술과 이동 가능한 링크를 명시한다.
- 아직 연결되지 않은 링크는 `#`로 남겨두지 말고 버튼을 숨기거나 준비 중임을 표시한다.

## 3.6 구현 순서

1. HTML 시맨틱 구조와 실제 텍스트 작성
2. 기본 글꼴, 색상, 간격 적용
3. 섹션 및 프로젝트 카드 레이아웃 구현
4. 모바일과 데스크톱 반응형 처리
5. 모바일 메뉴와 푸터 연도 구현
6. 선택 기능 구현
7. 키보드 조작 및 접근성 점검
8. 여러 화면 크기와 브라우저에서 최종 테스트
