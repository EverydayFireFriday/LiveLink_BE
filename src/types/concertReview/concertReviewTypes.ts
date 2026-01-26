import { ObjectId } from 'mongodb';

/**
 * 콘서트 리뷰 내부 사용자 정보 (정규화하지 않음)
 */
export interface IConcertReviewUser {
  id: string;
  username: string;
  profileImage?: string;
}

/**
 * 콘서트 리뷰 내부 콘서트 정보 (정규화하지 않음)
 */
export interface IConcertReviewConcert {
  id: string;
  title: string;
  posterImage?: string;
  venue: string;
  date: Date;
}

/**
 * 콘서트 리뷰 인터페이스
 */
export interface IConcertReview {
  _id: ObjectId;
  user: IConcertReviewUser;
  concert: IConcertReviewConcert;
  images: string[];
  content: string;
  tags: string[];
  hashtags: string[];
  likeCount: number;
  reportCount: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * 콘서트 리뷰 생성 입력 데이터
 */
export interface ICreateConcertReviewInput {
  userId: string;
  username: string;
  profileImage?: string;
  concertId: string;
  concertTitle: string;
  posterImage?: string;
  venue: string;
  date: Date;
  images: string[];
  content: string;
  tags?: string[];
  hashtags?: string[];
  isPublic?: boolean;
}

/**
 * 콘서트 리뷰 업데이트 입력 데이터
 */
export interface IUpdateConcertReviewInput {
  images?: string[];
  content?: string;
  tags?: string[];
  hashtags?: string[];
  isPublic?: boolean;
}

/**
 * 콘서트 리뷰 조회 필터
 */
export interface IConcertReviewFilter {
  userId?: string;
  concertId?: string;
  isPublic?: boolean;
  hashtags?: string[];
  tags?: string[];
}

/**
 * 페이지네이션 옵션
 */
export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'likeCount' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 페이지네이션 결과
 */
export interface IPaginatedConcertReviews {
  reviews: IConcertReview[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}
