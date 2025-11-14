import { ObjectId } from 'mongodb';

// 개별 곡 정보
export interface ISong {
  title: string;
  artist: string;
}

// Setlist 메인 인터페이스
export interface ISetlist {
  _id: ObjectId;
  concertId: string; // concert uid 참조
  setList: ISong[];
  createdAt: Date;
  updatedAt: Date;
}
