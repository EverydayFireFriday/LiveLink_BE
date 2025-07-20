import { customStyles } from "./styles";
import { setupSearchFilter } from "./utils/searchFilter";

export const swaggerUiOptions = {
  explorer: true,
  customCss: customStyles,
  customSiteTitle: "LiveLink API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: "none",
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    tagsSorter: "alpha",
    operationsSorter: "alpha",
    onComplete: setupSearchFilter,
  },
};
