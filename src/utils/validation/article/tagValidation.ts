// utils/validation/article/tagValidation.ts
import { z } from 'zod';

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, '태그명은 필수입니다')
    .max(50, '태그명은 50자를 초과할 수 없습니다')
    .regex(
      /^[가-힣a-zA-Z0-9_-]+$/,
      '태그명은 한글, 영문, 숫자, _, - 만 사용할 수 있습니다',
    ),
});

export const tagIdSchema = z.object({
  id: z
    .number()
    .int('태그 ID는 정수여야 합니다')
    .positive('태그 ID는 양수여야 합니다'),
});

export const getTagsSchema = z.object({
  search: z.string().max(50, '검색어는 50자를 초과할 수 없습니다').optional(),
  page: z
    .number()
    .int('페이지는 정수여야 합니다')
    .min(1, '페이지는 1 이상이어야 합니다')
    .default(1),
  limit: z
    .number()
    .int('제한값은 정수여야 합니다')
    .min(1, '제한값은 1 이상이어야 합니다')
    .max(100, '제한값은 100 이하여야 합니다')
    .default(20),
});
