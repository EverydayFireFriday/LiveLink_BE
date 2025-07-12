// utils/validation/article/likeValidation.ts
import { z } from "zod";

export const createArticleLikeSchema = z.object({
  article_id: z
    .number()
    .int("게시글 ID는 정수여야 합니다")
    .positive("게시글 ID는 양수여야 합니다"),
  user_id: z
    .number()
    .int("사용자 ID는 정수여야 합니다")
    .positive("사용자 ID는 양수여야 합니다"),
});

export const deleteArticleLikeSchema = z.object({
  article_id: z
    .number()
    .int("게시글 ID는 정수여야 합니다")
    .positive("게시글 ID는 양수여야 합니다"),
  user_id: z
    .number()
    .int("사용자 ID는 정수여야 합니다")
    .positive("사용자 ID는 양수여야 합니다"),
});

export const createCommentLikeSchema = z.object({
  comment_id: z
    .number()
    .int("댓글 ID는 정수여야 합니다")
    .positive("댓글 ID는 양수여야 합니다"),
  user_id: z
    .number()
    .int("사용자 ID는 정수여야 합니다")
    .positive("사용자 ID는 양수여야 합니다"),
});

export const deleteCommentLikeSchema = z.object({
  comment_id: z
    .number()
    .int("댓글 ID는 정수여야 합니다")
    .positive("댓글 ID는 양수여야 합니다"),
  user_id: z
    .number()
    .int("사용자 ID는 정수여야 합니다")
    .positive("사용자 ID는 양수여야 합니다"),
});
