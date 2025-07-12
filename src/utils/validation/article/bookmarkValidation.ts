// utils/validation/article/bookmarkValidation.ts
import { z } from "zod";

export const createBookmarkSchema = z.object({
  article_id: z
    .number()
    .int("게시글 ID는 정수여야 합니다")
    .positive("게시글 ID는 양수여야 합니다"),
  user_id: z
    .number()
    .int("사용자 ID는 정수여야 합니다")
    .positive("사용자 ID는 양수여야 합니다"),
});

export const deleteBookmarkSchema = z.object({
  article_id: z
    .number()
    .int("게시글 ID는 정수여야 합니다")
    .positive("게시글 ID는 양수여야 합니다"),
  user_id: z
    .number()
    .int("사용자 ID는 정수여야 합니다")
    .positive("사용자 ID는 양수여야 합니다"),
});

export const getUserBookmarksSchema = z.object({
  user_id: z
    .number()
    .int("사용자 ID는 정수여야 합니다")
    .positive("사용자 ID는 양수여야 합니다"),
  page: z
    .number()
    .int("페이지는 정수여야 합니다")
    .min(1, "페이지는 1 이상이어야 합니다")
    .default(1),
  limit: z
    .number()
    .int("제한값은 정수여야 합니다")
    .min(1, "제한값은 1 이상이어야 합니다")
    .max(100, "제한값은 100 이하여야 합니다")
    .default(20),
});
