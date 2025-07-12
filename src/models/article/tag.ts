// models/article/tag.ts
import { ObjectId, Collection, Db } from "mongodb";

export interface ITag {
  _id: ObjectId;
  name: string;
  created_at: Date;
}

export class TagModel {
  private db: Db;
  private collection: Collection<ITag>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<ITag>("tags");
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log("Tag 인덱스 생성 시작...");

      // name 필드에 유니크 인덱스 생성 (중복 처리)
      try {
        await this.collection.createIndex(
          { name: 1 },
          { unique: true, name: "tag_name_unique" }
        );
        console.log("✅ Tag name 유니크 인덱스 생성");
      } catch (error: any) {
        if (error.code === 85) {
          // IndexOptionsConflict
          console.log("ℹ️ Tag name 유니크 인덱스가 이미 존재함 (스킵)");
        } else {
          console.warn("⚠️ Tag name 인덱스 생성 실패:", error.message);
        }
      }

      console.log("🎉 Tag 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ Tag 인덱스 생성 중 오류:", error);
      console.log("⚠️ 인덱스 없이 계속 진행합니다...");
    }
  }

  // Tag 생성
  async create(name: string): Promise<ITag> {
    const existingTag = await this.collection.findOne({ name });
    if (existingTag) {
      throw new Error("이미 존재하는 태그입니다.");
    }

    const tag: ITag = {
      _id: new ObjectId(),
      name,
      created_at: new Date(),
    };

    const result = await this.collection.insertOne(tag);
    if (!result.insertedId) {
      throw new Error("태그 생성에 실패했습니다.");
    }

    return tag;
  }

  // Tag 조회 (이름으로)
  async findByName(name: string): Promise<ITag | null> {
    return await this.collection.findOne({ name });
  }

  // Tag ID로 조회
  async findById(id: string): Promise<ITag | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  // 여러 Tag 이름으로 조회
  async findManyByName(names: string[]): Promise<ITag[]> {
    if (names.length === 0) {
      return [];
    }
    return await this.collection.find({ name: { $in: names } }).toArray();
  }

  // Tag 목록 조회
  async findMany(
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {}
  ): Promise<{ tags: ITag[]; total: number }> {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (search) {
      filter.name = new RegExp(search, "i");
    }

    const [tags, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { tags, total };
  }

  // Tag 삭제
  async deleteById(id: string): Promise<ITag | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const result = await this.collection.findOneAndDelete({
      _id: new ObjectId(id),
    });
    return result || null;
  }

  // 이름으로 Tag 찾거나 생성
  async findOrCreate(name: string): Promise<ITag> {
    const existingTag = await this.findByName(name);
    if (existingTag) {
      return existingTag;
    }
    return await this.create(name);
  }

  // 여러 Tag 이름으로 찾거나 생성
  async findOrCreateMany(names: string[]): Promise<ITag[]> {
    const tags: ITag[] = [];

    for (const name of names) {
      const tag = await this.findOrCreate(name);
      tags.push(tag);
    }

    return tags;
  }
}

// 전역 Tag 인스턴스
let tagModel: TagModel;

export const initializeTagModel = (db: Db): TagModel => {
  tagModel = new TagModel(db);
  return tagModel;
};

export const getTagModel = (): TagModel => {
  if (!tagModel) {
    throw new Error("Tag 모델이 초기화되지 않았습니다.");
  }
  return tagModel;
};

export const Tag = {
  init: initializeTagModel,
  get: getTagModel,
};
