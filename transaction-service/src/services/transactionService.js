// src/services/transactionService.js
import db from "../db/connection.js";
import { v4 as uuidv4 } from "uuid";

const DAILY_LIMIT = 200000; // ₹2,00,000

// Helper: Check if account is frozen
async function checkAccountStatus(account_id) {
  const account = await db.query(
    "SELECT status, balance FROM accounts WHERE account_id = $1",
    [account_id]
  );

  if (!account.rows.length) throw new Error("ACCOUNT_NOT_FOUND");

  if (account.rows[0].status === "FROZEN") {
    const err = new Error("ACCOUNT_FROZEN");
    err.code = "ACCOUNT_FROZEN";
    throw err;
  }

  return account.rows[0];
}

// Helper: Check daily withdrawal/transfer limit
async function checkDailyLimit(account_id, amount) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const result = await db.query(
    `SELECT COALESCE(SUM(amount),0) AS total
     FROM transactions
     WHERE account_id = $1
       AND txn_type IN ('WITHDRAWAL', 'TRANSFER')
       AND created_at::date = $2`,
    [account_id, today]
  );

  const dailyTotal = parseFloat(result.rows[0].total);
  if (dailyTotal + amount > DAILY_LIMIT) {
    const err = new Error("DAILY_LIMIT_EXCEEDED");
    err.code = "DAILY_LIMIT_EXCEEDED";
    throw err;
  }
}

// Process deposit
async function processDeposit({ account_id, amount, counterparty }) {
  await checkAccountStatus(account_id);

  const account = await db.query(
    "SELECT balance FROM accounts WHERE account_id = $1",
    [account_id]
  );

  const newBalance = parseFloat(account.rows[0].balance) + amount;
  const reference = `DEP-${uuidv4()}`;

  const txn = await db.query(
  `INSERT INTO transactions (account_id, amount, txn_type, counterparty, reference, balance_after)
   VALUES ($1, $2, 'DEPOSIT', $3, $4, $5) RETURNING *`,
  [account_id, amount, counterparty, reference, newBalance]
  );

  await db.query("UPDATE accounts SET balance=$1 WHERE account_id=$2", [newBalance, account_id]);
  return txn.rows[0];
}

// Process withdrawal
async function processWithdraw({ account_id, amount, counterparty}) {
  // Check if account exists and is not frozen
  await checkAccountStatus(account_id);

  // Check daily withdrawal/transfer limit
  await checkDailyLimit(account_id, amount);

  // Fetch current balance
  const account = await db.query(
    "SELECT balance FROM accounts WHERE account_id = $1",
    [account_id]
  );
  const currentBalance = parseFloat(account.rows[0].balance);

  // Check if sufficient funds
  if (currentBalance < amount) {
    const err = new Error("NO_OVERDRAFT");
    err.code = "NO_OVERDRAFT";
    throw err;
  }

  // Calculate new balance
  const newBalance = currentBalance - amount;
  const reference = `WDL-${uuidv4()}`;

  // Insert transaction
  const txn = await db.query(
  `INSERT INTO transactions 
     (account_id, amount, txn_type, counterparty, reference, balance_after)
   VALUES ($1, $2, 'WITHDRAWAL', $3, $4, $5)
   RETURNING *`,
  [account_id, -amount, counterparty, reference, newBalance]
  );

  // Update account balance
  await db.query(
    "UPDATE accounts SET balance=$1 WHERE account_id=$2",
    [newBalance, account_id]
  );

  return txn.rows[0];
}

// Get account statement
async function getStatement(account_id, limit = 50, offset = 0) {
  await checkAccountStatus(account_id);

  const result = await db.query(
    `SELECT * FROM transactions
     WHERE account_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [account_id, limit, offset]
  );

  return result.rows;
}

export default {
  processDeposit,
  processWithdraw,
  getStatement,
};
