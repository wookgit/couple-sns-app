# 💻 개발 컨벤션 및 명령어 (Conventions)

프로젝트 로컬 검증 및 관리를 위해 다음 명령어를 참조하여 사용해야 합니다.

---

### ① 필수 개발 및 테스트 명령어
*   **로컬 개발 서버 구동**: `npm run dev`
*   **전체 단위 테스트 실행 (TDD 검증)**:
    *   기본 실행: `npm test`
    *   Windows PowerShell 권한 에러 발생 시: `powershell -ExecutionPolicy Bypass -Command "npm test"`
*   **프로덕션 빌드 유효성 확인**:
    *   기본 실행: `npm run build`
    *   Windows PowerShell 권한 에러 발생 시: `powershell -ExecutionPolicy Bypass -Command "npm run build"`
*   **Firebase 호스팅 수동 배포**:
    *   실행: `npx firebase deploy`

---

### ② 테스트 및 품질 관리 컨벤션
*   모든 기능 구현 시 대응되는 단위 테스트 파일(예: `Checklist.test.jsx`)을 작성하거나 갱신하여 100% 테스트 성공 상태를 보장해야 합니다.
*   React 19 버전 호환을 위해 비동기 상태 업데이트 테스트 진행 시 반드시 테스트 러너의 `act(...)` 경고가 발생하지 않도록 비동기 처리(waitFor 등)를 철저히 해야 합니다.
