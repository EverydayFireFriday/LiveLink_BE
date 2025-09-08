import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../auth/user';
import logger from '../../utils/logger/logger';

export interface ChatRoom {
  _id?: ObjectId;
  name: string;
  description?: string;
  isPrivate: boolean;
  participants: ObjectId[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  messageCount: number;
}

export class ChatRoomModel {
  private chatRoomCollection: Collection<ChatRoom>;

  constructor() {
    const db = getDatabase();
    this.chatRoomCollection = db.collection<ChatRoom>('chatRooms');
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      await this.chatRoomCollection.createIndex({ createdBy: 1 });
      await this.chatRoomCollection.createIndex({ participants: 1 });
      await this.chatRoomCollection.createIndex({ lastActivity: -1 });
    } catch (error) {
      logger.error('Failed to create chat room indexes:', error);
    }
  }

  async createChatRoom(
    roomData: Omit<
      ChatRoom,
      '_id' | 'createdAt' | 'updatedAt' | 'lastActivity' | 'messageCount'
    >,
  ): Promise<ChatRoom> {
    const now = new Date();
    const chatRoom: Omit<ChatRoom, '_id'> = {
      ...roomData,
      createdAt: now,
      updatedAt: now,
      lastActivity: now,
      messageCount: 0,
    };

    const result = await this.chatRoomCollection.insertOne(chatRoom);
    return {
      _id: result.insertedId,
      ...chatRoom,
    };
  }

  async findById(id: string | ObjectId): Promise<ChatRoom | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.chatRoomCollection.findOne({ _id: objectId });
  }

  async findByParticipant(userId: string | ObjectId): Promise<ChatRoom[]> {
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return await this.chatRoomCollection
      .find({ participants: objectId })
      .sort({ lastActivity: -1 })
      .toArray();
  }

  async addParticipant(
    roomId: string | ObjectId,
    userId: string | ObjectId,
  ): Promise<ChatRoom | null> {
    const roomObjectId =
      typeof roomId === 'string' ? new ObjectId(roomId) : roomId;
    const userObjectId =
      typeof userId === 'string' ? new ObjectId(userId) : userId;

    const result = await this.chatRoomCollection.findOneAndUpdate(
      { _id: roomObjectId },
      {
        $addToSet: { participants: userObjectId },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' },
    );

    return result || null;
  }

  async removeParticipant(
    roomId: string | ObjectId,
    userId: string | ObjectId,
  ): Promise<ChatRoom | null> {
    const roomObjectId =
      typeof roomId === 'string' ? new ObjectId(roomId) : roomId;
    const userObjectId =
      typeof userId === 'string' ? new ObjectId(userId) : userId;

    const result = await this.chatRoomCollection.findOneAndUpdate(
      { _id: roomObjectId },
      {
        $pull: { participants: userObjectId },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' },
    );

    return result || null;
  }

  async updateLastActivity(roomId: string | ObjectId): Promise<void> {
    const objectId = typeof roomId === 'string' ? new ObjectId(roomId) : roomId;
    await this.chatRoomCollection.updateOne(
      { _id: objectId },
      {
        $set: { lastActivity: new Date() },
        $inc: { messageCount: 1 },
      },
    );
  }

  async deleteChatRoom(roomId: string | ObjectId): Promise<boolean> {
    const objectId = typeof roomId === 'string' ? new ObjectId(roomId) : roomId;
    const result = await this.chatRoomCollection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  async findPublicRooms(
    limit: number = 20,
    skip: number = 0,
  ): Promise<ChatRoom[]> {
    return await this.chatRoomCollection
      .find({ isPrivate: false })
      .sort({ lastActivity: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async searchRooms(
    searchTerm: string,
    limit: number = 20,
  ): Promise<ChatRoom[]> {
    const regex = new RegExp(searchTerm, 'i');
    return await this.chatRoomCollection
      .find({
        isPrivate: false,
        $or: [{ name: { $regex: regex } }, { description: { $regex: regex } }],
      })
      .limit(limit)
      .sort({ lastActivity: -1 })
      .toArray();
  }
}
