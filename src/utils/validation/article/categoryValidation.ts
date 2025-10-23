// utils/validation/article/categoryValidation.ts
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, '카테고리명은 필수입니다')
    .max(100, '카테고리명은 100자를 초과할 수 없습니다'),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, '카테고리명은 필수입니다')
    .max(100, '카테고리명은 100자를 초과할 수 없습니다'),
});

export const categoryIdSchema = z.object({
  id: z
    .number()
    .int('카테고리 ID는 정수여야 합니다')
    .positive('카테고리 ID는 양수여야 합니다'),
});

export const getCategoriesSchema = z.object({
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
