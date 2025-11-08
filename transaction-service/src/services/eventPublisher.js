// src/services/eventPublisher.js
import amqp from "amqplib";

let channel;
let queueReady = false;
const QUEUE_NAME = "transaction_events"; // must match subscriber

export async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    queueReady = true;
    console.log(`✅ Connected to RabbitMQ and queue "${QUEUE_NAME}" is ready`);
  } catch (err) {
    console.error("❌ RabbitMQ connection failed:", err);
  }
}

export async function publishEvent(eventType, payload) {
  if (!queueReady) {
    console.error("❌ RabbitMQ not ready, event not sent");
    return;
  }

  const event = {
    type: eventType,
    timestamp: new Date(),
    payload,
  };

  try {
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(event)), {
      persistent: true, // ensures messages survive broker restart
    });
    console.log("📤 Published event:", eventType);
  } catch (err) {
    console.error("❌ Failed to publish event:", err);
  }
}
