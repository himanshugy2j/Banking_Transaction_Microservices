import amqplib from "amqplib";
import { sendNotification } from "./notificationSender.js";

const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "transaction_events"; // must match publisher

export const startSubscriber = async () => {
  try {
    const connection = await amqplib.connect(RABBIT_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`📩 Listening on queue: ${QUEUE_NAME}`);

    channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (msg !== null) {
          const event = JSON.parse(msg.content.toString());
          console.log("📨 Received event:", event);

          await sendNotification(event);
          channel.ack(msg);
        }
      },
      { noAck: false } // ensures manual acknowledgement
    );
  } catch (err) {
    console.error("❌ Subscriber failed:", err);
  }
};
