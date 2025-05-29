import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export const connectDB = async () => {
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
    
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

export const disconnectDB = async () => {
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