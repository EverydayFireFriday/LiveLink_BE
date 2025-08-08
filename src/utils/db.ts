import { MongoClient, Db } from "mongodb";
import { initializeConcertModel } from "../models/concert/concert";
import { logger } from "./index";

let client: MongoClient;
let db: Db;

export const connectDB = async (): Promise<Db> => {
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
    const DB_NAME = process.env.MONGO_DB_NAME || "livelink";

    client = new MongoClient(MONGO_URI);
    await client.connect();

    db = client.db(DB_NAME);

    await db.admin().ping();

    logger.info("✅ MongoDB Native Driver connected");
    logger.info(`📍 Database: ${DB_NAME}`);
    logger.info("📚 Collections: users, concerts");

    return db;
  } catch (error) {
    logger.error("❌ MongoDB connection error:", { error });
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    if (client) {
      await client.close();
      logger.info("✅ MongoDB disconnected");
    }
  } catch (error) {
    logger.error("❌ MongoDB disconnect error:", { error });
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

export { initializeConcertModel };

export const connectDatabase = connectDB;
export const disconnectDatabase = disconnectDB;
export const getDatabase = getDB;