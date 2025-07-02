import { ObjectId, Collection, Db } from "mongodb";

// Location 인터페이스 제거 - 이제 string 배열 사용

// Price 인터페이스
export interface IPrice {
  tier: string;
  amount: number;
}

// Ticket Link 인터페이스
export interface ITicketLink {
  platform: string;
  url: string;
}

// Like 인터페이스
export interface ILike {
  userId: ObjectId;
  likedAt: Date;
}

// Concert 메인 인터페이스 - 업데이트됨
export interface IConcert {
  _id: ObjectId;
  uid: string; // 사용자 지정 ID (timestamp 포함)
  title: string;
  artist: string[]; // 빈 배열이면 400 -> 200으로 변경
  location: string[]; // ILocation[] -> string[]로 변경
  datetime: Date[];
  price?: IPrice[];
  description?: string;
  category?: string[];
  ticketLink?: ITicketLink[];
  ticketOpenDate?: Date; // 티켓 오픈 날짜/시간 추가
  posterImage?: string; // S3 URL
  infoImages?: string[]; // info에서 infoImages로 이름 변경
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  tags?: string[];
  likes?: ILike[]; // 좋아요 배열
  likesCount?: number; // 좋아요 개수
  createdAt: Date;
  updatedAt: Date;
}

// 데이터베이스 연결을 위한 Concert 클래스
export class ConcertModel {
  private db: Db;
  private collection: Collection<IConcert>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<IConcert>("concerts");
    this.createMinimalIndexes();
  }

  // 최소한의 필수 인덱스만 생성
  private async createMinimalIndexes() {
    try {
      console.log("Concert 최소 인덱스 생성 시작...");

      // 1. uid 유니크 인덱스 (필수 - 중복 방지)
      await this.collection.createIndex({ uid: 1 }, { unique: true });
      console.log("✅ uid 인덱스 생성");

      // 2. 텍스트 검색 인덱스 (검색 기능용) - location이 이제 string 배열
      await this.collection.createIndex({
        title: "text",
        artist: "text",
        location: "text", // location 필드가 string 배열이므로 직접 참조
        description: "text",
      });
      console.log("✅ 텍스트 검색 인덱스 생성");

      // 3. 좋아요 사용자 인덱스 (좋아요 기능용)
      await this.collection.createIndex({ "likes.userId": 1 });
      console.log("✅ likes.userId 인덱스 생성");

      // 4. 배치 처리를 위한 추가 인덱스
      await this.collection.createIndex({ _id: 1 });
      console.log("✅ _id 인덱스 생성");

      console.log("🎉 Concert 최소 인덱스 생성 완료 (총 4개)");
    } catch (error) {
      console.error("❌ 인덱스 생성 중 오류:", error);
      // 인덱스 생성 실패해도 계속 진행
      console.log("⚠️ 인덱스 없이 계속 진행합니다...");
    }
  }

  // 데이터 유효성 검사 - 업데이트됨 (create와 update 분리)
  private validateConcertData(
    concertData: Partial<IConcert>,
    isUpdate: boolean = false
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 필수 필드 검사 (생성시에만)
    if (!isUpdate) {
      if (!concertData.uid) errors.push("uid는 필수입니다.");
      if (!concertData.title || concertData.title.trim().length === 0) {
        errors.push("title은 필수입니다.");
      }

      // artist 검증: 빈 배열 허용 (400 -> 200)
      if (!concertData.artist || !Array.isArray(concertData.artist)) {
        errors.push("artist는 배열이어야 합니다.");
      }

      if (
        !concertData.location ||
        !Array.isArray(concertData.location) ||
        concertData.location.length === 0
      ) {
        errors.push("location은 비어있지 않은 배열이어야 합니다.");
      }
      if (
        !concertData.datetime ||
        !Array.isArray(concertData.datetime) ||
        concertData.datetime.length === 0
      ) {
        errors.push("datetime은 비어있지 않은 배열이어야 합니다.");
      }
    } else {
      // 업데이트시 필드별 검사 (제공된 필드에 대해서만)
      if (concertData.title !== undefined) {
        if (!concertData.title || concertData.title.trim().length === 0) {
          errors.push("title은 비어있을 수 없습니다.");
        }
      }

      if (concertData.artist !== undefined) {
        if (!Array.isArray(concertData.artist)) {
          errors.push("artist는 배열이어야 합니다.");
        }
      }

      if (concertData.location !== undefined) {
        if (
          !Array.isArray(concertData.location) ||
          concertData.location.length === 0
        ) {
          errors.push("location은 비어있지 않은 배열이어야 합니다.");
        }
      }

      if (concertData.datetime !== undefined) {
        if (
          !Array.isArray(concertData.datetime) ||
          concertData.datetime.length === 0
        ) {
          errors.push("datetime은 비어있지 않은 배열이어야 합니다.");
        }
      }
    }

    // 길이 제한 검사 (제공된 필드에 대해서만)
    if (concertData.title && concertData.title.length > 200) {
      errors.push("title은 200자를 초과할 수 없습니다.");
    }
    if (concertData.description && concertData.description.length > 2000) {
      errors.push("description은 2000자를 초과할 수 없습니다.");
    }

    // location 필드 검증 - string 배열로 변경
    if (concertData.location && Array.isArray(concertData.location)) {
      concertData.location.forEach((loc, index) => {
        if (typeof loc !== "string" || loc.trim().length === 0) {
          errors.push(
            `location[${index}]은 비어있지 않은 문자열이어야 합니다.`
          );
        }
        if (loc && loc.length > 150) {
          errors.push(`location[${index}]은 150자를 초과할 수 없습니다.`);
        }
      });
    }

    // datetime 검증 (제공된 경우에만)
    if (concertData.datetime && Array.isArray(concertData.datetime)) {
      concertData.datetime.forEach((dt, index) => {
        if (!(dt instanceof Date)) {
          const dateValue =
            typeof dt === "string" || typeof dt === "number" ? dt : String(dt);
          if (!Date.parse(dateValue)) {
            errors.push(`datetime[${index}]는 유효한 날짜여야 합니다.`);
          }
        }
      });
    }

    // ticketOpenDate 검증 (새로 추가) (제공된 경우에만)
    if (concertData.ticketOpenDate) {
      if (!(concertData.ticketOpenDate instanceof Date)) {
        const dateValue =
          typeof concertData.ticketOpenDate === "string" ||
          typeof concertData.ticketOpenDate === "number"
            ? concertData.ticketOpenDate
            : String(concertData.ticketOpenDate);
        if (!Date.parse(dateValue)) {
          errors.push("ticketOpenDate는 유효한 날짜여야 합니다.");
        }
      }
    }

    // category 검증 - 확장된 카테고리 목록 (제공된 경우에만)
    const validCategories = [
      // 기본 장르
      "pop",
      "rock",
      "jazz",
      "classical",
      "hiphop",
      "electronic",
      "indie",
      "folk",
      "r&b",
      "country",
      "musical",
      "opera",
      // K-POP 및 아시아 음악
      "k-pop",
      "kpop",
      "j-pop",
      "c-pop",
      "korean",
      "japanese",
      // 세부 장르
      "ballad",
      "dance",
      "trot",
      "rap",
      "hip-hop",
      "edm",
      "house",
      "techno",
      "dubstep",
      "reggae",
      "blues",
      "soul",
      "funk",
      "punk",
      "metal",
      "alternative",
      "grunge",
      // 기타
      "fusion",
      "world",
      "latin",
      "gospel",
      "new-age",
      "ambient",
      "instrumental",
      "acoustic",
      "live",
      "concert",
      "festival",
      "other",
    ];

    if (concertData.category && Array.isArray(concertData.category)) {
      concertData.category.forEach((cat, index) => {
        // 대소문자 무시하고 검사
        const normalizedCat = cat.toLowerCase().trim();
        const isValid = validCategories.some(
          (validCat) => validCat.toLowerCase() === normalizedCat
        );

        if (!isValid) {
          errors.push(
            `category[${index}] '${cat}'는 유효한 카테고리가 아닙니다.`
          );
          console.log(
            `💡 허용된 카테고리: ${validCategories.slice(0, 10).join(", ")}... (총 ${validCategories.length}개)`
          );
        }
      });
    }

    // URL 검증 (제공된 경우에만)
    const urlPattern = /^https?:\/\/.+/;
    const imageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

    if (
      concertData.posterImage &&
      !imageUrlPattern.test(concertData.posterImage)
    ) {
      errors.push("posterImage는 유효한 이미지 URL이어야 합니다.");
    }

    // infoImages 필드 검증 (info에서 infoImages로 변경됨) (제공된 경우에만)
    if (concertData.infoImages && Array.isArray(concertData.infoImages)) {
      concertData.infoImages.forEach((infoImage, index) => {
        if (typeof infoImage !== "string" || infoImage.trim().length === 0) {
          errors.push(
            `infoImages[${index}]는 비어있지 않은 문자열이어야 합니다.`
          );
        }
        if (infoImage && !imageUrlPattern.test(infoImage)) {
          errors.push(`infoImages[${index}]는 유효한 이미지 URL이어야 합니다.`);
        }
      });
    }

    if (concertData.ticketLink && Array.isArray(concertData.ticketLink)) {
      concertData.ticketLink.forEach((link, index) => {
        if (!urlPattern.test(link.url)) {
          errors.push(`ticketLink[${index}].url은 유효한 URL이어야 합니다.`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  // 콘서트 생성 (기존 코드 - 변경 없음)
  async create(
    concertData: Omit<IConcert, "createdAt" | "updatedAt">
  ): Promise<IConcert> {
    const validation = this.validateConcertData(concertData, false); // isUpdate = false
    if (!validation.isValid) {
      throw new Error(`유효성 검사 실패: ${validation.errors.join(", ")}`);
    }

    const now = new Date();
    const concert: IConcert = {
      ...concertData,
      status: concertData.status || "upcoming",
      likes: concertData.likes || [], // 기본값 설정
      likesCount: concertData.likesCount || 0, // 기본값 설정
      createdAt: now,
      updatedAt: now,
    };

    // datetime 배열을 Date 객체로 변환
    if (concert.datetime) {
      concert.datetime = concert.datetime.map((dt) =>
        dt instanceof Date ? dt : new Date(dt)
      );
    }

    // ticketOpenDate 처리 (새로 추가)
    if (concert.ticketOpenDate && !(concert.ticketOpenDate instanceof Date)) {
      concert.ticketOpenDate = new Date(concert.ticketOpenDate);
    }

    const result = await this.collection.insertOne(concert);
    if (!result.insertedId) {
      throw new Error("콘서트 생성에 실패했습니다.");
    }

    return concert;
  }

  // ID로 콘서트 조회 (ObjectId 또는 UID)
  async findById(id: string): Promise<IConcert | null> {
    let query: any;

    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { uid: id };
    }

    return await this.collection.findOne(query);
  }

  // UID로 콘서트 조회
  async findByUid(uid: string): Promise<IConcert | null> {
    return await this.collection.findOne({ uid });
  }

  // 콘서트 목록 조회 (페이지네이션 포함)
  async findMany(
    filter: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {}
  ): Promise<{ concerts: IConcert[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sort = { datetime: 1, createdAt: -1 },
    } = options;
    const skip = (page - 1) * limit;

    const [concerts, total] = await Promise.all([
      this.collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { concerts, total };
  }

  // 콘서트 업데이트 (수정됨 - isUpdate = true로 유효성 검사)
  async updateById(
    id: string,
    updateData: Partial<IConcert>
  ): Promise<IConcert | null> {
    // 수정 불가능한 필드 제거
    if (updateData.uid) delete updateData.uid;
    if (updateData.likes) delete updateData.likes;
    if (updateData.likesCount) delete updateData.likesCount;

    const validation = this.validateConcertData(updateData, true); // isUpdate = true
    if (!validation.isValid) {
      throw new Error(`유효성 검사 실패: ${validation.errors.join(", ")}`);
    }

    updateData.updatedAt = new Date();

    // datetime 배열 처리
    if (updateData.datetime && Array.isArray(updateData.datetime)) {
      updateData.datetime = updateData.datetime.map((dt) => new Date(dt));
    }

    // ticketOpenDate 처리 (새로 추가)
    if (
      updateData.ticketOpenDate &&
      !(updateData.ticketOpenDate instanceof Date)
    ) {
      updateData.ticketOpenDate = new Date(updateData.ticketOpenDate);
    }

    let query: any;
    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { uid: id };
    }

    const result = await this.collection.findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: "after" }
    );

    return result ? result : null;
  }

  // 콘서트 삭제
  async deleteById(id: string): Promise<IConcert | null> {
    let query: any;
    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { uid: id };
    }

    const result = await this.collection.findOneAndDelete(query);
    return result ? result : null;
  }

  // ==================== 좋아요 시스템 메서드들 ====================

  // 좋아요 추가
  async addLike(concertId: string, userId: string): Promise<IConcert> {
    if (!userId) {
      throw new Error("사용자 ID는 필수입니다.");
    }

    let query: any;
    if (ObjectId.isValid(concertId)) {
      query = { _id: new ObjectId(concertId) };
    } else {
      query = { uid: concertId };
    }

    const userObjectId = new ObjectId(userId);
    const now = new Date();

    // 먼저 콘서트가 존재하는지 확인
    const existingConcert = await this.collection.findOne(query);
    if (!existingConcert) {
      throw new Error("콘서트를 찾을 수 없습니다.");
    }

    // 이미 좋아요했는지 확인
    const isAlreadyLiked =
      existingConcert.likes && Array.isArray(existingConcert.likes)
        ? existingConcert.likes.some((like: any) => {
            try {
              return (
                like &&
                like.userId &&
                like.userId.toString() === userId.toString()
              );
            } catch (error) {
              console.warn("좋아요 중복 검사 중 에러:", error);
              return false;
            }
          })
        : false;

    if (isAlreadyLiked) {
      throw new Error("이미 좋아요한 콘서트입니다.");
    }

    const result = await this.collection.findOneAndUpdate(
      query,
      {
        $push: {
          likes: {
            userId: userObjectId,
            likedAt: now,
          },
        },
        $inc: { likesCount: 1 },
        $set: { updatedAt: now },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("좋아요 추가에 실패했습니다.");
    }

    return result;
  }

  // 좋아요 삭제
  async removeLike(concertId: string, userId: string): Promise<IConcert> {
    if (!userId) {
      throw new Error("사용자 ID는 필수입니다.");
    }

    let query: any;
    if (ObjectId.isValid(concertId)) {
      query = { _id: new ObjectId(concertId) };
    } else {
      query = { uid: concertId };
    }

    const userObjectId = new ObjectId(userId);
    const now = new Date();

    // 먼저 콘서트가 존재하는지 확인
    const existingConcert = await this.collection.findOne(query);
    if (!existingConcert) {
      throw new Error("콘서트를 찾을 수 없습니다.");
    }

    const result = await this.collection.findOneAndUpdate(
      query,
      {
        $pull: {
          likes: { userId: userObjectId },
        },
        $inc: { likesCount: -1 },
        $set: { updatedAt: now },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("좋아요 삭제에 실패했습니다.");
    }

    // likesCount가 음수가 되지 않도록 보정
    if (result.likesCount && result.likesCount < 0) {
      await this.collection.updateOne(query, { $set: { likesCount: 0 } });
      result.likesCount = 0;
    }

    return result;
  }

  // 사용자가 좋아요한 콘서트 목록 조회
  async findLikedByUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ concerts: IConcert[]; total: number }> {
    if (!userId) {
      console.log("❌ findLikedByUser: 사용자 ID가 없음");
      return { concerts: [], total: 0 };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(userId);
    } catch (error) {
      console.error("❌ findLikedByUser: 잘못된 사용자 ID 형식:", userId);
      return { concerts: [], total: 0 };
    }

    console.log("🔍 findLikedByUser 검색 조건:", {
      userId,
      userObjectId: userObjectId.toString(),
      page,
      limit,
    });

    try {
      const [concerts, total] = await Promise.all([
        this.collection
          .find({
            "likes.userId": userObjectId,
          })
          .sort({ "likes.likedAt": -1 }) // 좋아요한 시간 기준 내림차순
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.collection.countDocuments({
          "likes.userId": userObjectId,
        }),
      ]);

      console.log("✅ findLikedByUser 결과:", {
        찾은콘서트수: concerts.length,
        전체개수: total,
      });

      return { concerts, total };
    } catch (error) {
      console.error("❌ findLikedByUser 쿼리 실행 에러:", error);
      return { concerts: [], total: 0 };
    }
  }

  // ==================== 배치 처리 메서드들 ====================

  /**
   * 여러 UID로 콘서트 조회 (배치 처리용)
   */
  async findByUids(uids: string[]): Promise<IConcert[]> {
    try {
      if (!Array.isArray(uids) || uids.length === 0) {
        return [];
      }
      return await this.collection.find({ uid: { $in: uids } }).toArray();
    } catch (error) {
      console.error("findByUids 에러:", error);
      return [];
    }
  }

  /**
   * 여러 ID로 콘서트 조회 (배치 처리용)
   */
  async findByIds(ids: string[]): Promise<IConcert[]> {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return [];
      }

      const objectIds = ids
        .map((id) => {
          try {
            return ObjectId.isValid(id) ? new ObjectId(id) : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ObjectId[];

      if (objectIds.length === 0) {
        return [];
      }

      return await this.collection.find({ _id: { $in: objectIds } }).toArray();
    } catch (error) {
      console.error("findByIds 에러:", error);
      return [];
    }
  }

  /**
   * 여러 콘서트 한 번에 삽입 (MongoDB insertMany 사용)
   */
  async insertMany(concerts: any[]): Promise<IConcert[]> {
    try {
      if (!Array.isArray(concerts) || concerts.length === 0) {
        return [];
      }

      // 각 콘서트 데이터 전처리
      const processedConcerts = concerts.map((concert) => {
        const now = new Date();

        // datetime 배열을 Date 객체로 변환
        if (concert.datetime && Array.isArray(concert.datetime)) {
          concert.datetime = concert.datetime.map((dt: any) =>
            dt instanceof Date ? dt : new Date(dt)
          );
        }

        // ticketOpenDate 처리
        if (
          concert.ticketOpenDate &&
          !(concert.ticketOpenDate instanceof Date)
        ) {
          concert.ticketOpenDate = new Date(concert.ticketOpenDate);
        }

        // 기본값 설정
        return {
          ...concert,
          status: concert.status || "upcoming",
          likes: concert.likes || [],
          likesCount: concert.likesCount || 0,
          createdAt: concert.createdAt || now,
          updatedAt: concert.updatedAt || now,
        };
      });

      const options = {
        ordered: false, // 일부 실패해도 나머지 계속 처리
        bypassDocumentValidation: false,
      };

      const result = await this.collection.insertMany(
        processedConcerts,
        options
      );

      // 삽입된 문서들 반환
      const insertedIds = Object.values(result.insertedIds);
      return await this.collection
        .find({ _id: { $in: insertedIds } })
        .toArray();
    } catch (error) {
      console.error("insertMany 에러:", error);
      throw error;
    }
  }

  /**
   * 여러 콘서트 한 번에 삭제
   */
  async deleteByIds(ids: string[]): Promise<number> {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return 0;
      }

      const objectIds = ids
        .map((id) => {
          try {
            return ObjectId.isValid(id) ? new ObjectId(id) : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ObjectId[];

      if (objectIds.length === 0) {
        return 0;
      }

      const result = await this.collection.deleteMany({
        _id: { $in: objectIds },
      });
      return result.deletedCount || 0;
    } catch (error) {
      console.error("deleteByIds 에러:", error);
      return 0;
    }
  }

  /**
   * 여러 콘서트에 대한 좋아요 상태 일괄 조회
   */
  async findLikeStatusBatch(
    concertIds: string[],
    userId: string
  ): Promise<Map<string, boolean>> {
    try {
      if (!Array.isArray(concertIds) || concertIds.length === 0 || !userId) {
        return new Map();
      }

      const objectIds = concertIds
        .map((id) => {
          try {
            return ObjectId.isValid(id) ? new ObjectId(id) : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ObjectId[];

      const userObjectId = new ObjectId(userId);

      const concerts = await this.collection
        .find({ _id: { $in: objectIds } }, { projection: { _id: 1, likes: 1 } })
        .toArray();

      const likeStatusMap = new Map<string, boolean>();

      concerts.forEach((concert) => {
        const isLiked =
          concert.likes?.some(
            (like: any) => like.userId?.toString() === userId.toString()
          ) || false;
        likeStatusMap.set(concert._id.toString(), isLiked);
      });

      return likeStatusMap;
    } catch (error) {
      console.error("findLikeStatusBatch 에러:", error);
      return new Map();
    }
  }

  /**
   * 대량 업데이트를 위한 bulk write 작업
   */
  async bulkWrite(operations: any[]): Promise<any> {
    try {
      if (!Array.isArray(operations) || operations.length === 0) {
        return { modifiedCount: 0, upsertedCount: 0, insertedCount: 0 };
      }

      const options = {
        ordered: false, // 일부 실패해도 나머지 계속 처리
      };

      return await this.collection.bulkWrite(operations, options);
    } catch (error) {
      console.error("bulkWrite 에러:", error);
      throw error;
    }
  }

  /**
   * 배치 좋아요 처리 (성능 최적화)
   */
  async batchLikeOperations(
    operations: Array<{
      concertId: string;
      userId: string;
      action: "add" | "remove";
    }>
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    try {
      if (!Array.isArray(operations) || operations.length === 0) {
        return { success: 0, failed: 0, errors: [] };
      }

      const bulkOps: any[] = [];
      const errors: any[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (const op of operations) {
        try {
          const { concertId, userId, action } = op;

          if (!concertId || !userId || !["add", "remove"].includes(action)) {
            errors.push({
              concertId,
              userId,
              action,
              error: "잘못된 매개변수",
            });
            failedCount++;
            continue;
          }

          let query: any;
          if (ObjectId.isValid(concertId)) {
            query = { _id: new ObjectId(concertId) };
          } else {
            query = { uid: concertId };
          }

          const userObjectId = new ObjectId(userId);
          const now = new Date();

          if (action === "add") {
            bulkOps.push({
              updateOne: {
                filter: {
                  ...query,
                  "likes.userId": { $ne: userObjectId }, // 중복 방지
                },
                update: {
                  $push: { likes: { userId: userObjectId, likedAt: now } },
                  $inc: { likesCount: 1 },
                  $set: { updatedAt: now },
                },
              },
            });
          } else {
            bulkOps.push({
              updateOne: {
                filter: query,
                update: {
                  $pull: { likes: { userId: userObjectId } },
                  $inc: { likesCount: -1 },
                  $set: { updatedAt: now },
                },
              },
            });
          }

          successCount++;
        } catch (error) {
          errors.push({
            concertId: op.concertId,
            userId: op.userId,
            action: op.action,
            error: error instanceof Error ? error.message : "알 수 없는 에러",
          });
          failedCount++;
        }
      }

      if (bulkOps.length > 0) {
        await this.bulkWrite(bulkOps);
      }

      return { success: successCount, failed: failedCount, errors };
    } catch (error) {
      console.error("batchLikeOperations 에러:", error);
      throw error;
    }
  }

  // ==================== 기존 메서드들 ====================

  // 다가오는 콘서트 조회
  async findUpcoming(): Promise<IConcert[]> {
    return await this.collection
      .find({
        datetime: { $elemMatch: { $gte: new Date() } },
        status: { $ne: "cancelled" },
      })
      .sort({ datetime: 1 })
      .toArray();
  }

  // 아티스트별 콘서트 조회
  async findByArtist(artist: string): Promise<IConcert[]> {
    return await this.collection
      .find({
        artist: { $in: [new RegExp(artist, "i")] },
      })
      .sort({ datetime: 1 })
      .toArray();
  }

  // 도시별 콘서트 조회 - location이 이제 string 배열
  async findByLocation(location: string): Promise<IConcert[]> {
    return await this.collection
      .find({
        location: new RegExp(location, "i"),
      })
      .sort({ datetime: 1 })
      .toArray();
  }

  // 텍스트 검색
  async searchConcerts(query: string): Promise<IConcert[]> {
    return await this.collection
      .find(
        { $text: { $search: query } },
        { projection: { score: { $meta: "textScore" } } }
      )
      .sort({ score: { $meta: "textScore" } })
      .toArray();
  }

  // 상태별 콘서트 조회
  async findByStatus(status: IConcert["status"]): Promise<IConcert[]> {
    return await this.collection
      .find({ status })
      .sort({ datetime: 1 })
      .toArray();
  }

  // 카테고리별 콘서트 조회
  async findByCategory(category: string): Promise<IConcert[]> {
    return await this.collection
      .find({
        category: { $in: [category] },
      })
      .sort({ datetime: 1 })
      .toArray();
  }

  // 티켓 오픈 예정 콘서트 조회 (새로 추가)
  async findUpcomingTicketOpen(): Promise<IConcert[]> {
    const now = new Date();
    return await this.collection
      .find({
        ticketOpenDate: { $gte: now },
        status: "upcoming",
      })
      .sort({ ticketOpenDate: 1 })
      .toArray();
  }

  // 콘서트 상태 업데이트 (자동화용)
  async updateExpiredConcerts(): Promise<number> {
    const now = new Date();
    const result = await this.collection.updateMany(
      {
        datetime: { $elemMatch: { $lt: now } },
        status: { $in: ["upcoming", "ongoing"] },
      },
      {
        $set: {
          status: "completed",
          updatedAt: now,
        },
      }
    );

    return result.modifiedCount;
  }

  // 통계 정보 - 좋아요 정보 포함
  async getStats(): Promise<{
    total: number;
    upcoming: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    totalLikes: number;
    averageLikes: number;
  }> {
    const [statusStats, likeStats] = await Promise.all([
      // 상태별 통계
      this.collection
        .aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),

      // 좋아요 통계
      this.collection
        .aggregate([
          {
            $group: {
              _id: null,
              totalLikes: { $sum: "$likesCount" },
              totalConcerts: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const result = {
      total: 0,
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
      totalLikes: 0,
      averageLikes: 0,
    };

    // 상태별 통계 처리
    statusStats.forEach((stat) => {
      result[
        stat._id as keyof Omit<typeof result, "totalLikes" | "averageLikes">
      ] = stat.count;
      result.total += stat.count;
    });

    // 좋아요 통계 처리
    if (likeStats.length > 0) {
      result.totalLikes = likeStats[0].totalLikes || 0;
      result.averageLikes =
        result.total > 0
          ? Math.round((result.totalLikes / result.total) * 100) / 100
          : 0;
    }

    return result;
  }
}

// 전역 Concert 인스턴스를 위한 변수
let concertModel: ConcertModel;

// Concert 모델 초기화 함수
export const initializeConcertModel = (db: Db): ConcertModel => {
  concertModel = new ConcertModel(db);
  return concertModel;
};

// Concert 모델 인스턴스 가져오기
export const getConcertModel = (): ConcertModel => {
  if (!concertModel) {
    throw new Error(
      "Concert 모델이 초기화되지 않았습니다. initializeConcertModel()을 먼저 호출하세요."
    );
  }
  return concertModel;
};

// 편의를 위한 기본 export
export const Concert = {
  init: initializeConcertModel,
  get: getConcertModel,
};
