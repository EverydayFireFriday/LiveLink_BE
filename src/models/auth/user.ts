import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification',
}

// User 인터페이스 정의 - 이메일 필드 추가
export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  name: string; // 실명
  birthDate: Date; // 생년월일
  passwordHash?: string; // 소셜 로그인을 위해 선택적으로 변경
  status: UserStatus;
  statusReason?: string; // 상태 변경 사유 추가
  profileImage?: string; // S3 URL 또는 파일 경로
  isTermsAgreed: boolean; // 약관 동의 여부 추가
  termsVersion: string; // 약관 버전 추가
  createdAt: Date;
  updatedAt: Date;
  provider?: string; // ex: 'google', 'apple'
  socialId?: string; // 소셜 로그인 ID
  likedConcerts?: ObjectId[]; // 좋아요한 콘서트
  likedArticles?: ObjectId[]; // 좋아요한 게시글
}

// MongoDB 에러 타입 정의
interface MongoDBDuplicateError {
  code?: number;
  keyPattern?: {
    username?: number;
    email?: number;
    [key: string]: number | undefined;
  };
}

// MongoDB 연결 설정
class Database {
  private static instance: Database;
  private client!: MongoClient;
  private db!: Db;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      this.client = new MongoClient(process.env.MONGO_URI as string);
      await this.client.connect();
      this.db = this.client.db(process.env.MONGO_DB_NAME || 'livelink');
      logger.info('✅ MongoDB Native Driver connected');

      // 인덱스 생성
      await this.setupIndexes();
    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  private async setupIndexes(): Promise<void> {
    const userCollection = this.getUserCollection();
    await userCollection.createIndex({ username: 1 }, { unique: true });
    await userCollection.createIndex({ email: 1 }, { unique: true });
    await userCollection.createIndex({ status: 1 });
    // 소셜 로그인을 위한 인덱스. provider와 socialId 필드가 있는 문서에만 적용됩니다.
    await userCollection.createIndex(
      { provider: 1, socialId: 1 },
      { unique: true, sparse: true },
    );
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      logger.info('✅ MongoDB disconnected');
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public getUserCollection(): Collection<User> {
    return this.getDb().collection<User>('users');
  }
}

// User 관련 데이터베이스 operations
export class UserModel {
  public userCollection: Collection<User>;

  constructor() {
    const db = Database.getInstance();
    this.userCollection = db.getUserCollection();
  }

  // 사용자 생성
  async createUser(
    userData: Omit<
      User,
      '_id' | 'createdAt' | 'updatedAt' | 'status' | 'termsVersion'
    > & { isTermsAgreed: boolean; termsVersion: string },
  ): Promise<User> {
    const now = new Date();
    const user: Omit<User, '_id'> = {
      ...userData,
      status: UserStatus.PENDING_VERIFICATION,
      likedConcerts: [],
      likedArticles: [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await this.userCollection.insertOne(user);
      return {
        _id: result.insertedId,
        ...user,
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as MongoDBDuplicateError).code === 11000
      ) {
        const mongoError = error as MongoDBDuplicateError;
        if (mongoError.keyPattern?.username) {
          throw new Error('Username already exists');
        } else if (mongoError.keyPattern?.email) {
          throw new Error('Email already exists');
        } else {
          throw new Error('Duplicate key error');
        }
      }
      // Re-throw if it's not a known MongoDB duplicate key error
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('An unknown error occurred during user creation.');
      }
    }
  }

  // username으로 사용자 찾기
  async findByUsername(username: string): Promise<User | null> {
    return await this.userCollection.findOne({ username });
  }

  // 이메일로 사용자 찾기
  async findByEmail(email: string): Promise<User | null> {
    return await this.userCollection.findOne({ email });
  }

  // 이메일로 사용자 찾기 (좋아요 목록 포함)
  async findByEmailWithLikes(email: string): Promise<User | null> {
    const results = await this.userCollection
      .aggregate([
        { $match: { email: email } },
        {
          $lookup: {
            from: 'concerts',
            localField: 'likedConcerts',
            foreignField: '_id',
            as: 'likedConcertsInfo',
          },
        },
        {
          $lookup: {
            from: 'articles',
            localField: 'likedArticles',
            foreignField: '_id',
            as: 'likedArticlesInfo',
          },
        },
        {
          $addFields: {
            likedConcerts: '$likedConcertsInfo',
            likedArticles: '$likedArticlesInfo',
          },
        },
        {
          $project: {
            likedConcertsInfo: 0,
            likedArticlesInfo: 0,
          },
        },
        { $limit: 1 },
      ])
      .toArray();

    return (results[0] as User) || null;
  }

  // Provider와 Social ID로 사용자 찾기
  async findByProviderAndSocialId(
    provider: string,
    socialId: string,
  ): Promise<User | null> {
    return await this.userCollection.findOne({ provider, socialId });
  }

  // 이메일과 username 모두로 사용자 찾기
  async findByEmailAndUsername(
    email: string,
    username: string,
  ): Promise<User | null> {
    return await this.userCollection.findOne({
      email,
      username,
    });
  }

  // ID로 사용자 찾기
  async findById(id: string | ObjectId): Promise<User | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.userCollection.findOne({ _id: objectId });
  }

  // 사용자 정보 업데이트
  async updateUser(
    id: string | ObjectId,
    updateOperation: object,
  ): Promise<User | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;

    // Ensure updatedAt is always updated
    const updateQuery = { ...updateOperation } as Record<string, unknown>;
    if (!updateQuery.$set) {
      updateQuery.$set = {};
    }
    (updateQuery.$set as Record<string, unknown>).updatedAt = new Date();

    const result = await this.userCollection.findOneAndUpdate(
      { _id: objectId },
      updateQuery as Parameters<typeof this.userCollection.findOneAndUpdate>[1],
      { returnDocument: 'after' },
    );

    return result || null;
  }

  // 프로필 이미지 업데이트
  async updateProfileImage(
    id: string | ObjectId,
    profileImageUrl: string,
  ): Promise<User | null> {
    return await this.updateUser(id, {
      $set: { profileImage: profileImageUrl },
    });
  }

  // 비밀번호 업데이트 - 새로 추가
  async updatePassword(
    id: string | ObjectId,
    passwordHash: string,
  ): Promise<User | null> {
    return await this.updateUser(id, { $set: { passwordHash } });
  }

  // 사용자 삭제
  async deleteUser(id: string | ObjectId): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.userCollection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  // 모든 사용자 조회 (관리자용)
  async findAllUsers(limit: number = 50, skip: number = 0): Promise<User[]> {
    return await this.userCollection
      .find({})
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .toArray();
  }

  // 사용자 수 조회
  async countUsers(): Promise<number> {
    return await this.userCollection.countDocuments();
  }

  // username 중복 확인
  async isUsernameExists(username: string): Promise<boolean> {
    const count = await this.userCollection.countDocuments({ username });
    return count > 0;
  }

  // 이메일 중복 확인 - 새로 추가
  async isEmailExists(email: string): Promise<boolean> {
    const count = await this.userCollection.countDocuments({ email });
    return count > 0;
  }

  // 이메일 또는 username으로 사용자 찾기 - 새로 추가 (로그인 시 유용)
  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return await this.userCollection.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
  }

  // 사용자 검색 (부분 일치) - 새로 추가
  async searchUsers(searchTerm: string, limit: number = 20): Promise<User[]> {
    const regex = new RegExp(searchTerm, 'i'); // 대소문자 구분 없이
    return await this.userCollection
      .find({
        $or: [{ username: { $regex: regex } }, { email: { $regex: regex } }],
      })
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
  }

  // 특정 기간 내 가입한 사용자 조회 - 새로 추가
  async findUsersByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    return await this.userCollection
      .find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // 마지막 활동 시간 업데이트 - 새로 추가
  async updateLastActivity(id: string | ObjectId): Promise<User | null> {
    return await this.updateUser(id, { updatedAt: new Date() });
  }

  // 이름과 생년월일로 사용자 찾기 (이메일 찾기 기능)
  async findByNameAndBirthDate(
    name: string,
    birthDate: Date,
  ): Promise<User[]> {
    // UTC 기준으로 해당 날짜 범위 계산
    const startOfDay = new Date(birthDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(birthDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // ISO 문자열 형식으로도 검색 (문자열로 저장된 경우 대비)
    const birthDateString = birthDate.toISOString();

    logger.info(
      `[UserModel] Searching users with name: "${name}", birthDate range: ${startOfDay.toISOString()} ~ ${endOfDay.toISOString()}, or exact string: ${birthDateString}`,
    );

    return await this.userCollection
      .find({
        name,
        $or: [
          // Date 타입으로 저장된 경우
          {
            birthDate: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
          // 문자열로 저장된 경우 (ISO 형식)
          {
            birthDate: birthDateString as any,
          },
        ],
      } as any)
      .toArray();
  }
}

// 데이터베이스 연결 함수
export async function connectDatabase(): Promise<void> {
  const db = Database.getInstance();
  await db.connect();
}

// 데이터베이스 연결 해제 함수
export async function disconnectDatabase(): Promise<void> {
  const db = Database.getInstance();
  await db.disconnect();
}

// 데이터베이스 인스턴스 가져오기
export function getDatabase(): Db {
  return Database.getInstance().getDb();
}
