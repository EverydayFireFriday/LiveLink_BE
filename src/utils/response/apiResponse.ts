import express from 'express';

/**
 * 표준 API 응답 인터페이스
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * 페이지네이션 정보 인터페이스
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 페이지네이션된 API 응답 인터페이스
 */
export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T> {
  pagination: PaginationMeta;
}

/**
 * 성공 응답 생성 헬퍼
 */
export class ResponseBuilder {
  /**
   * 성공 응답 (200 OK)
   */
  static success<T>(
    res: express.Response,
    message: string,
    data?: T,
  ): express.Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
  }

  /**
   * 생성 성공 응답 (201 Created)
   */
  static created<T>(
    res: express.Response,
    message: string,
    data?: T,
  ): express.Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    return res.status(201).json(response);
  }

  /**
   * 페이지네이션 응답 (200 OK)
   */
  static paginated<T>(
    res: express.Response,
    message: string,
    data: T,
    pagination: PaginationMeta,
  ): express.Response {
    const response: PaginatedApiResponse<T> = {
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
  }

  /**
   * 삭제/수정 성공 응답 - 데이터 없음 (204 No Content는 body가 없으므로 200 사용)
   */
  static noContent(res: express.Response, message: string): express.Response {
    const response: ApiResponse = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
  }

  /**
   * 잘못된 요청 (400 Bad Request)
   */
  static badRequest(
    res: express.Response,
    message: string,
    error?: string,
  ): express.Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: error || message,
      timestamp: new Date().toISOString(),
    };
    return res.status(400).json(response);
  }

  /**
   * 인증 실패 (401 Unauthorized)
   */
  static unauthorized(
    res: express.Response,
    message: string = '인증이 필요합니다.',
  ): express.Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      timestamp: new Date().toISOString(),
    };
    return res.status(401).json(response);
  }

  /**
   * 권한 없음 (403 Forbidden)
   */
  static forbidden(
    res: express.Response,
    message: string = '접근 권한이 없습니다.',
  ): express.Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      timestamp: new Date().toISOString(),
    };
    return res.status(403).json(response);
  }

  /**
   * 리소스를 찾을 수 없음 (404 Not Found)
   */
  static notFound(
    res: express.Response,
    message: string = '요청한 리소스를 찾을 수 없습니다.',
  ): express.Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      timestamp: new Date().toISOString(),
    };
    return res.status(404).json(response);
  }

  /**
   * 충돌 발생 (409 Conflict)
   */
  static conflict(res: express.Response, message: string): express.Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      timestamp: new Date().toISOString(),
    };
    return res.status(409).json(response);
  }

  /**
   * 서버 에러 (500 Internal Server Error)
   */
  static internalError(
    res: express.Response,
    message: string = '서버 내부 오류가 발생했습니다.',
    error?: string,
  ): express.Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: error || message,
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }

  /**
   * 리소스 만료 (410 Gone)
   */
  static gone(
    res: express.Response,
    message: string = '요청한 리소스가 만료되었습니다.',
  ): express.Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      timestamp: new Date().toISOString(),
    };
    return res.status(410).json(response);
  }

  /**
   * 요청 횟수 초과 (429 Too Many Requests)
   */
  static tooManyRequests(
    res: express.Response,
    message: string = '요청 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.',
  ): express.Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      timestamp: new Date().toISOString(),
    };
    return res.status(429).json(response);
  }
}

/**
 * 간단한 사용을 위한 단축 함수들
 */
export const sendSuccess = ResponseBuilder.success;
export const sendCreated = ResponseBuilder.created;
export const sendPaginated = ResponseBuilder.paginated;
export const sendNoContent = ResponseBuilder.noContent;
export const sendBadRequest = ResponseBuilder.badRequest;
export const sendUnauthorized = ResponseBuilder.unauthorized;
export const sendForbidden = ResponseBuilder.forbidden;
export const sendNotFound = ResponseBuilder.notFound;
export const sendConflict = ResponseBuilder.conflict;
export const sendInternalError = ResponseBuilder.internalError;
