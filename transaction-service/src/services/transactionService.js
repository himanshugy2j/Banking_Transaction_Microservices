// src/services/transactionService.js
import db from "../db/connection.js";
import { v4 as uuidv4 } from "uuid";
import { publishEvent } from "./eventPublisher.js"; // New import for publishing events

const DAILY_LIMIT = 200000; // ₹2,00,000

// Helper: Check if account is frozen
async function checkAccountStatus(account_id) {
  const account = await db.query(
    "SELECT status, balance FROM accounts WHERE account_id = $1",
    [account_id]
  );
  if (!account.rows.length) {
    await publishEvent("transaction.error", {
      account_id,
      error: "ACCOUNT_NOT_FOUND"
    });
    throw new Error("ACCOUNT_NOT_FOUND");
  }
  if (account.rows[0].status === "FROZEN") {
    await publishEvent("transaction.error", {
      account_id,
      error: "ACCOUNT_FROZEN"
    });
    throw new Error("ACCOUNT_FROZEN");
  }
  return account.rows[0];
}

// Helper: Check daily withdrawal/transfer limit
async function checkDailyLimit(account_id, amount) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const result = await db.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM transactions
     WHERE account_id = $1 AND txn_type IN ('WITHDRAWAL','TRANSFER_OUT') AND created_at::date = $2`,
    [account_id, today]
  );
  if (result.rows[0].total + amount > DAILY_LIMIT) {
    await publishEvent("transaction.error", {
      account_id,
      error: "DAILY_LIMIT_EXCEEDED"
    });
    throw new Error("DAILY_LIMIT_EXCEEDED");
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

  // Insert transaction record
  const txn = await db.query(
    `INSERT INTO transactions (account_id, amount, txn_type, counterparty)
     VALUES ($1, $2, 'DEPOSIT', $3)
     RETURNING *`,
    [account_id, amount, counterparty]
  );

  // Update balance
  await db.query("UPDATE accounts SET balance = $1 WHERE account_id = $2", [
    newBalance,
    account_id,
  ]);

  // Publish event
  try {
    await publishEvent("transaction.deposit", txn.rows[0]);
  } catch (err) {
    console.error("Failed to publish deposit event:", err);
  }

  return txn.rows[0];
}


// Process withdrawal
// Process withdraw
async function processWithdraw({ account_id, amount, counterparty }) {
  await checkAccountStatus(account_id);

  const account = await db.query(
    "SELECT balance FROM accounts WHERE account_id = $1",
    [account_id]
  );

  const currentBalance = parseFloat(account.rows[0].balance);

  // Business rule — insufficient balance
  if (currentBalance < amount) {
    await publishEvent("transaction.error", {
      account_id,
      error: "INSUFFICIENT_FUNDS"
    });
    throw new Error("INSUFFICIENT_FUNDS");
  }

  // Example daily limit check (adjust as needed)
  if (amount > 200000) {
    await publishEvent("transaction.error", {
      account_id,
      error: "DAILY_LIMIT_EXCEEDED"
    });
    throw new Error("DAILY_LIMIT_EXCEEDED");
  }

  const newBalance = currentBalance - amount;

  const txn = await db.query(
    `INSERT INTO transactions (account_id, amount, txn_type, counterparty)
     VALUES ($1, $2, 'WITHDRAW', $3)
     RETURNING *`,
    [account_id, amount, counterparty]
  );

  await db.query("UPDATE accounts SET balance=$1 WHERE account_id=$2", [
    newBalance,
    account_id,
  ]);

  try {
    await publishEvent("transaction.withdraw", txn.rows[0]);
  } catch (err) {
    console.error("Failed to publish withdraw event:", err);
  }

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

// Get all transactions for an account
async function getTransactionHistory(account_id) {
  const result = await db.query(
    `SELECT txn_id, amount, txn_type, counterparty, created_at
     FROM transactions
     WHERE account_id = $1
     ORDER BY created_at DESC`,
    [account_id]
  );

  return result.rows;
}

export default {
  processDeposit,
  processWithdraw,
  getStatement,
  getTransactionHistory,
};
