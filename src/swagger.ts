import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Livelink API",
      version: "1.0.0",
    },
  },
  apis: ["./src/controllers/*.ts"], // JSDoc 경로
});
