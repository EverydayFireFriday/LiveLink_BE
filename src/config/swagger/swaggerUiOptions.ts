import { customStyles } from "./styles";

export const swaggerUiOptions = {
  explorer: true,
  customCss: customStyles,
  customJs: '/swagger-assets/theme-initializer.js',
  customSiteTitle: "stagelives API Documentation",
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
    operationsSorter: (a: any, b: any) => {
      const order = ["get", "post", "patch", "delete"];
      const methodA = a.get("method");
      const methodB = b.get("method");
      const indexA = order.indexOf(methodA);
      const indexB = order.indexOf(methodB);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) {
        return -1; // a comes first
      }
      if (indexB !== -1) {
        return 1; // b comes first
      }
      // If neither is in the custom order, sort alphabetically
      return methodA.localeCompare(methodB);
    },
  },
};
