import { articleSchema } from './articleSchema';
import { paginationSchema } from './paginationSchema';
import { concertSchema } from './concertSchema';
import { errorSchema } from './errorSchema';
import { commentSchema } from './commentSchema';
import { authSchemas } from './auth';
import { responseSchema } from './responseSchema';

export const swaggerSchemas = {
  ...articleSchema,
  ...paginationSchema,
  ...concertSchema,
  ...errorSchema,
  ...commentSchema,
  ...authSchemas,
  ...responseSchema,
};
