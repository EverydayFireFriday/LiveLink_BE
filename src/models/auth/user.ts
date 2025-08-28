import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import logger from "../../utils/logger";

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
  email: string; // 이메일 필드 추가
  passwordHash: string;
  status: UserStatus;
  statusReason?: string; // 상태 변경 사유 추가
  profileImage?: string; // S3 URL 또는 파일 경로
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB 연결 설정
class Database {
  private static instance: Database;
  private client!: MongoClient; // definite assignment assertion 추가
  private db!: Db; // definite assignment assertion 추가

  private constructor() {
    // constructor에서는 초기화하지 않음
  }

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
      
      // 인덱스 생성 (username과 email 모두 유니크)
      await this.getUserCollection().createIndex({ username: 1 }, { unique: true });
      await this.getUserCollection().createIndex({ email: 1 }, { unique: true });
      await this.getUserCollection().createIndex({ status: 1 });
    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error);
      throw error;
    }
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
  private userCollection: Collection<User>;

  constructor() {
    const db = Database.getInstance();
    this.userCollection = db.getUserCollection();
  }

  // 사용자 생성
  async createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<User> {
    const now = new Date();
    const user: Omit<User, '_id'> = {
      ...userData,
      status: UserStatus.PENDING_VERIFICATION,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await this.userCollection.insertOne(user);
      return {
        _id: result.insertedId,
        ...user,
      };
    } catch (error: any) {
      if (error.code === 11000) {
        // 중복 키 에러 처리 - 어떤 필드가 중복인지 확인
        if (error.keyPattern?.username) {
          throw new Error('Username already exists');
        } else if (error.keyPattern?.email) {
          throw new Error('Email already exists');
        } else {
          throw new Error('Duplicate key error');
        }
      }
      throw error;
    }
  }

  // username으로 사용자 찾기
  async findByUsername(username: string): Promise<User | null> {
    return await this.userCollection.findOne({ username });
  }

  // 이메일로 사용자 찾기 - 새로 추가
  async findByEmail(email: string): Promise<User | null> {
    return await this.userCollection.findOne({ email });
  }

  // 이메일과 username 모두로 사용자 찾기 - 새로 추가
  async findByEmailAndUsername(email: string, username: string): Promise<User | null> {
    return await this.userCollection.findOne({ 
      email, 
      username 
    });
  }

  // ID로 사용자 찾기
  async findById(id: string | ObjectId): Promise<User | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.userCollection.findOne({ _id: objectId });
  }

  // 사용자 정보 업데이트
  async updateUser(id: string | ObjectId, updateData: Partial<Omit<User, '_id' | 'createdAt'>>): Promise<User | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const now = new Date();

    const result = await this.userCollection.findOneAndUpdate(
      { _id: objectId },
      { 
        $set: { 
          ...updateData, 
          updatedAt: now 
        } 
      },
      { returnDocument: 'after' }
    );

    return result || null; // result.value 대신 result 사용
  }

  // 프로필 이미지 업데이트
  async updateProfileImage(id: string | ObjectId, profileImageUrl: string): Promise<User | null> {
    return await this.updateUser(id, { profileImage: profileImageUrl });
  }

  // 비밀번호 업데이트 - 새로 추가
  async updatePassword(id: string | ObjectId, passwordHash: string): Promise<User | null> {
    return await this.updateUser(id, { passwordHash });
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
      $or: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    });
  }

  // 사용자 검색 (부분 일치) - 새로 추가
  async searchUsers(searchTerm: string, limit: number = 20): Promise<User[]> {
    const regex = new RegExp(searchTerm, 'i'); // 대소문자 구분 없이
    return await this.userCollection
      .find({
        $or: [
          { username: { $regex: regex } },
          { email: { $regex: regex } }
        ]
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
          $lte: endDate
        }
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // 마지막 활동 시간 업데이트 - 새로 추가
  async updateLastActivity(id: string | ObjectId): Promise<User | null> {
    return await this.updateUser(id, { updatedAt: new Date() });
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