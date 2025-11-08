// src/db/connection.js
import pkg from 'pg';
const { Pool } = pkg;

// Create a pool for PostgreSQL
const db = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'notification-db',
  database: process.env.DB_NAME || 'notifications',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Initialize the notifications table
export async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Notifications table ready");
}

export default db;
