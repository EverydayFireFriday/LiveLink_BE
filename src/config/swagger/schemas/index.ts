import { articleSchema } from './articleSchema';
import { paginationSchema } from './paginationSchema';

export const swaggerSchemas = {
  ...articleSchema,
  ...paginationSchema,
};
