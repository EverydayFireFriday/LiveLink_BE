// utils/validation/article/articleValidation.ts
import { z } from "zod";

export const createArticleSchema = z.object({
  title: z
    .string()
    .min(1, "제목은 필수입니다")
    .max(200, "제목은 200자를 초과할 수 없습니다"),
  content_url: z.string().url("올바른 URL 형식이 아닙니다"),
  author_id: z
    .string()
    .min(1, "작성자 ID는 필수입니다"),
  category_name: z.string().optional(),
  tag_names: z.array(z.string()).optional(),
  is_published: z.boolean().default(false),
  published_at: z.coerce.date().optional(),
});

export const updateArticleSchema = z.object({
  title: z
    .string()
    .min(1, "제목은 필수입니다")
    .max(200, "제목은 200자를 초과할 수 없습니다")
    .optional(),
  content_url: z.string().url("올바른 URL 형식이 아닙니다").optional(),
  category_name: z.string().nullable().optional(),
  tag_names: z.array(z.string()).optional(),
  is_published: z.boolean().optional(),
  published_at: z.coerce.date().nullable().optional(),
});

export const articleIdSchema = z.object({
  id: z
    .string()
    .min(1, "게시글 ID는 필수입니다"),
});

export const incrementViewSchema = z.object({
  article_id: z
    .string()
    .min(1, "게시글 ID는 필수입니다"),
});
