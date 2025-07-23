import { ObjectId } from 'mongodb';

export interface Message {
  _id?: ObjectId;
  chatRoomId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderEmail: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  timestamp: Date;
  readBy: Array<{
    userId: ObjectId;
    readAt: Date;
  }>;
  edited: boolean;
  editedAt?: Date;
  replyTo?: ObjectId; // 답글 기능
}

export interface MessageCreateInput {
  chatRoomId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  replyTo?: string;
}