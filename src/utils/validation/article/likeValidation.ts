// utils/validation/article/likeValidation.ts
import { z } from "zod";

export const createArticleLikeSchema = z.object({
  article_id: z.string().nonempty("게시글 ID는 필수입니다."),
  user_id: z.string().nonempty("사용자 ID는 필수입니다."),
});

export const deleteArticleLikeSchema = z.object({
  article_id: z.string().nonempty("게시글 ID는 필수입니다."),
  user_id: z.string().nonempty("사용자 ID는 필수입니다."),
});

export const createCommentLikeSchema = z.object({
  comment_id: z.string().nonempty("댓글 ID는 필수입니다."),
  user_id: z.string().nonempty("사용자 ID는 필수입니다."),
});

export const deleteCommentLikeSchema = z.object({
  comment_id: z.string().nonempty("댓글 ID는 필수입니다."),
  user_id: z.string().nonempty("사용자 ID는 필수입니다."),
});