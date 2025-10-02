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

// Concert 메인 인터페이스
export interface IConcert {
  _id: ObjectId;
  uid: string; // 사용자 지정 ID (timestamp 포함)
  title: string;
  artist: string[];
  location: string[];
  datetime?: Date[]; // 선택적 필드 (날짜 미정인 경우 빈 배열 또는 undefined)
  price?: IPrice[];
  description?: string;
  category?: string[];
  ticketLink?: ITicketLink[];
  ticketOpenDate?: Date;
  posterImage?: string;
  infoImages?: string[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  likesCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
