import { z } from 'zod';

/**
 * 콘서트 리뷰 생성 검증 스키마
 */
export const createConcertReviewSchema = z.object({
  concertId: z.string().min(1, '콘서트 ID는 필수입니다'),
  images: z
    .array(z.string().url('올바른 이미지 URL 형식이 아닙니다'))
    .max(10, '이미지는 최대 10개까지 업로드할 수 있습니다')
    .optional()
    .default([]),
  content: z
    .string()
    .min(1, '리뷰 내용은 필수입니다')
    .max(2000, '리뷰 내용은 최대 2000자까지 작성할 수 있습니다'),
  tags: z
    .array(z.string().min(1).max(50))
    .max(10, '태그는 최대 10개까지 추가할 수 있습니다')
    .optional()
    .default([]),
  hashtags: z
    .array(
      z.string().min(1).max(50).regex(/^#/, '해시태그는 #으로 시작해야 합니다'),
    )
    .max(10, '해시태그는 최대 10개까지 추가할 수 있습니다')
    .optional()
    .default([]),
  isPublic: z.boolean().optional().default(true),
});

/**
 * 콘서트 리뷰 수정 검증 스키마
 */
export const updateConcertReviewSchema = z.object({
  images: z
    .array(z.string().url('올바른 이미지 URL 형식이 아닙니다'))
    .max(10, '이미지는 최대 10개까지 업로드할 수 있습니다')
    .optional(),
  content: z
    .string()
    .min(1, '리뷰 내용은 최소 1자 이상이어야 합니다')
    .max(2000, '리뷰 내용은 최대 2000자까지 작성할 수 있습니다')
    .optional(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(10, '태그는 최대 10개까지 추가할 수 있습니다')
    .optional(),
  hashtags: z
    .array(
      z.string().min(1).max(50).regex(/^#/, '해시태그는 #으로 시작해야 합니다'),
    )
    .max(10, '해시태그는 최대 10개까지 추가할 수 있습니다')
    .optional(),
  isPublic: z.boolean().optional(),
});

/**
 * 콘서트 리뷰 조회 쿼리 검증 스키마
 */
export const getConcertReviewsQuerySchema = z.object({
  userId: z.string().optional(),
  concertId: z.string().optional(),
  isPublic: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === 'true';
    }),
  hashtags: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(',').map((tag) => tag.trim());
    }),
  tags: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(',').map((tag) => tag.trim());
    }),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => Math.min(parseInt(val, 10), 100)), // 최대 100개 제한
  sortBy: z
    .enum(['createdAt', 'likeCount', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * ObjectId 검증 스키마
 */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: '올바른 ID 형식이 아닙니다',
});
