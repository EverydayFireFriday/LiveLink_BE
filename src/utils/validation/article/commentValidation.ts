// utils/validation/article/commentValidation.ts
import { z } from "zod";

export const createCommentSchema = z.object({
  article_id: z
    .number()
    .int("게시글 ID는 정수여야 합니다")
    .positive("게시글 ID는 양수여야 합니다"),
  author_id: z
    .number()
    .int("작성자 ID는 정수여야 합니다")
    .positive("작성자 ID는 양수여야 합니다"),
  content: z
    .string()
    .min(1, "댓글 내용은 필수입니다")
    .max(1000, "댓글은 1000자를 초과할 수 없습니다"),
  parent_id: z
    .number()
    .int("부모 댓글 ID는 정수여야 합니다")
    .positive("부모 댓글 ID는 양수여야 합니다")
    .optional(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "댓글 내용은 필수입니다")
    .max(1000, "댓글은 1000자를 초과할 수 없습니다"),
});

export const commentIdSchema = z.object({
  id: z
    .number()
    .int("댓글 ID는 정수여야 합니다")
    .positive("댓글 ID는 양수여야 합니다"),
});

export const getCommentsSchema = z.object({
  article_id: z
    .number()
    .int("게시글 ID는 정수여야 합니다")
    .positive("게시글 ID는 양수여야 합니다"),
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
