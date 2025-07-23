import { ObjectId } from 'mongodb';

export interface ChatRoom {
  _id?: ObjectId;
  name: string;
  description?: string;
  type: 'concert' | 'article' | 'direct' | 'general';
  relatedId?: ObjectId; // concertId 또는 articleId
  participants: ObjectId[];
  admins: ObjectId[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  maxParticipants?: number;
  isPrivate: boolean;
  lastMessageAt?: Date;
}

export interface ChatRoomCreateInput {
  name: string;
  description?: string;
  type: 'concert' | 'article' | 'direct' | 'general';
  relatedId?: string;
  isPrivate?: boolean;
  maxParticipants?: number;
}

export interface ChatRoomUpdateInput {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  maxParticipants?: number;
}