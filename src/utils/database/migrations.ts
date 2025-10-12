/* eslint-disable no-console */
import { Db } from 'mongodb';

export interface Migration {
  version: number;
  name: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

interface MigrationRecord {
  version: number;
  name: string;
  appliedAt: Date;
}

export class MigrationRunner {
  private db: Db;
  private migrationsCollection = 'migrations';

  constructor(db: Db) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    // Create migrations collection if not exists
    const collections = await this.db.listCollections().toArray();
    const exists = collections.some(
      (col) => col.name === this.migrationsCollection,
    );

    if (!exists) {
      await this.db.createCollection(this.migrationsCollection);
      console.log(`✅ Created ${this.migrationsCollection} collection`);
    }
  }

  async getCurrentVersion(): Promise<number> {
    const result = await this.db
      .collection<MigrationRecord>(this.migrationsCollection)
      .find()
      .sort({ version: -1 })
      .limit(1)
      .toArray();

    return result.length > 0 ? result[0].version : 0;
  }

  async up(migrations: Migration[]): Promise<void> {
    await this.initialize();
    const currentVersion = await this.getCurrentVersion();

    const pendingMigrations = migrations
      .filter((m) => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📦 Running ${pendingMigrations.length} migration(s)...`);

    for (const migration of pendingMigrations) {
      console.log(`⬆️  Migrating: v${migration.version} - ${migration.name}`);

      try {
        await migration.up(this.db);

        await this.db.collection(this.migrationsCollection).insertOne({
          version: migration.version,
          name: migration.name,
          appliedAt: new Date(),
        });

        console.log(`✅ Migration v${migration.version} completed`);
      } catch (error) {
        console.error(`❌ Migration v${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully');
  }

  async down(migrations: Migration[], targetVersion?: number): Promise<void> {
    await this.initialize();
    const currentVersion = await this.getCurrentVersion();

    if (currentVersion === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }

    const target = targetVersion ?? currentVersion - 1;

    const migrationsToRollback = migrations
      .filter((m) => m.version > target && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    if (migrationsToRollback.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }

    console.log(
      `📦 Rolling back ${migrationsToRollback.length} migration(s)...`,
    );

    for (const migration of migrationsToRollback) {
      console.log(
        `⬇️  Rolling back: v${migration.version} - ${migration.name}`,
      );

      try {
        await migration.down(this.db);

        await this.db.collection(this.migrationsCollection).deleteOne({
          version: migration.version,
        });

        console.log(`✅ Rollback v${migration.version} completed`);
      } catch (error) {
        console.error(`❌ Rollback v${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('✅ All rollbacks completed successfully');
  }

  async status(migrations: Migration[]): Promise<void> {
    await this.initialize();
    const currentVersion = await this.getCurrentVersion();

    console.log(`\n📊 Migration Status`);
    console.log(`Current version: ${currentVersion}`);
    console.log(`\nMigrations:`);

    for (const migration of migrations.sort((a, b) => a.version - b.version)) {
      const applied = migration.version <= currentVersion ? '✅' : '⏳';
      console.log(`${applied} v${migration.version} - ${migration.name}`);
    }
    console.log();
  }
}
