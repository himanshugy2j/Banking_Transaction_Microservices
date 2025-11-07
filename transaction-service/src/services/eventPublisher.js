import amqp from "amqplib";

let channel;

export async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log("✅ Connected to RabbitMQ");

    await channel.assertQueue("transaction-events", { durable: true });
  } catch (err) {
    console.error("❌ RabbitMQ connection failed:", err);
  }
}

export async function publishEvent(eventType, payload) {
  if (!channel) {
    console.error("❌ RabbitMQ channel not ready, event not sent");
    return;
  }

  const event = {
    type: eventType,
    timestamp: new Date(),
    payload,
  };

  await channel.sendToQueue(
    "transaction-events",
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );

  console.log("📤 Published event:", eventType);
}