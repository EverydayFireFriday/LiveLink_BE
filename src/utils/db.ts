import { MongoClient, Db } from 'mongodb';
import { initializeConcertModel } from '../models/concert';

let client: MongoClient;
let db: Db;

export const connectDB = async (): Promise<Db> => {
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
    const DB_NAME = process.env.MONGO_DB_NAME || "livelink";
    
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    db = client.db(DB_NAME);
    
    // 연결 테스트
    await db.admin().ping();
    
    console.log("✅ MongoDB Native Driver connected");
    console.log(`📍 Database: ${DB_NAME}`);
    console.log("📚 Collections: users, concerts");
    
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    if (client) {
      await client.close();
      console.log("✅ MongoDB disconnected");
    }
  } catch (error) {
    console.error("❌ MongoDB disconnect error:", error);
    throw error;
  }
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return db;
};

export const getClient = (): MongoClient => {
  if (!client) {
    throw new Error("Client not connected. Call connectDB() first.");
  }
  return client;
};

// Concert 모델 초기화를 위해 export
export { initializeConcertModel };

// 편의를 위한 별칭들
export const connectDatabase = connectDB;
export const disconnectDatabase = disconnectDB;
export const getDatabase = getDB;