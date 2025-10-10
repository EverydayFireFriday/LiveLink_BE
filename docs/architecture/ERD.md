# Entity Relationship Diagram (ERD)

## 데이터베이스: LiveLink (MongoDB)

```mermaid
erDiagram
    User ||--o{ Article : "writes"
    User ||--o{ ChatRoom : "creates"
    User ||--o{ Message : "sends"
    User }o--o{ ChatRoom : "participates"
    User }o--o{ Concert : "likes"
    User }o--o{ Article : "likes"
    ChatRoom ||--o{ Message : "contains"
    Article }o--|| Category : "belongs to"

    User {
        ObjectId _id PK
        string username UK "유니크 제약"
        string email UK "유니크 제약"
        string name "실명"
        Date birthDate "생년월일"
        string passwordHash "선택적(소셜 로그인)"
        string status "active|inactive|suspended|deleted|pending_verification"
        string statusReason "상태 변경 사유"
        string profileImage "프로필 이미지 URL"
        boolean isTermsAgreed "약관 동의 여부"
        string termsVersion "약관 버전"
        Date createdAt
        Date updatedAt
        string provider "소셜 로그인 제공자"
        string socialId "소셜 로그인 ID"
        ObjectId[] likedConcerts "좋아요한 콘서트"
        ObjectId[] likedArticles "좋아요한 게시글"
    }

    Concert {
        ObjectId _id PK
        string uid "사용자 지정 ID"
        string title "콘서트 제목"
        string[] artist "아티스트 목록"
        string[] location "장소 목록"
        Date[] datetime "공연 날짜/시간"
        Price[] price "가격 정보"
        string description "설명"
        string[] category "카테고리"
        TicketLink[] ticketLink "티켓 링크"
        Date ticketOpenDate "티켓 오픈일"
        string posterImage "포스터 이미지"
        string[] infoImages "정보 이미지들"
        string status "upcoming|ongoing|completed|cancelled"
        number likesCount "좋아요 수"
        Date createdAt
        Date updatedAt
    }

    Price {
        string tier "등급"
        number amount "가격"
    }

    TicketLink {
        string platform "플랫폼명"
        string url "티켓 URL"
    }

    Article {
        ObjectId _id PK
        string title "게시글 제목"
        string content_url "컨텐츠 URL"
        ObjectId author_id FK "작성자"
        ObjectId category_id FK "카테고리"
        boolean is_published "발행 여부"
        Date published_at "발행일"
        Date created_at
        Date updated_at
        number views "조회수"
        number likes_count "좋아요 수"
    }

    Category {
        ObjectId _id PK
        string name "카테고리명"
        string description "설명"
        Date created_at
        Date updated_at
    }

    ChatRoom {
        ObjectId _id PK
        string name "채팅방 이름"
        string description "설명"
        boolean isPrivate "비공개 여부"
        ObjectId[] participants "참여자 목록"
        ObjectId createdBy FK "생성자"
        Date createdAt
        Date updatedAt
        Date lastActivity "마지막 활동 시간"
        number messageCount "메시지 수"
    }

    Message {
        ObjectId _id PK
        ObjectId chatRoomId FK "채팅방"
        ObjectId senderId FK "발신자"
        string content "메시지 내용"
        string messageType "text|image|file|system"
        boolean isEdited "수정 여부"
        Date editedAt "수정 시간"
        boolean isDeleted "삭제 여부"
        Date deletedAt "삭제 시간"
        ObjectId replyToMessageId FK "답장 대상"
        Date createdAt
        Date updatedAt
    }
```

## 인덱스 정보

### User Collection
- `username`: Unique Index
- `email`: Unique Index
- `status`: Index
- `{provider, socialId}`: Unique Sparse Index (소셜 로그인)

### Concert Collection
- `uid`: Unique Index
- `status`: Index
- `artist`: Index
- `category`: Index
- `datetime`: Index
- `{title, description}`: Text Search Index

### Article Collection
- `{title, content_url}`: Text Search Index
- `{is_published, published_at}`: Compound Index
- `{author_id, created_at}`: Compound Index
- `{category_id, created_at}`: Compound Index

### ChatRoom Collection
- `createdBy`: Index
- `participants`: Index
- `lastActivity`: Descending Index

### Message Collection
- `{chatRoomId, createdAt}`: Compound Index (Descending on createdAt)
- `senderId`: Index
- `replyToMessageId`: Index

## 관계 설명

### User → Article (1:N)
- 한 명의 사용자는 여러 개의 게시글을 작성할 수 있습니다
- `Article.author_id` → `User._id`

### User → ChatRoom (1:N - Creator)
- 한 명의 사용자는 여러 개의 채팅방을 생성할 수 있습니다
- `ChatRoom.createdBy` → `User._id`

### User ↔ ChatRoom (M:N - Participants)
- 사용자는 여러 채팅방에 참여할 수 있습니다
- `ChatRoom.participants[]` ↔ `User._id`

### User → Message (1:N)
- 한 명의 사용자는 여러 개의 메시지를 보낼 수 있습니다
- `Message.senderId` → `User._id`

### ChatRoom → Message (1:N)
- 한 개의 채팅방은 여러 개의 메시지를 포함할 수 있습니다
- `Message.chatRoomId` → `ChatRoom._id`

### User ↔ Concert (M:N - Likes)
- 사용자는 여러 콘서트를 좋아요할 수 있습니다
- `User.likedConcerts[]` ↔ `Concert._id`

### User ↔ Article (M:N - Likes)
- 사용자는 여러 게시글을 좋아요할 수 있습니다
- `User.likedArticles[]` ↔ `Article._id`

### Category → Article (1:N)
- 한 개의 카테고리는 여러 개의 게시글을 포함할 수 있습니다
- `Article.category_id` → `Category._id`

## 데이터베이스 연결 정보

- **Primary Database**: `livelink` (Users, ChatRooms, Messages)
- **Concert Database**: Concerts, Articles, Categories
- **Driver**: MongoDB Native Driver
- **Connection**: MongoDB Atlas / Local MongoDB
