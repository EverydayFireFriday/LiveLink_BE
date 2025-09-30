/**
 * Service 계층 공통 응답 타입
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * 페이지네이션 응답 타입
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 에러 응답 타입
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
}
