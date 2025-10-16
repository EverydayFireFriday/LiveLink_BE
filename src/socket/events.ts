/**
 * Socket.IO 이벤트 상수 정의
 * 하드코딩된 문자열 대신 상수를 사용하여 타입 안정성과 디버깅 편의성 향상
 */

/**
 * 클라이언트가 서버로 전송하는 이벤트
 */
export const ClientToServerEvents = {
  /** 클라이언트가 채팅방에 입장 */
  JOIN_ROOM: 'joinRoom',
  /** 클라이언트가 채팅방에서 퇴장 */
  LEAVE_ROOM: 'leaveRoom',
  /** 클라이언트가 메시지 전송 */
  SEND_MESSAGE: 'sendMessage',
  /** 클라이언트가 타이핑 중 */
  TYPING: 'typing',
  /** 클라이언트가 타이핑 중지 */
  STOP_TYPING: 'stopTyping',
  /** 클라이언트 연결 해제 */
  DISCONNECT: 'disconnect',
} as const;

/**
 * 서버가 클라이언트로 전송하는 이벤트
 */
export const ServerToClientEvents = {
  /** 에러 발생 시 전송 */
  ERROR: 'error',
  /** 사용자가 채팅방에 입장했을 때 */
  USER_JOINED: 'userJoined',
  /** 사용자가 채팅방에서 퇴장했을 때 */
  USER_LEFT: 'userLeft',
  /** 새 메시지가 전송되었을 때 */
  MESSAGE: 'message',
  /** 사용자가 타이핑 중일 때 */
  TYPING: 'typing',
  /** 사용자가 타이핑을 중지했을 때 */
  STOP_TYPING: 'stopTyping',
} as const;

/**
 * Socket.IO 기본 이벤트
 */
export const SocketIOEvents = {
  /** 클라이언트 연결 */
  CONNECTION: 'connection',
} as const;

/**
 * 모든 Socket.IO 이벤트를 포함하는 통합 객체
 */
export const SocketEvents = {
  ...SocketIOEvents,
  ...ClientToServerEvents,
  ...ServerToClientEvents,
} as const;
