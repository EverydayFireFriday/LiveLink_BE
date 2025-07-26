import { authSchemas } from "./auth";
import { concertSchemas } from "./concert";
import { articleSchemas } from "./article";
import { chatSchemas } from "./chat";
import { commonSchemas } from "./common";

export const swaggerSchemas = {
  ...authSchemas,
  ...concertSchemas,
  ...articleSchemas,
  ...chatSchemas,
  ...commonSchemas,
};
