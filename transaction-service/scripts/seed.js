import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { connectDB } from "../src/db/connection.js";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const __dirname = path.resolve();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Password",
  database: process.env.DB_NAME || "transactions",
});

const importCSV = async (filePath, tableName) => {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  CSV file not found: ${filePath}`);
    return;
  }

  const rows = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        try {
          for (const row of rows) {
            const columns = Object.keys(row);
            const values = Object.values(row);

            const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
            const query = `
              INSERT INTO ${tableName} (${columns.join(", ")})
              VALUES (${placeholders})
            `;

            await pool.query(query, values);
          }

          console.log(`✅ Imported ${rows.length} rows into ${tableName}`);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
};

const seedDatabase = async () => {
  await connectDB();

  try {
    console.log("🔗 Connected — preparing to seed database...");
    await pool.query("BEGIN");

    // Truncate in proper order to avoid FK issues
    await pool.query(`
      TRUNCATE TABLE transactions, accounts, customers RESTART IDENTITY CASCADE;
    `);
    await pool.query("COMMIT");

    console.log("🧹 Cleared old data from all tables.");

    // Import CSVs in dependency order
    await importCSV(path.join(__dirname, "data/customers.csv"), "customers");
    await importCSV(path.join(__dirname, "data/accounts.csv"), "accounts");
    await importCSV(path.join(__dirname, "data/transactions.csv"), "transactions");

  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Seeding failed:", error);
  } finally {
    await pool.end();
    console.log("🌱 Seeding completed.");
  }
};

seedDatabase();
