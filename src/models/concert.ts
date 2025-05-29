import { ObjectId, Collection, Db } from "mongodb";

// Location 인터페이스
export interface ILocation {
  venue: string;
  address: string;
  city: string;
}

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

// Partner Link 인터페이스
export interface IPartnerLink {
  name: string;
  url: string;
  address: string;
}

// Concert 메인 인터페이스
export interface IConcert {
  _id: ObjectId;
  uid: string; // 사용자 지정 ID (timestamp 포함)
  title: string;
  artist: string[];
  location: ILocation[];
  datetime: Date[];
  price?: IPrice[];
  description?: string;
  category?: string[];
  ticketLink?: ITicketLink[];
  partnerLinks?: IPartnerLink[];
  posterImage?: string; // S3 URL
  galleryImages?: string[]; // S3 URLs 배열
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  tags?: string[];
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
    this.createIndexes();
  }

  // 인덱스 생성 - 수정된 버전 (parallel arrays 문제 해결)
  private async createIndexes() {
    try {
      console.log("Concert 인덱스 생성 시작...");

      // 기본 단일 필드 인덱스들
      await this.collection.createIndex({ uid: 1 }, { unique: true });
      console.log("✅ uid 인덱스 생성");

      await this.collection.createIndex({ artist: 1 });
      console.log("✅ artist 인덱스 생성");

      await this.collection.createIndex({ "location.city": 1 });
      console.log("✅ location.city 인덱스 생성");

      await this.collection.createIndex({ datetime: 1 });
      console.log("✅ datetime 인덱스 생성");

      await this.collection.createIndex({ category: 1 });
      console.log("✅ category 인덱스 생성");

      await this.collection.createIndex({ status: 1 });
      console.log("✅ status 인덱스 생성");

      await this.collection.createIndex({ createdAt: 1 });
      console.log("✅ createdAt 인덱스 생성");

      // 안전한 복합 인덱스들 (parallel arrays 제외)
      // ❌ 제거: { datetime: 1, artist: 1 } - 둘 다 배열이라 불가능
      
      await this.collection.createIndex({ "location.city": 1, status: 1 });
      console.log("✅ location.city + status 복합 인덱스 생성");

      await this.collection.createIndex({ status: 1, datetime: 1 });
      console.log("✅ status + datetime 복합 인덱스 생성");

      await this.collection.createIndex({ status: 1, createdAt: -1 });
      console.log("✅ status + createdAt 복합 인덱스 생성");

      await this.collection.createIndex({ createdAt: -1, status: 1 });
      console.log("✅ createdAt + status 복합 인덱스 생성");

      // 텍스트 검색 인덱스
      await this.collection.createIndex({
        title: "text",
        artist: "text",
        "location.venue": "text",
        description: "text",
      });
      console.log("✅ 텍스트 검색 인덱스 생성");

      console.log("🎉 Concert 컬렉션 인덱스 생성 완료");
    } catch (error) {
      console.error("❌ 인덱스 생성 중 오류:", error);
      // 인덱스 생성 실패해도 계속 진행
      console.log("⚠️ 인덱스 없이 계속 진행합니다...");
    }
  }

  // 데이터 유효성 검사 - 카테고리 확장
  private validateConcertData(concertData: Partial<IConcert>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 필수 필드 검사
    if (!concertData.uid) errors.push("uid는 필수입니다.");
    if (!concertData.title || concertData.title.trim().length === 0) {
      errors.push("title은 필수입니다.");
    }
    if (
      !concertData.artist ||
      !Array.isArray(concertData.artist) ||
      concertData.artist.length === 0
    ) {
      errors.push("artist는 비어있지 않은 배열이어야 합니다.");
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

    // 길이 제한 검사
    if (concertData.title && concertData.title.length > 200) {
      errors.push("title은 200자를 초과할 수 없습니다.");
    }
    if (concertData.description && concertData.description.length > 2000) {
      errors.push("description은 2000자를 초과할 수 없습니다.");
    }

    // location 필드 검증
    if (concertData.location && Array.isArray(concertData.location)) {
      concertData.location.forEach((loc, index) => {
        if (!loc.venue || loc.venue.trim().length === 0) {
          errors.push(`location[${index}].venue은 필수입니다.`);
        }
        if (!loc.address || loc.address.trim().length === 0) {
          errors.push(`location[${index}].address는 필수입니다.`);
        }
        if (loc.venue && loc.venue.length > 150) {
          errors.push(`location[${index}].venue은 150자를 초과할 수 없습니다.`);
        }
      });
    }

    // datetime 검증 - 타입 안전성 개선
    if (concertData.datetime && Array.isArray(concertData.datetime)) {
      concertData.datetime.forEach((dt, index) => {
        if (!(dt instanceof Date)) {
          const dateValue = typeof dt === 'string' || typeof dt === 'number' ? dt : String(dt);
          if (!Date.parse(dateValue)) {
            errors.push(`datetime[${index}]는 유효한 날짜여야 합니다.`);
          }
        }
      });
    }

    // category 검증 - 확장된 카테고리 목록
    const validCategories = [
      // 기본 장르
      "pop", "rock", "jazz", "classical", "hiphop", "electronic", 
      "indie", "folk", "r&b", "country", "musical", "opera",
      
      // K-POP 및 아시아 음악
      "k-pop", "kpop", "j-pop", "c-pop", "korean", "japanese",
      
      // 세부 장르
      "ballad", "dance", "trot", "rap", "hip-hop", "edm", 
      "house", "techno", "dubstep", "reggae", "blues", "soul", 
      "funk", "punk", "metal", "alternative", "grunge",
      
      // 기타
      "fusion", "world", "latin", "gospel", "new-age", 
      "ambient", "instrumental", "acoustic", "live", 
      "concert", "festival", "other"
    ];

    if (concertData.category && Array.isArray(concertData.category)) {
      concertData.category.forEach((cat, index) => {
        // 대소문자 무시하고 검사
        const normalizedCat = cat.toLowerCase().trim();
        const isValid = validCategories.some(validCat => 
          validCat.toLowerCase() === normalizedCat
        );
        
        if (!isValid) {
          errors.push(`category[${index}] '${cat}'는 유효한 카테고리가 아닙니다.`);
          console.log(`💡 허용된 카테고리: ${validCategories.slice(0, 10).join(', ')}... (총 ${validCategories.length}개)`);
        }
      });
    }

    // URL 검증
    const urlPattern = /^https?:\/\/.+/;
    const imageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

    if (concertData.posterImage && !imageUrlPattern.test(concertData.posterImage)) {
      errors.push("posterImage는 유효한 이미지 URL이어야 합니다.");
    }

    if (concertData.galleryImages && Array.isArray(concertData.galleryImages)) {
      concertData.galleryImages.forEach((img, index) => {
        if (!imageUrlPattern.test(img)) {
          errors.push(`galleryImages[${index}]는 유효한 이미지 URL이어야 합니다.`);
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

    if (concertData.partnerLinks && Array.isArray(concertData.partnerLinks)) {
      concertData.partnerLinks.forEach((partner, index) => {
        if (!urlPattern.test(partner.url)) {
          errors.push(`partnerLinks[${index}].url은 유효한 URL이어야 합니다.`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  // 콘서트 생성 - 수정된 버전
  async create(
    concertData: Omit<IConcert, "createdAt" | "updatedAt">
  ): Promise<IConcert> {
    const validation = this.validateConcertData(concertData);
    if (!validation.isValid) {
      throw new Error(`유효성 검사 실패: ${validation.errors.join(", ")}`);
    }

    const now = new Date();
    const concert: IConcert = {
      ...concertData,
      status: concertData.status || "upcoming",
      createdAt: now,
      updatedAt: now,
    };

    // datetime 배열을 Date 객체로 변환
    if (concert.datetime) {
      concert.datetime = concert.datetime.map((dt) => 
        dt instanceof Date ? dt : new Date(dt)
      );
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

  // 콘서트 업데이트
  async updateById(
    id: string,
    updateData: Partial<IConcert>
  ): Promise<IConcert | null> {
    // uid 수정 방지
    if (updateData.uid) {
      delete updateData.uid;
    }

    const validation = this.validateConcertData(updateData);
    if (!validation.isValid) {
      throw new Error(`유효성 검사 실패: ${validation.errors.join(", ")}`);
    }

    updateData.updatedAt = new Date();

    // datetime 배열 처리
    if (updateData.datetime && Array.isArray(updateData.datetime)) {
      updateData.datetime = updateData.datetime.map((dt) => new Date(dt));
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

  // 도시별 콘서트 조회
  async findByCity(city: string): Promise<IConcert[]> {
    return await this.collection
      .find({
        "location.city": new RegExp(city, "i"),
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

  // 통계 정보
  async getStats(): Promise<{
    total: number;
    upcoming: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  }> {
    const stats = await this.collection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const result = {
      total: 0,
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
    };

    stats.forEach((stat) => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
    });

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