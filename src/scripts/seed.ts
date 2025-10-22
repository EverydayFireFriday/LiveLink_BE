/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Db, MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import logger from '../utils/logger/logger';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/livelink';

interface SeedOptions {
  users?: number;
  concerts?: number;
  articles?: number;
  clear?: boolean;
}

async function clearDatabase(db: Db) {
  logger.info('🗑️  Clearing database...');
  const collections = await db.listCollections().toArray();

  for (const collection of collections) {
    if (collection.name !== 'migrations') {
      await db.collection(collection.name).deleteMany({});
      logger.info(`  Cleared ${collection.name}`);
    }
  }
}

async function seedUsers(db: Db, count: number) {
  logger.info(`👤 Seeding ${count} users...`);
  const users = [];

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  users.push({
    _id: new ObjectId(),
    email: 'admin@livelink.com',
    password: adminPassword,
    nickname: 'Admin',
    isAdmin: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create regular users
  for (let i = 0; i < count - 1; i++) {
    const password = await bcrypt.hash('password123', 10);
    users.push({
      _id: new ObjectId(),
      email: faker.internet.email(),
      password: password,
      nickname: faker.internet.username(),
      isAdmin: false,
      emailVerified: faker.datatype.boolean(),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    });
  }

  await db.collection('users').insertMany(users);
  logger.info(`✅ Created ${users.length} users`);
  return users;
}

async function seedConcerts(db: Db, count: number) {
  logger.info(`🎵 Seeding ${count} concerts...`);
  const concerts = [];

  const genres = [
    'Rock',
    'Pop',
    'Jazz',
    'Classical',
    'Hip Hop',
    'Electronic',
    'Country',
  ];
  const cities = ['서울', '부산', '대구', '인천', '광주', '대전', '울산'];

  for (let i = 0; i < count; i++) {
    const startDate = faker.date.future({ years: 1 });
    const endDate = new Date(startDate);
    endDate.setHours(
      startDate.getHours() + faker.number.int({ min: 2, max: 5 }),
    );

    concerts.push({
      _id: new ObjectId(),
      title: `${faker.music.genre()} Concert ${i + 1}`,
      description: faker.lorem.paragraph(),
      artist: {
        name: faker.person.fullName(),
        genre: faker.helpers.arrayElement(genres),
      },
      location: {
        venue: faker.company.name() + ' Hall',
        address: faker.location.streetAddress(),
        city: faker.helpers.arrayElement(cities),
        coordinates: {
          lat: Number(faker.location.latitude()),
          lng: Number(faker.location.longitude()),
        },
      },
      date: {
        start: startDate,
        end: endDate,
      },
      pricing: {
        currency: 'KRW',
        tiers: [
          {
            name: 'VIP',
            price: faker.number.int({ min: 100000, max: 200000 }),
            available: faker.number.int({ min: 10, max: 50 }),
          },
          {
            name: 'Standard',
            price: faker.number.int({ min: 50000, max: 100000 }),
            available: faker.number.int({ min: 100, max: 500 }),
          },
        ],
      },
      capacity: faker.number.int({ min: 100, max: 1000 }),
      status: faker.helpers.arrayElement([
        'upcoming',
        'ongoing',
        'completed',
        'cancelled',
      ]),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    });
  }

  await db.collection('concerts').insertMany(concerts);
  logger.info(`✅ Created ${concerts.length} concerts`);
  return concerts;
}

async function seedArticles(
  db: Db,
  count: number,
  users: any[],
  concerts: any[],
) {
  logger.info(`📝 Seeding ${count} articles...`);
  const articles = [];

  const categories = ['Review', 'Preview', 'Interview', 'News', 'Opinion'];

  for (let i = 0; i < count; i++) {
    const author = faker.helpers.arrayElement(users);
    const concert = faker.helpers.arrayElement(concerts);

    articles.push({
      _id: new ObjectId(),
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      authorId: author._id,
      concertId: concert._id,
      category: faker.helpers.arrayElement(categories),
      tags: faker.helpers.arrayElements(
        ['concert', 'music', 'review', 'festival', 'live'],
        faker.number.int({ min: 1, max: 3 }),
      ),
      viewCount: faker.number.int({ min: 0, max: 1000 }),
      likeCount: faker.number.int({ min: 0, max: 100 }),
      commentCount: faker.number.int({ min: 0, max: 50 }),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    });
  }

  await db.collection('articles').insertMany(articles);
  logger.info(`✅ Created ${articles.length} articles`);
  return articles;
}

async function main() {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    users: 20,
    concerts: 30,
    articles: 50,
    clear: args.includes('--clear'),
  };

  // Parse custom counts
  args.forEach((arg, index) => {
    if (arg === '--users' && args[index + 1]) {
      options.users = parseInt(args[index + 1]);
    }
    if (arg === '--concerts' && args[index + 1]) {
      options.concerts = parseInt(args[index + 1]);
    }
    if (arg === '--articles' && args[index + 1]) {
      options.articles = parseInt(args[index + 1]);
    }
  });

  logger.info('🌱 Starting database seeding...\n');

  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db();

  try {
    if (options.clear) {
      await clearDatabase(db);
      logger.info('');
    }

    const users = await seedUsers(db, options.users || 20);
    const concerts = await seedConcerts(db, options.concerts || 30);
    const articles = await seedArticles(
      db,
      options.articles || 50,
      users,
      concerts,
    );

    logger.info('\n✅ Database seeding completed successfully!');
    logger.info('\n📊 Summary:');
    logger.info(`  Users: ${users.length}`);
    logger.info(`  Concerts: ${concerts.length}`);
    logger.info(`  Articles: ${articles.length}`);
    logger.info('\n🔐 Admin credentials:');
    logger.info('  Email: admin@livelink.com');
    logger.info('  Password: admin123');
  } catch (error) {
    logger.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

void main();
