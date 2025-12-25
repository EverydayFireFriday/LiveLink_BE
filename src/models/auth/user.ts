import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import logger from '../../utils/logger/logger';
import { getDB } from '../../utils/database/db';
import {
  getMongoClientOptions,
  getMongoConnectionString,
  getMongoDatabaseName,
  setupMongoMonitoring,
} from '../../config/database/mongoConfig';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification',
  PENDING_REGISTRATION = 'pending_registration', // OAuth 가입 후 추가 정보 입력 대기
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

// 약관 동의 정보 인터페이스 (배열 구조)
export interface TermsConsent {
  type: string; // 'terms' | 'privacy' | 'marketing'
  isAgreed: boolean;
  version: string;
  agreedAt?: Date;
}

// 알림 설정 인터페이스
export interface NotificationPreference {
  ticketOpenNotification: number[]; // 티켓 오픈 알림 시간 (분 단위) - 예: [10, 30, 60, 1440]
  concertStartNotification: number[]; // 공연 시작 알림 시간 (분 단위) - 예: [60, 180, 1440]
}

// OAuth Provider 정보 인터페이스
export interface OAuthProvider {
  provider: 'google' | 'apple'; // OAuth 제공자
  socialId: string; // OAuth 제공자에서 받은 고유 ID
  email?: string; // OAuth에서 받은 이메일
  linkedAt: Date; // 연동 시간
}

// User 인터페이스 정의 - 이메일 필드 추가
export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  name?: string; // 실명 (OAuth 사용자의 경우 선택적)
  birthDate?: Date; // 생년월일 (OAuth 사용자의 경우 선택적)
  passwordHash?: string; // 소셜 로그인을 위해 선택적으로 변경
  status: UserStatus;
  statusReason?: string; // 상태 변경 사유 추가
  profileImage?: string; // S3 URL 또는 파일 경로
  role?: UserRole; // 사용자 권한 레벨 (마이그레이션 중에는 선택적)

  // 약관 동의 관련 (배열 구조)
  termsConsents: TermsConsent[]; // 모든 약관 동의 정보를 배열로 관리

  createdAt: Date;
  updatedAt: Date;

  // OAuth 관련 (여러 OAuth 제공자 동시 연동 가능)
  oauthProviders?: OAuthProvider[]; // OAuth 제공자 목록 (Google, Apple 등)

  likedConcerts?: ObjectId[]; // 좋아요한 콘서트
  likedArticles?: ObjectId[]; // 좋아요한 게시글
  fcmToken?: string; // FCM 푸시 알림 토큰
  fcmTokenUpdatedAt?: Date; // FCM 토큰 업데이트 시간

  // 알림 설정
  notificationPreference?: NotificationPreference; // 알림 설정 (기본값: ticketOpenNotification=[10, 30, 60, 1440], concertStartNotification=[60, 180, 1440])
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

// 사용자 검색 필터 타입 (birthDate를 Date 또는 string으로 허용)
interface UserBirthDateFilter {
  name: string;
  $or: Array<
    { birthDate: { $gte: Date; $lte: Date } } | { birthDate: Date | string }
  >;
}

// MongoDB 연결 설정
export class Database {
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
      const MONGO_URI = getMongoConnectionString();
      const DB_NAME = getMongoDatabaseName();
      const clientOptions = getMongoClientOptions();

      this.client = new MongoClient(MONGO_URI, clientOptions);

      // Connection pool 모니터링 설정
      setupMongoMonitoring(this.client);

      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      logger.info('✅ MongoDB Native Driver connected (User DB)');

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
    await userCollection.createIndex({ role: 1 }); // role 인덱스 추가

    // OAuth 제공자 인덱스 (oauthProviders 배열)
    // provider와 socialId 조합이 고유해야 함
    await userCollection.createIndex(
      { 'oauthProviders.provider': 1, 'oauthProviders.socialId': 1 },
      {
        unique: true,
        sparse: true,
        name: 'oauth_provider_social_id_unique',
      },
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

  public getClient(): MongoClient {
    if (!this.client) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.client;
  }

  public getUserCollection(): Collection<User> {
    return this.getDb().collection<User>('users');
  }
}

// User 관련 데이터베이스 operations
export class UserModel {
  public userCollection: Collection<User>;

  constructor() {
    // db.ts의 getDB()를 사용하여 같은 클라이언트 사용
    const db = getDB();
    this.userCollection = db.collection<User>('users');
  }

  // 사용자 생성
  async createUser(
    userData: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'status'>,
  ): Promise<User> {
    const now = new Date();
    const user: Omit<User, '_id'> = {
      ...userData,
      status: UserStatus.PENDING_VERIFICATION,
      role: userData.role || UserRole.USER, // role 기본값 설정
      likedConcerts: [],
      likedArticles: [],
      termsConsents: userData.termsConsents || [], // 배열 초기화
      notificationPreference: userData.notificationPreference || {
        ticketOpenNotification: [10, 30, 60, 1440],
        concertStartNotification: [60, 180, 1440],
      }, // 알림 설정 기본값
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
        // 🚀 최적화 1: 먼저 match로 필터링 (인덱스 활용)
        { $match: { email: email } },
        { $limit: 1 }, // 조기 limit로 불필요한 처리 방지
        // 🚀 최적화 2: $lookup에서 필요한 필드만 조회
        {
          $lookup: {
            from: 'concerts',
            localField: 'likedConcerts',
            foreignField: '_id',
            as: 'likedConcertsInfo',
            // 필요한 필드만 가져오기 (projection)
            pipeline: [
              {
                $project: {
                  _id: 1,
                  uid: 1,
                  title: 1,
                  artist: 1,
                  datetime: 1,
                  location: 1,
                  posterImage: 1,
                  likesCount: 1,
                  status: 1,
                  category: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'articles',
            localField: 'likedArticles',
            foreignField: '_id',
            as: 'likedArticlesInfo',
            // 필요한 필드만 가져오기 (projection)
            pipeline: [
              {
                $project: {
                  _id: 1,
                  title: 1,
                  author: 1,
                  createdAt: 1,
                  likesCount: 1,
                  views: 1,
                  category: 1,
                },
              },
            ],
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
      ])
      .toArray();

    return (results[0] as User) || null;
  }

  // Provider와 Social ID로 사용자 찾기 (DEPRECATED - 호환성 유지)
  async findByProviderAndSocialId(
    provider: string,
    socialId: string,
  ): Promise<User | null> {
    // 새로운 oauthProviders 구조에서 찾기
    return await this.userCollection.findOne({
      oauthProviders: {
        $elemMatch: {
          provider: provider as 'google' | 'apple',
          socialId: socialId,
        },
      },
    });
  }

  // OAuth Provider로 사용자 찾기 (새로운 메서드)
  async findByOAuthProvider(
    provider: 'google' | 'apple',
    socialId: string,
  ): Promise<User | null> {
    return await this.userCollection.findOne({
      oauthProviders: {
        $elemMatch: {
          provider,
          socialId,
        },
      },
    });
  }

  // 기존 사용자에게 OAuth Provider 추가
  async addOAuthProvider(
    userId: ObjectId,
    oauthProvider: OAuthProvider,
  ): Promise<User | null> {
    return await this.updateUser(userId, {
      $addToSet: { oauthProviders: oauthProvider },
    });
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

  // FCM 토큰으로 사용자 찾기
  async findByFcmToken(fcmToken: string): Promise<User | null> {
    return await this.userCollection.findOne({ fcmToken });
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
  async findByNameAndBirthDate(name: string, birthDate: Date): Promise<User[]> {
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

    const filter: UserBirthDateFilter = {
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
          birthDate: birthDateString,
        },
      ],
    };

    return await this.userCollection
      .find(filter as Parameters<typeof this.userCollection.find>[0])
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

// 데이터베이스 인스턴스(싱글톤) 가져오기
export function getDatabaseInstance(): Database {
  return Database.getInstance();
}
