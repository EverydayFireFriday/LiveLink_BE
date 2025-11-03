import { Migration } from '../utils/database/migrations';
import { migration001_initial } from './001_initial';
import { migration002_update_terms_version } from './002_update_terms_version';

// Register all migrations here in order
export const migrations: Migration[] = [
  migration001_initial,
  migration002_update_terms_version,
  // Add new migrations here
];
