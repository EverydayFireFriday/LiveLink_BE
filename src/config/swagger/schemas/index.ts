import { authSchemas } from "./auth";
import { concertSchemas } from "./concert";
import { articleSchemas } from "./article";
import { adminSchemas } from "./admin";
import { commonSchemas } from "./common";
import { chatSchemas } from "./chat";
import { notificationSchemas } from "./notification";
import { uploadSchemas } from "./upload";
import { searchSchemas } from "./search";

export const schemas = {
  ...authSchemas,
  ...concertSchemas,
  ...articleSchemas,
  ...adminSchemas,
  ...commonSchemas,
  ...chatSchemas,
  ...notificationSchemas,
  ...uploadSchemas,
  searchSchemas,
  ...searchSchemas,
};

// Export individual schema groups for selective use
export {
  authSchemas,
  concertSchemas,
  articleSchemas,
  adminSchemas,
  commonSchemas,
  chatSchemas,
  notificationSchemas,
  uploadSchemas
};