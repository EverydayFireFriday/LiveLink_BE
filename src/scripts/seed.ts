/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Db, MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import logger from '../utils/logger/logger';
import { UserStatus } from '../models/auth/user';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/livelink';

interface SeedOptions {
  users?: number;
  concerts?: number;
  categories?: number;
  articles?: number;
  clear?: boolean;
}

async function clearDatabase(db: Db) {
  logger.info('🗑️  Clearing database...');
  const collections = await db.listCollections().toArray();

  for (const collection of collections) {
    if (collection.name !== 'migrations' && collection.name !== 'sessions') {
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
    username: 'admin',
    passwordHash: adminPassword,
    name: '관리자',
    birthDate: new Date('1990-01-01'),
    status: UserStatus.ACTIVE,
    termsConsents: [
      {
        type: 'terms',
        isAgreed: true,
        version: '1.0',
        agreedAt: new Date(),
      },
      {
        type: 'privacy',
        isAgreed: true,
        version: '1.0',
        agreedAt: new Date(),
      },
    ],
    notificationPreference: {
      ticketOpenNotification: [10, 30, 60, 1440],
      concertStartNotification: [60, 180, 1440],
    },
    likedConcerts: [],
    likedArticles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create regular users
  for (let i = 0; i < count - 1; i++) {
    const password = await bcrypt.hash('password123', 10);
    const status = faker.helpers.arrayElement([
      UserStatus.ACTIVE,
      UserStatus.ACTIVE,
      UserStatus.ACTIVE, // 대부분 active
      UserStatus.PENDING_VERIFICATION,
    ]);

    users.push({
      _id: new ObjectId(),
      email: faker.internet.email().toLowerCase(),
      username: faker.internet.username().toLowerCase(),
      passwordHash: password,
      name: faker.person.fullName(),
      birthDate: faker.date.birthdate({ min: 1980, max: 2005, mode: 'year' }),
      status,
      termsConsents: [
        {
          type: 'terms',
          isAgreed: true,
          version: '1.0',
          agreedAt: faker.date.past({ years: 1 }),
        },
        {
          type: 'privacy',
          isAgreed: true,
          version: '1.0',
          agreedAt: faker.date.past({ years: 1 }),
        },
        {
          type: 'marketing',
          isAgreed: faker.datatype.boolean(),
          version: '1.0',
          agreedAt: faker.date.past({ years: 1 }),
        },
      ],
      notificationPreference: {
        ticketOpenNotification: faker.datatype.boolean()
          ? [10, 30, 60, 1440]
          : [],
        concertStartNotification: faker.datatype.boolean()
          ? [60, 180, 1440]
          : [60],
      },
      profileImage: faker.datatype.boolean() ? faker.image.avatar() : undefined,
      likedConcerts: [],
      likedArticles: [],
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
    'Indie',
    'K-Pop',
    'R&B',
  ];
  const venues = [
    '올림픽공원 KSPO DOME',
    '잠실 종합운동장',
    '고척 스카이돔',
    '블루스퀘어',
    'YES24 라이브홀',
    '롤링홀',
    '무브홀',
    '클럽 에반스',
  ];
  const cities = ['서울', '부산', '대구', '인천', '광주', '대전', '울산'];

  for (let i = 0; i < count; i++) {
    const concertDate = faker.date.future({ years: 1 });
    const artistCount = faker.number.int({ min: 1, max: 3 });
    const artists = Array.from({ length: artistCount }, () =>
      faker.person.fullName(),
    );

    const uid = `C${Date.now()}-${i}`;

    concerts.push({
      _id: new ObjectId(),
      uid,
      title: `${faker.helpers.arrayElement(artists)} ${faker.helpers.arrayElement(['Concert', '콘서트', 'Live', 'Tour'])} ${faker.date.future().getFullYear()}`,
      artist: artists,
      location: [
        faker.helpers.arrayElement(venues),
        faker.helpers.arrayElement(cities),
      ],
      datetime: [concertDate],
      price: [
        {
          tier: 'VIP',
          amount: faker.number.int({ min: 150000, max: 300000 }),
        },
        {
          tier: 'R석',
          amount: faker.number.int({ min: 100000, max: 150000 }),
        },
        {
          tier: 'S석',
          amount: faker.number.int({ min: 70000, max: 100000 }),
        },
        {
          tier: 'A석',
          amount: faker.number.int({ min: 50000, max: 70000 }),
        },
      ],
      description: faker.lorem.paragraphs(2),
      category: faker.helpers.arrayElements(genres, {
        min: 1,
        max: 2,
      }),
      ticketLink: [
        {
          platform: faker.helpers.arrayElement([
            '인터파크',
            '멜론티켓',
            '티켓링크',
            '예스24',
          ]),
          url: faker.internet.url(),
        },
      ],
      ticketOpenDate: [
        {
          openTitle: '일반 예매',
          openDate: faker.date.soon({ days: 30 }),
        },
      ],
      posterImage: faker.image.urlLoremFlickr({ category: 'music,concert' }),
      infoImages: Array.from(
        { length: faker.number.int({ min: 1, max: 3 }) },
        () => faker.image.urlLoremFlickr({ category: 'music' }),
      ),
      status: faker.helpers.arrayElement([
        'upcoming',
        'upcoming',
        'upcoming', // 대부분 upcoming
        'ongoing',
        'completed',
      ]),
      likesCount: faker.number.int({ min: 0, max: 500 }),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    });
  }

  await db.collection('concerts').insertMany(concerts);
  logger.info(`✅ Created ${concerts.length} concerts`);
  return concerts;
}

async function seedCategories(db: Db) {
  logger.info('📂 Seeding categories...');

  const categories = [
    { _id: new ObjectId(), name: '공연 리뷰', created_at: new Date() },
    { _id: new ObjectId(), name: '공연 예고', created_at: new Date() },
    { _id: new ObjectId(), name: '아티스트 인터뷰', created_at: new Date() },
    { _id: new ObjectId(), name: '공연 소식', created_at: new Date() },
    { _id: new ObjectId(), name: '티켓 정보', created_at: new Date() },
  ];

  await db.collection('categories').insertMany(categories);
  logger.info(`✅ Created ${categories.length} categories`);
  return categories;
}

async function seedArticles(
  db: Db,
  count: number,
  users: any[],
  categories: any[],
) {
  logger.info(`📝 Seeding ${count} articles...`);
  const articles = [];

  for (let i = 0; i < count; i++) {
    const author = faker.helpers.arrayElement(users);
    const category = faker.helpers.arrayElement(categories);
    const isPublished = faker.datatype.boolean({ probability: 0.8 }); // 80% 발행됨
    const createdAt = faker.date.past({ years: 1 });
    const publishedAt = isPublished
      ? faker.date.between({ from: createdAt, to: new Date() })
      : null;

    articles.push({
      _id: new ObjectId(),
      title: faker.lorem.sentence({ min: 5, max: 10 }),
      content_url: `https://storage.example.com/articles/${new ObjectId().toString()}.html`,
      author_id: author._id,
      category_id: category._id,
      is_published: isPublished,
      published_at: publishedAt,
      created_at: createdAt,
      updated_at: new Date(),
      views: faker.number.int({ min: 0, max: 5000 }),
      likes_count: faker.number.int({ min: 0, max: 200 }),
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
    categories: 5,
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
    const categories = await seedCategories(db);
    const articles = await seedArticles(
      db,
      options.articles || 50,
      users,
      categories,
    );

    logger.info('\n✅ Database seeding completed successfully!');
    logger.info('\n📊 Summary:');
    logger.info(`  Users: ${users.length}`);
    logger.info(`  Concerts: ${concerts.length}`);
    logger.info(`  Categories: ${categories.length}`);
    logger.info(`  Articles: ${articles.length}`);
    logger.info('\n🔐 Test credentials:');
    logger.info('  Email: admin@livelink.com');
    logger.info('  Password: admin123');
    logger.info('\n  Regular users: password123');
  } catch (error) {
    logger.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

void main();
