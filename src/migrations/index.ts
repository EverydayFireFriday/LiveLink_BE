import { Migration } from '../utils/database/migrations';
import { migration001_initial } from './001_initial';

// Register all migrations here in order
export const migrations: Migration[] = [
  migration001_initial,
  // Add new migrations here
];
