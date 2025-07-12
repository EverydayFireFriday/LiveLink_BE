// models/article/category.ts
import { ObjectId, Collection, Db } from "mongodb";

export interface ICategory {
  _id: ObjectId;
  name: string;
  created_at: Date;
}

export class CategoryModel {
  private db: Db;
  private collection: Collection<ICategory>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<ICategory>("categories");
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log("Category 인덱스 생성 시작...");

      // name 필드에 유니크 인덱스 생성 (중복 처리)
      try {
        await this.collection.createIndex(
          { name: 1 },
          { unique: true, name: "category_name_unique" }
        );
        console.log("✅ Category name 유니크 인덱스 생성");
      } catch (error: any) {
        if (error.code === 85) {
          // IndexOptionsConflict
          console.log("ℹ️ Category name 유니크 인덱스가 이미 존재함 (스킵)");
        } else {
          console.warn("⚠️ Category name 인덱스 생성 실패:", error.message);
        }
      }

      console.log("🎉 Category 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ Category 인덱스 생성 중 오류:", error);
      console.log("⚠️ 인덱스 없이 계속 진행합니다...");
    }
  }

  // Category 생성
  async create(name: string): Promise<ICategory> {
    const existingCategory = await this.collection.findOne({ name });
    if (existingCategory) {
      throw new Error("이미 존재하는 카테고리입니다.");
    }

    const category: ICategory = {
      _id: new ObjectId(),
      name,
      created_at: new Date(),
    };

    const result = await this.collection.insertOne(category);
    if (!result.insertedId) {
      throw new Error("카테고리 생성에 실패했습니다.");
    }

    return category;
  }

  // Category 조회 (이름으로)
  async findByName(name: string): Promise<ICategory | null> {
    return await this.collection.findOne({ name });
  }

  // Category ID로 조회
  async findById(id: string): Promise<ICategory | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  // Category 목록 조회
  async findMany(
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ categories: ICategory[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      this.collection
        .find({})
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments({}),
    ]);

    return { categories, total };
  }

  // 모든 Category 조회 (페이지네이션 없음)
  async findAll(): Promise<ICategory[]> {
    return await this.collection.find({}).sort({ name: 1 }).toArray();
  }

  // Category 업데이트
  async updateById(id: string, name: string): Promise<ICategory | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    // 같은 이름의 다른 카테고리가 있는지 확인
    const existingCategory = await this.collection.findOne({
      name,
      _id: { $ne: new ObjectId(id) },
    });

    if (existingCategory) {
      throw new Error("이미 존재하는 카테고리 이름입니다.");
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { name } },
      { returnDocument: "after" }
    );

    return result || null;
  }

  // Category 삭제
  async deleteById(id: string): Promise<ICategory | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const result = await this.collection.findOneAndDelete({
      _id: new ObjectId(id),
    });
    return result || null;
  }
}

// 전역 Category 인스턴스
let categoryModel: CategoryModel;

export const initializeCategoryModel = (db: Db): CategoryModel => {
  categoryModel = new CategoryModel(db);
  return categoryModel;
};

export const getCategoryModel = (): CategoryModel => {
  if (!categoryModel) {
    throw new Error("Category 모델이 초기화되지 않았습니다.");
  }
  return categoryModel;
};

export const Category = {
  init: initializeCategoryModel,
  get: getCategoryModel,
};
