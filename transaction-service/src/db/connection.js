import pkg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Password",
  database: process.env.DB_NAME || "transactions",
});

export const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await pool.query("SELECT 1;");
      console.log("✅ Connected to PostgreSQL");

      // Run init.sql if it exists (auto-create tables)
      const initPath = path.resolve("./scripts/init.sql");
      if (fs.existsSync(initPath)) {
        const initSQL = fs.readFileSync(initPath, "utf8");
        await pool.query(initSQL);
        console.log("🗄️  init.sql executed successfully");
      } else {
        console.warn("⚠️  init.sql not found, skipping...");
      }

      return;
    } catch (err) {
      retries -= 1;
      console.error(`❌ DB connection failed, retrying... (${5 - retries}/5)`);
      console.error(err.message);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  throw new Error("❌ Could not connect to database after several attempts");
};

export default pool;
