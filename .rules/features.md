# ⚙️ 핵심 기능별 비즈니스 전략 & 소스 파일 인덱스

이 문서는 개별 기능별 비즈니스 제약 규칙과 해당 기능이 구현된 소스 파일들의 매핑 리스트입니다.
AI 에이전트는 특정 기능 수정 요청을 받으면 여기에 정의된 경로의 파일들만 선택적으로 참조하여 불필요한 전체 파일 스캔을 최소화해야 합니다.

---

### ① 타임라인 피드 (Home)
*   **연관 소스**:
    *   메인 페이지: [Home.jsx](file:///c:/Users/namwook/couple-sns-app/src/pages/Home.jsx) | 테스트: [Home.test.jsx](file:///c:/Users/namwook/couple-sns-app/src/pages/Home.test.jsx)
    *   포스트 카드 컴포넌트: [PostCard.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/PostCard.jsx)
    *   업로드 모달: [UploadModal.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/UploadModal.jsx)
    *   실시간 댓글: [CommentSection.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/CommentSection.jsx)
*   **비즈니스 규칙**:
    *   커플 둘만의 사진첩 겸 인스타그램 형태의 공간입니다.
    *   사진 업로드, 글 작성, 그리고 게시물당 하트(좋아요) 및 실시간 댓글 기능을 제공합니다.
    *   댓글은 개별 피드 게시글에 종속되며, 댓글에 좋아요(`likedBy` UID 리스트) 기능이 추가적으로 포함됩니다.

---

### ② 공유 캘린더 (Calendar)
*   **연관 소스**:
    *   메인 페이지: [Calendar.jsx](file:///c:/Users/namwook/couple-sns-app/src/pages/Calendar.jsx) | 테스트: [Calendar.test.jsx](file:///c:/Users/namwook/couple-sns-app/src/pages/Calendar.test.jsx)
    *   실시간 댓글: [CommentSection.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/CommentSection.jsx)
*   **비즈니스 규칙**:
    *   두 사람의 기념일, 데이트 약속 등을 관리하는 캘린더입니다.
    *   **일정 댓글 소통**: 캘린더의 개별 일정을 클릭하여 상세히 볼 때, 하단에 서로 실시간 대화식 댓글을 달 수 있어 개별 일정에 대한 소통이 가능합니다.
    *   캘린더 댓글은 하트(좋아요) 필드가 포함되지 않는 단순 댓글 객체입니다.

---

### ③ 실시간 체크리스트 (Checklist)
*   **연관 소스**:
    *   메인 페이지: [Checklist.jsx](file:///c:/Users/namwook/couple-sns-app/src/pages/Checklist.jsx) | 테스트: [Checklist.test.jsx](file:///c:/Users/namwook/couple-sns-app/src/pages/Checklist.test.jsx)
*   **비즈니스 규칙**:
    *   **우선순위(중요도) 등급**:
        *   `🔥 긴급` (값: 3)
        *   `⚡ 보통` (값: 2, 기본값)
        *   `🌱 낮음` (값: 1)
    *   **정렬 로직 (매우 중요)**:
        *   **중요도순 (기본값)**: 1차적으로 중요도 내림차순(3 -> 2 -> 1) 정렬, 동일한 중요도인 경우 2차적으로 생성일(`createdAt`) 내림차순(최신순) 정렬 적용.
        *   **최신순**: 중요도에 상관없이 전적으로 생성일(`createdAt`) 내림차순 정렬.
    *   **필터링**:
        *   상태 필터 탭(`전체`/`미정`/`진행중`/`완료`)과 중요도 필터 칩(`전체`/`긴급`/`보통`/`낮음`)이 유기적으로 연동되어 개별 개수를 실시간으로 계산해 화면에 나타냅니다.
    *   **상태별 뱃지 테마 컬러**:
        *   **전체**: 슬레이트 그레이 (`#64748b`)
        *   **미정**: 시원한 블루 (`#3b82f6`)
        *   **진행중**: 역동적인 앰버/오렌지 (`#f59e0b`)
        *   **완료**: 화사한 로즈/핑크 (`#ec4899`)

---

### ④ 설정 및 앱 관리 (Settings)
*   **연관 소스**:
    *   메인 페이지: [Settings.jsx](file:///c:/Users/namwook/couple-sns-app/src/pages/Settings.jsx) | 테스트: [Settings.test.jsx](file:///c:/Users/namwook/couple-sns-app/src/pages/Settings.test.jsx)
    *   프로필 편집 모달: [ProfileModal.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/ProfileModal.jsx)
*   **비즈니스 규칙**:
    *   커플 연동 설정 및 프로필 편집을 제공합니다.
    *   **캐시 비우기 및 강제 새로고침**: PWA 환경의 캐시 문제를 해결하기 위해 등록된 Service Worker를 unregister하고 브라우저 Cache Storage를 완전 삭제한 뒤, `window.location.reload(true)`를 유도하는 원버튼 복구 기능을 지원합니다.

---

### ⑤ 실시간 알림 & 인증 인프라
*   **연관 소스**:
    *   인증 상태 훅: [useAuth.js](file:///c:/Users/namwook/couple-sns-app/src/hooks/useAuth.js)
    *   비인증 접근 차단: [ProtectedRoute.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/ProtectedRoute.jsx)
    *   알림 비즈니스 로직: [notificationService.js](file:///c:/Users/namwook/couple-sns-app/src/services/notificationService.js)
    *   알림 UI 컴포넌트: [NotificationsModal.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/NotificationsModal.jsx), [InAppToast.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/InAppToast.jsx)
    *   공통 알림 모달 컨텍스트: [CustomAlertContext.jsx](file:///c:/Users/namwook/couple-sns-app/src/context/CustomAlertContext.jsx)
    *   공통 헤더 네비게이션: [Navbar.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/Navbar.jsx) | 테스트: [Navbar.test.jsx](file:///c:/Users/namwook/couple-sns-app/src/components/Navbar.test.jsx)
