import { articleSchema } from './articleSchema';
import { paginationSchema } from './paginationSchema';
import { concertSchema } from './concertSchema';
import { errorSchema } from './errorSchema';

export const swaggerSchemas = {
  ...articleSchema,
  ...paginationSchema,
  ...concertSchema,
  ...errorSchema,
};