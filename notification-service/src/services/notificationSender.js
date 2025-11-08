import db from "../db/connection.js";

export const sendNotification = async (eventType, accountId, amount, message) => {
  await db.query(
    `INSERT INTO notifications (event_type, account_id, amount, message)
     VALUES ($1, $2, $3, $4)`,
    [eventType, accountId, amount, message]
  );
};
