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

  // 여러 Category ID로 조회 (배치 처리)
  async findByIds(ids: string[]): Promise<ICategory[]> {
    if (ids.length === 0) return [];

    const validIds = ids.filter((id) => ObjectId.isValid(id));
    if (validIds.length === 0) return [];

    const objectIds = validIds.map((id) => new ObjectId(id));

    return await this.collection
      .find({ _id: { $in: objectIds } })
      .sort({ name: 1 })
      .toArray();
  }

  // 여러 Category 이름으로 조회 (배치 처리)
  async findManyByName(names: string[]): Promise<ICategory[]> {
    if (names.length === 0) return [];

    return await this.collection
      .find({ name: { $in: names } })
      .sort({ name: 1 })
      .toArray();
  }

  // Category 목록 조회
  async findMany(
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {}
  ): Promise<{ categories: ICategory[]; total: number }> {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (search) {
      filter.name = new RegExp(search, "i");
    }

    const [categories, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
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

  // 이름으로 Category 찾거나 생성
  async findOrCreate(name: string): Promise<ICategory> {
    const existingCategory = await this.findByName(name);
    if (existingCategory) {
      return existingCategory;
    }
    return await this.create(name);
  }

  // 여러 Category 이름으로 찾거나 생성 (배치 처리)
  async findOrCreateMany(names: string[]): Promise<ICategory[]> {
    if (names.length === 0) return [];

    // 기존 카테고리들 조회
    const existingCategories = await this.findManyByName(names);
    const existingNames = new Set(existingCategories.map((cat) => cat.name));

    // 생성해야 할 새 카테고리들
    const newNames = names.filter((name) => !existingNames.has(name));

    if (newNames.length === 0) {
      return existingCategories;
    }

    // 새 카테고리들 배치 생성
    const now = new Date();
    const newCategories: ICategory[] = newNames.map((name) => ({
      _id: new ObjectId(),
      name,
      created_at: now,
    }));

    try {
      await this.collection.insertMany(newCategories);
      return [...existingCategories, ...newCategories];
    } catch (error: any) {
      // 중복 에러가 발생하면 개별적으로 처리
      if (error.code === 11000) {
        const categories: ICategory[] = [];
        for (const name of names) {
          const category = await this.findOrCreate(name);
          categories.push(category);
        }
        return categories;
      }
      throw error;
    }
  }

  // 카테고리별 게시글 수 조회 (통계용)
  async getCategoryArticleCounts(): Promise<
    Array<{ category: ICategory; articleCount: number }>
  > {
    const pipeline = [
      {
        $lookup: {
          from: "articles",
          localField: "_id",
          foreignField: "category_id",
          as: "articles",
        },
      },
      {
        $addFields: {
          articleCount: { $size: "$articles" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          created_at: 1,
          articleCount: 1,
        },
      },
      {
        $sort: { articleCount: -1, name: 1 },
      },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();

    return results.map((item: any) => ({
      category: {
        _id: item._id,
        name: item.name,
        created_at: item.created_at,
      },
      articleCount: item.articleCount,
    }));
  }

  // 인기 카테고리 조회 (발행된 게시글 수 기준) - 타입 에러 수정
  async getPopularCategories(
    options: {
      limit?: number;
      publishedOnly?: boolean;
    } = {}
  ): Promise<Array<{ category: ICategory; articleCount: number }>> {
    const { limit = 10, publishedOnly = true } = options;

    const pipeline: any[] = [
      {
        $lookup: {
          from: "articles",
          localField: "_id",
          foreignField: "category_id",
          as: "articles",
        },
      },
    ];

    if (publishedOnly) {
      pipeline.push({
        $addFields: {
          articles: {
            $filter: {
              input: "$articles",
              as: "article",
              cond: { $eq: ["$$article.is_published", true] },
            },
          },
        },
      } as any);
    }

    pipeline.push(
      {
        $addFields: {
          articleCount: { $size: "$articles" },
        },
      } as any,
      {
        $match: {
          articleCount: { $gt: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          created_at: 1,
          articleCount: 1,
        },
      },
      {
        $sort: { articleCount: -1, name: 1 },
      },
      {
        $limit: limit,
      }
    );

    const results = await this.collection.aggregate(pipeline).toArray();

    return results.map((item: any) => ({
      category: {
        _id: item._id,
        name: item.name,
        created_at: item.created_at,
      },
      articleCount: item.articleCount,
    }));
  }

  // 사용되지 않은 카테고리 조회 - 타입 에러 수정
  async getUnusedCategories(): Promise<ICategory[]> {
    const pipeline = [
      {
        $lookup: {
          from: "articles",
          localField: "_id",
          foreignField: "category_id",
          as: "articles",
        },
      },
      {
        $match: {
          articles: { $size: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          created_at: 1,
        },
      },
      {
        $sort: { name: 1 },
      },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    return results.map((item: any) => ({
      _id: item._id,
      name: item.name,
      created_at: item.created_at,
    }));
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
