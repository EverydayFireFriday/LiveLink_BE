import { ObjectId } from 'mongodb';

// Price 인터페이스
export interface IPrice {
  tier: string;
  amount: number;
}

// Ticket Link 인터페이스
export interface ITicketLink {
  platform: string;
  url: string;
}

// Like 인터페이스
export interface ILike {
  userId: ObjectId;
  likedAt: Date;
}

// Concert 메인 인터페이스
export interface IConcert {
  _id: ObjectId;
  uid: string; // 사용자 지정 ID (timestamp 포함)
  title: string;
  artist: string[];
  location: string[];
  datetime: Date[];
  price?: IPrice[];
  description?: string;
  category?: string[];
  ticketLink?: ITicketLink[];
  ticketOpenDate?: Date;
  posterImage?: string;
  infoImages?: string[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  likes?: ILike[];
  likesCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
