import { Db } from 'mongodb';
import { Migration } from '../utils/database/migrations';
import logger from '../utils/logger/logger';

export const migration002_update_terms_version: Migration = {
  version: 2,
  name: 'Update terms version from 1.00 to 1.0.0',

  async up(db: Db): Promise<void> {
    logger.info('🔄 Updating terms version format from 1.00 to 1.0.0...');

    // Update all users with termsConsents array
    const result = await db.collection('users').updateMany(
      {
        'termsConsents.version': '1.00',
      },
      {
        $set: {
          'termsConsents.$[consent].version': '1.0.0',
        },
      },
      {
        arrayFilters: [{ 'consent.version': '1.00' }],
      },
    );

    logger.info(
      `✅ Updated ${result.modifiedCount} users' termsConsents version`,
    );

    // Check if there are any remaining 1.00 versions
    const remaining = await db
      .collection('users')
      .countDocuments({ 'termsConsents.version': '1.00' });

    if (remaining > 0) {
      logger.warn(
        `⚠️  Warning: ${remaining} documents still have version 1.00`,
      );
    } else {
      logger.info('✅ All terms versions updated successfully');
    }
  },

  async down(db: Db): Promise<void> {
    logger.info('🔄 Reverting terms version format from 1.0.0 to 1.00...');

    // Revert back to 1.00
    const result = await db.collection('users').updateMany(
      {
        'termsConsents.version': '1.0.0',
      },
      {
        $set: {
          'termsConsents.$[consent].version': '1.00',
        },
      },
      {
        arrayFilters: [{ 'consent.version': '1.0.0' }],
      },
    );

    logger.info(
      `✅ Reverted ${result.modifiedCount} users' termsConsents version`,
    );
  },
};
