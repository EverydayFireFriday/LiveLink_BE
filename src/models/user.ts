import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// User 인터페이스 정의
export interface User {
  _id?: ObjectId;
  username: string;
  passwordHash: string;
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
      console.log('✅ MongoDB Native Driver connected');
      
      // 인덱스 생성 (username 유니크)
      await this.getUserCollection().createIndex({ username: 1 }, { unique: true });
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('✅ MongoDB disconnected');
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
  async createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();
    const user: Omit<User, '_id'> = {
      ...userData,
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
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  // username으로 사용자 찾기
  async findByUsername(username: string): Promise<User | null> {
    return await this.userCollection.findOne({ username });
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