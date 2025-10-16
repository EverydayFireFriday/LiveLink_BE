import { ObjectId } from 'mongodb';

export interface ChatRoomCreateRequest {
  name: string;
  description?: string;
  isPrivate: boolean;
}

export interface ChatRoomResponse {
  _id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  participants: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  messageCount: number;
}

export interface MessageCreateRequest {
  content: string;
  messageType?: 'text' | 'image' | 'file';
  replyToMessageId?: string;
}

export interface MessageResponse {
  _id: string;
  chatRoomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  isEdited: boolean;
  editedAt?: string;
  replyToMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRoomWithLastMessage extends ChatRoomResponse {
  lastMessage?: MessageResponse;
  unreadCount?: number;
}

export interface SocketUser {
  userId: string;
  username: string;
  email: string;
}

export interface SocketData {
  user: SocketUser;
}

export interface ServerToClientEvents {
  message: (message: MessageResponse) => void;
  userJoined: (user: SocketUser, roomId: string) => void;
  userLeft: (user: SocketUser, roomId: string) => void;
  typing: (userId: string, username: string, roomId: string) => void;
  stopTyping: (userId: string, roomId: string) => void;
  error: (error: string) => void;
  'server:shutdown': (data: { message: string; reconnectAfter: number }) => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, message: MessageCreateRequest) => void;
  typing: (roomId: string) => void;
  stopTyping: (roomId: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}