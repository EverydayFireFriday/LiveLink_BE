// types/article/tagTypes.ts
export interface Tag {
  id: string;        // number → string
  name: string;
  created_at: Date;
}

export interface CreateTagInput {
  name: string;
}
