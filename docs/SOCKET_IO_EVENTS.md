# Socket.IO Events Documentation

## 🌐 개요

LiveLink Backend의 실시간 통신을 위한 Socket.IO 이벤트 문서입니다.

**Socket.IO 버전:** 4.7.5

---

## 🔌 연결 설정

### 클라이언트 연결

```javascript
import io from 'socket.io-client';

const socket = io('https://api.yourdomain.com', {
  withCredentials: true, // 세션 쿠키 포함
  transports: ['websocket', 'polling'],
});

// 연결 성공
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// 연결 실패
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// 연결 끊김
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### 서버 설정

```typescript
// src/socket/socketServer.ts
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
  },
});
```

---

## 🔐 인증

### 인증 흐름

1. 클라이언트가 HTTP 세션 쿠키를 포함하여 Socket.IO 연결 요청
2. 서버가 세션에서 사용자 정보 확인
3. 인증 성공 시 `socket.data.user`에 사용자 정보 저장
4. 인증 실패 시 연결 거부

### 인증 미들웨어

```typescript
socket.use((packet, next) => {
  if (!socket.data.user) {
    return next(new Error('Authentication required'));
  }
  next();
});
```

---

## 📡 이벤트 목록

### 1. 연결 관리 이벤트

#### `connection`

**방향:** Server → Client (자동)

**설명:** 클라이언트가 서버에 성공적으로 연결되었을 때 발생

**이벤트 핸들러:**

```typescript
socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log('Socket ID:', socket.id);
});
```

---

#### `disconnect`

**방향:** Server → Client (자동)

**설명:** 클라이언트 연결이 끊어졌을 때 발생

**Payload:**

```typescript
{
  reason: string; // 연결 종료 이유
}
```

**이벤트 핸들러:**

```typescript
socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);

  // Disconnect 이유:
  // - "io server disconnect": 서버가 강제로 연결 종료
  // - "io client disconnect": 클라이언트가 연결 종료
  // - "ping timeout": Ping 타임아웃
  // - "transport close": 전송 레이어 종료
  // - "transport error": 전송 오류
});
```

---

### 2. 채팅방 관리 이벤트

#### `joinRoom`

**방향:** Client → Server

**설명:** 사용자가 채팅방에 입장

**Payload:**

```typescript
{
  roomId: string; // 채팅방 ID
}
```

**예제:**

```javascript
// 클라이언트
socket.emit('joinRoom', 'room-id-12345');
```

**서버 로직:**

```typescript
socket.on('joinRoom', async (roomId) => {
  try {
    const user = socket.data.user;

    // 채팅방 존재 확인 및 권한 체크
    const chatRoom = await chatRoomService.getChatRoom(roomId, user.userId);

    if (!chatRoom) {
      socket.emit('error', '채팅방을 찾을 수 없습니다.');
      return;
    }

    // Socket.IO 룸 입장
    await socket.join(roomId);

    // 다른 사용자들에게 알림
    socket.to(roomId).emit('userJoined', user, roomId);

    logger.info(`👤 User ${user.username} joined room ${roomId}`);
  } catch (error) {
    socket.emit('error', error.message);
  }
});
```

---

#### `leaveRoom`

**방향:** Client → Server

**설명:** 사용자가 채팅방을 나감

**Payload:**

```typescript
{
  roomId: string; // 채팅방 ID
}
```

**예제:**

```javascript
// 클라이언트
socket.emit('leaveRoom', 'room-id-12345');
```

**서버 로직:**

```typescript
socket.on('leaveRoom', async (roomId) => {
  try {
    const user = socket.data.user;

    // Socket.IO 룸 나가기
    await socket.leave(roomId);

    // 다른 사용자들에게 알림
    socket.to(roomId).emit('userLeft', user, roomId);

    logger.info(`👤 User ${user.username} left room ${roomId}`);
  } catch (error) {
    socket.emit('error', error.message);
  }
});
```

---

#### `userJoined`

**방향:** Server → Client

**설명:** 다른 사용자가 채팅방에 입장했을 때 알림

**Payload:**

```typescript
{
  user: {
    userId: string;
    username: string;
    email?: string;
  },
  roomId: string;
}
```

**예제:**

```javascript
// 클라이언트
socket.on('userJoined', (user, roomId) => {
  console.log(`${user.username} joined room ${roomId}`);
  displayNotification(`${user.username}님이 입장했습니다.`);
});
```

---

#### `userLeft`

**방향:** Server → Client

**설명:** 다른 사용자가 채팅방을 나갔을 때 알림

**Payload:**

```typescript
{
  user: {
    userId: string;
    username: string;
    email?: string;
  },
  roomId: string;
}
```

**예제:**

```javascript
// 클라이언트
socket.on('userLeft', (user, roomId) => {
  console.log(`${user.username} left room ${roomId}`);
  displayNotification(`${user.username}님이 나갔습니다.`);
});
```

---

### 3. 메시지 이벤트

#### `sendMessage`

**방향:** Client → Server

**설명:** 메시지 전송

**Payload:**

```typescript
{
  roomId: string;
  messageData: {
    content: string;
    messageType: 'text' | 'image' | 'file' | 'system';
  };
}
```

**예제:**

```javascript
// 클라이언트
socket.emit('sendMessage', 'room-id-12345', {
  content: '안녕하세요!',
  messageType: 'text',
});
```

**서버 로직:**

```typescript
socket.on('sendMessage', async (roomId, messageData) => {
  try {
    const user = socket.data.user;

    // 메시지 저장
    const message = await messageService.createMessage(
      roomId,
      user.userId,
      messageData
    );

    // 채팅방의 모든 사용자에게 메시지 브로드캐스트
    io.to(roomId).emit('message', message);

    logger.info(`💬 Message sent in room ${roomId} by ${user.username}`);
  } catch (error) {
    socket.emit('error', error.message);
  }
});
```

---

#### `message`

**방향:** Server → Client

**설명:** 새로운 메시지 수신

**Payload:**

```typescript
{
  _id: string;
  chatRoomId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**예제:**

```javascript
// 클라이언트
socket.on('message', (message) => {
  console.log('New message:', message);

  // 메시지 UI에 추가
  addMessageToUI({
    id: message._id,
    sender: message.senderId,
    content: message.content,
    timestamp: message.createdAt,
  });
});
```

---

### 4. 타이핑 인디케이터 이벤트

#### `typing`

**방향:** Client → Server

**설명:** 사용자가 타이핑 중임을 알림

**Payload:**

```typescript
{
  roomId: string;
}
```

**예제:**

```javascript
// 클라이언트
const messageInput = document.getElementById('message-input');

messageInput.addEventListener('input', () => {
  socket.emit('typing', 'room-id-12345');
});
```

**서버 로직:**

```typescript
socket.on('typing', (roomId) => {
  const user = socket.data.user;
  if (!user) return;

  // 다른 사용자들에게 타이핑 상태 전달
  socket.to(roomId).emit('typing', user.userId, user.username, roomId);
});
```

---

#### `stopTyping`

**방향:** Client → Server

**설명:** 사용자가 타이핑을 멈췄음을 알림

**Payload:**

```typescript
{
  roomId: string;
}
```

**예제:**

```javascript
// 클라이언트
let typingTimer;
const doneTypingInterval = 1000; // 1초

messageInput.addEventListener('input', () => {
  socket.emit('typing', 'room-id-12345');

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('stopTyping', 'room-id-12345');
  }, doneTypingInterval);
});
```

**서버 로직:**

```typescript
socket.on('stopTyping', (roomId) => {
  const user = socket.data.user;
  if (!user) return;

  // 다른 사용자들에게 타이핑 중지 상태 전달
  socket.to(roomId).emit('stopTyping', user.userId, roomId);
});
```

---

#### `typing` (Server → Client)

**방향:** Server → Client

**설명:** 다른 사용자가 타이핑 중일 때 알림

**Payload:**

```typescript
{
  userId: string;
  username: string;
  roomId: string;
}
```

**예제:**

```javascript
// 클라이언트
socket.on('typing', (userId, username, roomId) => {
  console.log(`${username} is typing...`);
  displayTypingIndicator(username);
});
```

---

#### `stopTyping` (Server → Client)

**방향:** Server → Client

**설명:** 다른 사용자가 타이핑을 멈췄을 때 알림

**Payload:**

```typescript
{
  userId: string;
  roomId: string;
}
```

**예제:**

```javascript
// 클라이언트
socket.on('stopTyping', (userId, roomId) => {
  hideTypingIndicator(userId);
});
```

---

### 5. 에러 이벤트

#### `error`

**방향:** Server → Client

**설명:** 서버 측 에러 발생 시 클라이언트에 전달

**Payload:**

```typescript
{
  message: string; // 에러 메시지
}
```

**예제:**

```javascript
// 클라이언트
socket.on('error', (errorMessage) => {
  console.error('Socket error:', errorMessage);
  displayErrorNotification(errorMessage);
});
```

---

## 🎯 완전한 클라이언트 예제

### React + Socket.IO 통합

```typescript
import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface Message {
  _id: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

const ChatRoom: React.FC<{ roomId: string }> = ({ roomId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Socket 연결
  useEffect(() => {
    const newSocket = io('https://api.yourdomain.com', {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      newSocket.emit('joinRoom', roomId);
    });

    newSocket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('userJoined', (user, roomId) => {
      console.log(`${user.username} joined`);
    });

    newSocket.on('userLeft', (user, roomId) => {
      console.log(`${user.username} left`);
    });

    newSocket.on('typing', (userId, username) => {
      setTypingUsers(prev => new Set(prev).add(username));
    });

    newSocket.on('stopTyping', (userId) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        // username으로 제거하려면 userId-username 매핑 필요
        return updated;
      });
    });

    newSocket.on('error', (errorMessage) => {
      alert(errorMessage);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leaveRoom', roomId);
      newSocket.disconnect();
    };
  }, [roomId]);

  // 메시지 전송
  const sendMessage = () => {
    if (socket && inputMessage.trim()) {
      socket.emit('sendMessage', roomId, {
        content: inputMessage,
        messageType: 'text',
      });
      setInputMessage('');
      socket.emit('stopTyping', roomId);
    }
  };

  // 타이핑 인디케이터
  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', roomId);
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg._id}>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>

      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          {Array.from(typingUsers).join(', ')} is typing...
        </div>
      )}

      <input
        type="text"
        value={inputMessage}
        onChange={(e) => {
          setInputMessage(e.target.value);
          handleTyping();
        }}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatRoom;
```

---

## 🔧 고급 기능

### 1. 네임스페이스

```typescript
// 서버
const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
  console.log('User connected to /chat namespace');
});

// 클라이언트
const chatSocket = io('https://api.yourdomain.com/chat');
```

### 2. 룸 (Rooms)

```typescript
// 특정 룸에만 메시지 전송
io.to('room-id-123').emit('message', 'Hello room!');

// 특정 룸 제외하고 전송
socket.broadcast.to('room-id-123').emit('message', 'Hello others!');

// 여러 룸에 전송
io.to('room1').to('room2').emit('message', 'Hello multiple rooms!');
```

### 3. Acknowledgements (콜백)

```typescript
// 클라이언트
socket.emit('sendMessage', messageData, (response) => {
  if (response.success) {
    console.log('Message sent successfully');
  }
});

// 서버
socket.on('sendMessage', (messageData, callback) => {
  // 메시지 처리
  callback({ success: true });
});
```

---

## 📊 이벤트 요약표

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `connection` | Server → Client | 연결 성공 |
| `disconnect` | Server → Client | 연결 종료 |
| `joinRoom` | Client → Server | 채팅방 입장 |
| `leaveRoom` | Client → Server | 채팅방 나가기 |
| `userJoined` | Server → Client | 사용자 입장 알림 |
| `userLeft` | Server → Client | 사용자 퇴장 알림 |
| `sendMessage` | Client → Server | 메시지 전송 |
| `message` | Server → Client | 메시지 수신 |
| `typing` | Client ↔ Server | 타이핑 중 |
| `stopTyping` | Client ↔ Server | 타이핑 중지 |
| `error` | Server → Client | 에러 발생 |

---

## 🛡️ 보안 고려사항

### 1. 인증 필수

```typescript
// 모든 이벤트에 인증 체크
socket.use((packet, next) => {
  if (!socket.data.user) {
    return next(new Error('Authentication required'));
  }
  next();
});
```

### 2. Rate Limiting

```typescript
// 메시지 전송 Rate Limiting (예: 초당 5회)
const messageRateLimiter = rateLimit({
  windowMs: 1000,
  max: 5,
});

socket.on('sendMessage', messageRateLimiter, async (roomId, messageData) => {
  // 메시지 처리
});
```

### 3. 입력 검증

```typescript
socket.on('sendMessage', async (roomId, messageData) => {
  // Joi/Zod 검증
  const schema = Joi.object({
    content: Joi.string().max(2000).required(),
    messageType: Joi.string().valid('text', 'image', 'file').required(),
  });

  const { error } = schema.validate(messageData);
  if (error) {
    socket.emit('error', '유효하지 않은 메시지 데이터');
    return;
  }

  // 메시지 처리
});
```

---

## 🐛 디버깅

### 클라이언트 디버깅

```javascript
// 디버그 모드 활성화
const socket = io('https://api.yourdomain.com', {
  withCredentials: true,
  debug: true,
});

// 모든 이벤트 로깅
socket.onAny((event, ...args) => {
  console.log(`Event: ${event}`, args);
});
```

### 서버 디버깅

```typescript
// 모든 이벤트 로깅
io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    logger.debug(`Socket event: ${event}`, args);
  });
});
```

---

## 📚 관련 문서

- [Socket.IO Official Docs](https://socket.io/docs/v4/)
- [API Reference](./API_REFERENCE.md)
- [Architecture Documentation](./architecture/README.md)

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
