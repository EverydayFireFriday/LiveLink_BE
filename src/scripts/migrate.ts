/* eslint-disable no-console */
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { MigrationRunner } from '../utils/database/migrations';
import { migrations } from '../migrations';

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
        console.log('Usage:');
        console.log('  npm run migrate:up      - Run all pending migrations');
        console.log('  npm run migrate:down    - Rollback last migration');
        console.log('  npm run migrate:down 0  - Rollback all migrations');
        console.log('  npm run migrate:status  - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

void main();
