import express from "express";
import { startSubscriber } from "./services/eventSubscriber.js";
import { initDB } from "./db/connection.js";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

const startServer = async () => {
  try {
    await initDB();
    console.log("✅ Connected to PostgreSQL");

    await startSubscriber();
    console.log("📩 RabbitMQ subscriber started");

    app.listen(PORT, () => {
      console.log(`🚀 Notification service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start service:", err);
    process.exit(1);
  }
};

startServer();
