// swagger.js
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Transaction Service API",
      version: "1.0.0",
      description: "API documentation for the Transaction microservice",
    },
    servers: [
      {
        url: "http://localhost:8002", // update if port differs
      },
    ],
  },
  apis: ["./routes/*.js", "./index.js"], // update paths based on your code layout
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
