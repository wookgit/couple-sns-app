# 🗄️ Firestore Database 스키마 정의 (스키마 잠금)

Firestore 내 컬렉션들은 아래 명시된 필드 구조와 타입을 반드시 준수해야 합니다. 신규 필드 추가 시에는 이 표를 먼저 수정해야 합니다.

---

### ① `checklists` 컬렉션
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `title` | string | 할 일 제목 |
| `status` | string | 진행 상태 (`'pending'` \| `'progress'` \| `'completed'`) |
| `progressStage`| number | 상세 단계 (0 ~ 5 정수) |
| `priority` | number | 중요도 (1: 낮음, 2: 보통, 3: 긴급) |
| `authorUid` | string | 작성자 UID |
| `createdAt` | string (ISO) | 생성 일시 (예: `2026-05-22T03:00:00.000Z`) |
| `updatedAt` | string (ISO) | 최종 수정 일시 |

---

### ② `events` (캘린더 일정) 컬렉션
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `title` | string | 일정 제목 |
| `memo` | string | 일정 메모 상세 |
| `date` | string (YYYY-MM-DD) | 일정 날짜 (예: `2026-05-22`) |
| `time` | string | 포맷팅된 시간 (예: `오후 02:30` 또는 빈 값 `""`) |
| `imageUrl` | string | 일정 첨부 이미지 (Base64 압축 데이터) |
| `authorUid` | string | 작성자 UID |
| `createdAt` | string (ISO) | 생성 일시 |
| `comments` | array (object) | 일정 상세 댓글 리스트 (아래 객체 배열 구조) |

*   `comments` 배열 내부의 개별 객체 구조:
    *   `id`: `string` (형식: `${user.uid}_${Date.now()}`)
    *   `authorUid`: `string` (댓글 작성자 UID)
    *   `authorName`: `string` (댓글 작성자 이름)
    *   `authorPhoto`: `string` (댓글 작성자 프로필 사진 URL/Base64)
    *   `text`: `string` (댓글 본문)
    *   `createdAt`: `string (ISO)` (댓글 작성 일시)

---

### ③ `posts` (타임라인 피드) 컬렉션
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `text` | string | 본문 텍스트 |
| `imageUrl` | string | 대표 이미지 (Base64 압축 데이터) |
| `images` | array (object) | 다중 이미지 정보 리스트 (아래 객체 배열 구조) |
| `authorName` | string | 작성자 표시 이름 |
| `authorPhoto`| string | 작성자 프로필 이미지 |
| `authorUid` | string | 작성자 UID |
| `createdAt` | string (ISO) | 생성 일시 |
| `hearts` | number | 전체 좋아요(하트) 개수 |
| `likedBy` | array (string) | 좋아요를 누른 사용자 UID 리스트 |
| `comments` | array (object) | 피드 게시글 댓글 리스트 |

*   `images` 배열 내부의 개별 객체 구조:
    *   `url`: `string` (Base64 이미지 데이터)
    *   `likedBy`: `array (string)` (사진에 좋아요 누른 UID 리스트)
    *   `hearts`: `number` (개별 사진 하트 개수)
*   `comments` 배열 내부의 개별 객체 구조:
    *   `id`: `string` (형식: `${user.uid}_${Date.now()}`)
    *   `authorUid`: `string` (댓글 작성자 UID)
    *   `authorName`: `string` (댓글 작성자 이름)
    *   `authorPhoto`: `string` (댓글 작성자 프로필 사진)
    *   `text`: `string` (댓글 본문)
    *   `createdAt`: `string (ISO)` (댓글 작성 일시)
    *   `likedBy`: `array (string)` (댓글에 좋아요를 누른 UID 리스트)

---

### ④ `notifications` (알림) 컬렉션
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `recipientUid`| string | 알림을 받을 상대방 UID |
| `senderUid` | string | 알림을 보낸 사용자 UID |
| `senderName` | string | 알림을 보낸 사용자 이름 |
| `senderPhoto`| string | 알림을 보낸 사용자 프로필 사진 |
| `title` | string | 알림 제목 |
| `body` | string | 알림 내용 |
| `type` | string | 알림 타입 (`'checklist'` \| `'calendar'` \| `'post'` \| `'comment'` \| `'heart'`) |
| `createdAt` | string (ISO) | 알림 발송 일시 |
| `read` | boolean | 읽음 여부 (기본값: `false`) |
| `link` | string | 클릭 시 이동할 화면 경로 (예: `'/checklist'`) |

---

### ⑤ `users` (사용자 프로필) 컬렉션
*   **문서 ID**: 사용자의 `uid` 자체를 문서 ID로 사용합니다.
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `email` | string | 사용자 이메일 계정 |
| `displayName`| string | 닉네임 |
| `photoURL` | string | 프로필 사진 데이터 (Base64/URL) |
| `connectionCode` | string | 고유 연동 코드 (대문자 알파벳/숫자 혼합) |
| `partnerUid` | string | 연동된 상대방 UID |
| `partnerName`| string | 연동된 상대방 이름 |
| `createdAt` | string (ISO) | 계정 생성 일시 |
