// types/article/tagTypes.ts
export interface Tag {
  id: number;
  name: string;
  created_at: Date;
}

export interface CreateTagInput {
  name: string;
}
