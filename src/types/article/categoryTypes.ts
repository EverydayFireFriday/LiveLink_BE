// types/article/categoryTypes.ts
export interface Category {
  id: string;        // number → string
  name: string;
  created_at: Date;
}

export interface CreateCategoryInput {
  name: string;
}
