import { Db } from 'mongodb';
import { Migration } from '../utils/database/migrations';
import logger from '../utils/logger/logger';

export const migration001_initial: Migration = {
  version: 1,
  name: 'Initial schema setup',

  async up(db: Db): Promise<void> {
    // Create indexes for users collection
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ googleId: 1 }, { sparse: true });
    await db.collection('users').createIndex({ appleId: 1 }, { sparse: true });
    await db.collection('users').createIndex({ createdAt: -1 });

    // Create indexes for concerts collection
    await db
      .collection('concerts')
      .createIndex({ title: 'text', description: 'text' });
    await db.collection('concerts').createIndex({ 'date.start': 1 });
    await db.collection('concerts').createIndex({ 'date.end': 1 });
    await db.collection('concerts').createIndex({ 'location.city': 1 });
    await db.collection('concerts').createIndex({ 'artist.name': 1 });
    await db.collection('concerts').createIndex({ createdAt: -1 });

    // Create indexes for articles collection
    await db.collection('articles').createIndex({ authorId: 1 });
    await db.collection('articles').createIndex({ concertId: 1 });
    await db.collection('articles').createIndex({ categoryId: 1 });
    await db.collection('articles').createIndex({ createdAt: -1 });
    await db
      .collection('articles')
      .createIndex({ title: 'text', content: 'text' });

    // Create indexes for comments collection
    await db.collection('comments').createIndex({ articleId: 1 });
    await db.collection('comments').createIndex({ authorId: 1 });
    await db.collection('comments').createIndex({ parentId: 1 });
    await db.collection('comments').createIndex({ createdAt: -1 });

    // Create indexes for chat rooms collection
    await db.collection('chatRooms').createIndex({ concertId: 1 });
    await db.collection('chatRooms').createIndex({ createdAt: -1 });

    // Create indexes for messages collection
    await db.collection('messages').createIndex({ chatRoomId: 1 });
    await db.collection('messages').createIndex({ userId: 1 });
    await db.collection('messages').createIndex({ createdAt: -1 });

    // Create indexes for reports collection
    await db.collection('reports').createIndex({ reporterId: 1 });
    await db.collection('reports').createIndex({ targetType: 1, targetId: 1 });
    await db.collection('reports').createIndex({ status: 1 });
    await db.collection('reports').createIndex({ createdAt: -1 });

    logger.info('✅ Created all initial indexes');
  },

  async down(db: Db): Promise<void> {
    // Drop all created indexes (except _id)
    const collections = [
      'users',
      'concerts',
      'articles',
      'comments',
      'chatRooms',
      'messages',
      'reports',
    ];

    for (const collection of collections) {
      await db.collection(collection).dropIndexes();
    }

    logger.info('✅ Dropped all indexes');
  },
};
