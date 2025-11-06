import express from "express";
import dotenv from "dotenv";
import { connectRabbitMQ } from "./rabbitmq/connection.js";
import { connectDB } from "./db/connection.js";
import customerRoutes from "./routes/customers.js";
import accountRoutes from "./routes/accounts.js";
import transactionRoutes from "./routes/transactions.js";
import { sync as globSync } from "glob";
// ✅ Swagger imports
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Automatically find all route files in src/routes
const routeFiles = globSync("./src/routes/**/*.js");

dotenv.config();
const app = express();
app.use(express.json());

// ✅ Swagger setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Banking Transaction Service API",
      version: "1.0.0",
      description:
        "API documentation for the Transaction Microservice (includes customer, account, and transaction endpoints)",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
  },
  apis: routeFiles, // scans your route files for JSDoc annotations
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Health check routes
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "Transaction Service" });
});

app.get("/", (req, res) => {
  res.send("✅ Transaction Service is up and running!");
});

// ✅ Register routes
app.use("/customers", customerRoutes);
app.use("/accounts", accountRoutes);
app.use("/transactions", transactionRoutes);

// ✅ Start server
const startServer = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    console.log(`📘 Swagger docs available at: http://localhost:${PORT}/api-docs`);
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
};

startServer();
