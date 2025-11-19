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

// Ticket Open 인터페이스
export interface ITicketOpen {
  openTitle: string;
  openDate: Date;
}

// Setlist Song 인터페이스 (API 요청용으로만 사용, DB에는 별도 Setlist 컬렉션 사용)
export interface ISetlistSong {
  title: string;
  artist: string;
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
  ticketOpenDate?: ITicketOpen[];
  posterImage?: string;
  infoImages?: string[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  likesCount?: number;
  // 주의: setlist는 별도 Setlist 컬렉션에 저장됨 (concertId로 참조)
  youtubePlaylistUrl?: string; // YouTube Music 재생목록 URL
  spotifyPlaylistUrl?: string; // Spotify 재생목록 URL
  createdAt: Date;
  updatedAt: Date;
}
