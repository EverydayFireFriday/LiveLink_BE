import { Collection, ObjectId } from 'mongodb';
import { getDatabase } from '../auth/user';
import logger from '../../utils/logger/logger';

export interface Message {
  _id?: ObjectId;
  chatRoomId: ObjectId;
  senderId: ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  replyToMessageId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export class MessageModel {
  private messageCollection: Collection<Message>;

  constructor() {
    const db = getDatabase();
    this.messageCollection = db.collection<Message>('messages');
    this.createIndexes();
  }

  private async createIndexes() {
    try {
      await this.messageCollection.createIndex({
        chatRoomId: 1,
        createdAt: -1,
      });
      await this.messageCollection.createIndex({ senderId: 1 });
      await this.messageCollection.createIndex({ replyToMessageId: 1 });
    } catch (error) {
      logger.error('Failed to create message indexes:', error);
    }
  }

  async createMessage(
    messageData: Omit<
      Message,
      '_id' | 'createdAt' | 'updatedAt' | 'isEdited' | 'isDeleted'
    >,
  ): Promise<Message> {
    const now = new Date();
    const message: Omit<Message, '_id'> = {
      ...messageData,
      isEdited: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.messageCollection.insertOne(message);
    return {
      _id: result.insertedId,
      ...message,
    };
  }

  async findById(id: string | ObjectId): Promise<Message | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.messageCollection.findOne({
      _id: objectId,
      isDeleted: false,
    });
  }

  async findByChatRoom(
    chatRoomId: string | ObjectId,
    limit: number = 50,
    skip: number = 0,
  ): Promise<Message[]> {
    const objectId =
      typeof chatRoomId === 'string' ? new ObjectId(chatRoomId) : chatRoomId;
    return await this.messageCollection
      .find({ chatRoomId: objectId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  async updateMessage(
    id: string | ObjectId,
    content: string,
  ): Promise<Message | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const now = new Date();

    const result = await this.messageCollection.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      {
        $set: {
          content,
          isEdited: true,
          editedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' },
    );

    return result || null;
  }

  async deleteMessage(id: string | ObjectId): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const now = new Date();

    const result = await this.messageCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        },
      },
    );

    return result.modifiedCount > 0;
  }

  async searchMessages(
    chatRoomId: string | ObjectId,
    searchTerm: string,
    limit: number = 20,
  ): Promise<Message[]> {
    const objectId =
      typeof chatRoomId === 'string' ? new ObjectId(chatRoomId) : chatRoomId;
    const regex = new RegExp(searchTerm, 'i');

    return await this.messageCollection
      .find({
        chatRoomId: objectId,
        content: { $regex: regex },
        isDeleted: false,
      })
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();
  }

  async deleteByUser(userId: string | ObjectId): Promise<number> {
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const now = new Date();

    const result = await this.messageCollection.updateMany(
      { senderId: objectId },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        },
      },
    );

    return result.modifiedCount || 0;
  }

  async deleteByChatRoom(chatRoomId: string | ObjectId): Promise<number> {
    const objectId =
      typeof chatRoomId === 'string' ? new ObjectId(chatRoomId) : chatRoomId;
    const result = await this.messageCollection.deleteMany({
      chatRoomId: objectId,
    });
    return result.deletedCount || 0;
  }
}
