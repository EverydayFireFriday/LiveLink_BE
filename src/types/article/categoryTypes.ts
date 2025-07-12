// types/article/categoryTypes.ts
export interface Category {
  id: number;
  name: string;
  created_at: Date;
}

export interface CreateCategoryInput {
  name: string;
}
