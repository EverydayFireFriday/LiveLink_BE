import { authSchemas } from "./auth";
import { concertSchemas } from "./concert";
import { articleSchemas } from "./article";
import { adminSchemas } from "./admin";
import { commonSchemas } from "./common";

export const swaggerSchemas = {
  ...authSchemas,
  ...concertSchemas,
  ...articleSchemas,
  ...adminSchemas,
  ...commonSchemas,
};
