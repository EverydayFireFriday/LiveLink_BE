import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { MigrationRunner } from '../utils/database/migrations';
import { migrations } from '../migrations';
import logger from '../utils/logger/logger';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/livelink';

async function main() {
  const command = process.argv[2];
  const targetVersion = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db();

  const runner = new MigrationRunner(db);

  try {
    switch (command) {
      case 'up':
        await runner.up(migrations);
        break;

      case 'down':
        await runner.down(migrations, targetVersion);
        break;

      case 'status':
        await runner.status(migrations);
        break;

      default:
        logger.info('Usage:');
        logger.info('  npm run migrate:up      - Run all pending migrations');
        logger.info('  npm run migrate:down    - Rollback last migration');
        logger.info('  npm run migrate:down 0  - Rollback all migrations');
        logger.info('  npm run migrate:status  - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

void main();
