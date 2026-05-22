# 👩‍❤️‍👨 커플 SNS 웹앱 (Our Moments) 개발 규칙 & 전략 가이드 (rules.md)

이 문서는 AI 에이전트가 새로운 대화 세션을 시작했을 때, 프로젝트의 기술 사양, 디자인 가이드, 핵심 기능의 비즈니스 규칙을 누락 없이 일관되게 파악하기 위한 최상위 메인 인덱스 파일입니다.

작업을 시작하기 전, 아래의 연관 규칙 가이드들을 참고하여 상황에 맞는 가이드를 준수하며 개발을 진행해야 합니다.

---

## 🛠️ 1. 기술 스택 & 시스템 구성 요약
*   **프론트엔드 Framework**: React + Vite (JavaScript 기반)
*   **스타일링**: Vanilla CSS (CSS 변수를 활용한 전역 디자인 시스템 제어)
*   **백엔드 & 데이터베이스**: Google Firebase (Firestore, Auth, Hosting)
*   **모바일 패키징**: PWA (Progressive Web App) 기술 지원
*   **테스트 환경**: Vitest + React Testing Library (TDD 개발 방식 준수)

---

## 📂 2. 영역별 상세 규칙 및 명세 (프로젝트 하네스 문서)
개발이나 분석이 필요한 도메인에 따라 해당 마크다운 문서를 읽어 참조하십시오.

1.  🗄️ **데이터베이스 명세**: [db-schema.md](file:///c:/Users/namwook/couple-sns-app/.rules/db-schema.md)
    *   Firestore Database 컬렉션 스키마 타입과 필드 잠금 설정
2.  🎨 **디자인 및 UI/UX 원칙**: [design-guide.md](file:///c:/Users/namwook/couple-sns-app/.rules/design-guide.md)
    *   로맨틱 글래스모피즘 테마 및 모바일 PWA 환경의 밀림 방지/터치 최적화 가이드
3.  ⚙️ **핵심 기능 로직 & 파일 매핑**: [features.md](file:///c:/Users/namwook/couple-sns-app/.rules/features.md)
    *   기능별 비즈니스 전략(정렬 로직, 캐싱 등) 및 연관 프론트엔드 소스 파일 경로 인덱스
4.  💻 **개발 컨벤션 및 명령어**: [conventions.md](file:///c:/Users/namwook/couple-sns-app/.rules/conventions.md)
    *   로컬 개발 서버 기동, 테스트 실행(Windows 우회법 포함), 빌드 및 호스팅 배포 명령어
