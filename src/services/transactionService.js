import db from "../db/connection.js";
import { publishEvent } from "./eventPublisher.js";

// ===================
// Daily limit helper
// ===================
async function checkDailyLimit(accountId, amount) {
  const today = new Date().toISOString().split("T")[0];
  const res = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE account_id=$1 AND txn_type IN ('WITHDRAW', 'TRANSFER_OUT')
       AND created_at::date=$2`,
    [accountId, today]
  );

  const totalToday = parseFloat(res.rows[0].total);
  const DAILY_LIMIT = 200000;

  if (totalToday + parseFloat(amount) > DAILY_LIMIT) {
    throw new Error("DAILY_LIMIT_EXCEEDED");
  }
  return true;
}

// ===================
// Deposit
// ===================
async function processDeposit({ account_id, amount, idempotency_key }) {
  if (!idempotency_key) throw new Error("IDEMPOTENCY_KEY_REQUIRED");

  const existing = await db.query(
    "SELECT txn_id FROM transaction_idempotency WHERE idempotency_key=$1",
    [idempotency_key]
  );
  if (existing.rows.length) return { txn_id: existing.rows[0].txn_id, message: "Deposit already processed" };

  const accountRes = await db.query("SELECT status, balance FROM accounts WHERE account_id=$1", [account_id]);
  if (!accountRes.rows.length) throw new Error("ACCOUNT_NOT_FOUND");
  const account = accountRes.rows[0];
  if (account.status === "FROZEN") throw new Error("ACCOUNT_FROZEN");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const newBalance = parseFloat(account.balance) + parseFloat(amount);
    const txnRes = await client.query(
      `INSERT INTO transactions (account_id, amount, txn_type, balance_after)
       VALUES ($1, $2, 'DEPOSIT', $3) RETURNING *`,
      [account_id, amount, newBalance]
    );

    await client.query("UPDATE accounts SET balance=$1 WHERE account_id=$2", [newBalance, account_id]);
    await client.query("INSERT INTO transaction_idempotency (idempotency_key, txn_id) VALUES ($1, $2)", [idempotency_key, txnRes.rows[0].txn_id]);

    await client.query("COMMIT");

    await publishEvent("transaction.deposit", { txn: txnRes.rows[0] });
    return txnRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ===================
// Withdraw
// ===================
async function processWithdraw({ account_id, amount, idempotency_key }) {
  const existing = await db.query(
    "SELECT txn_id FROM transaction_idempotency WHERE idempotency_key=$1",
    [idempotency_key]
  );
  if (existing.rows.length) return { txn_id: existing.rows[0].txn_id, message: "Withdrawal already processed" };

  const accountRes = await db.query("SELECT status, balance FROM accounts WHERE account_id=$1", [account_id]);
  if (!accountRes.rows.length) throw new Error("ACCOUNT_NOT_FOUND");
  const account = accountRes.rows[0];
  if (account.status === "FROZEN") throw new Error("ACCOUNT_FROZEN");

  await checkDailyLimit(account_id, amount);

  if (parseFloat(account.balance) < parseFloat(amount)) throw new Error("INSUFFICIENT_FUNDS");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const newBalance = parseFloat(account.balance) - parseFloat(amount);
    const txnRes = await client.query(
      `INSERT INTO transactions (account_id, amount, txn_type, balance_after)
       VALUES ($1, $2, 'WITHDRAW', $3) RETURNING *`,
      [account_id, amount, newBalance]
    );

    await client.query("UPDATE accounts SET balance=$1 WHERE account_id=$2", [newBalance, account_id]);
    await client.query("INSERT INTO transaction_idempotency (idempotency_key, txn_id) VALUES ($1, $2)", [idempotency_key, txnRes.rows[0].txn_id]);

    await client.query("COMMIT");

    await publishEvent("transaction.withdraw", { txn: txnRes.rows[0] });
    return txnRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ===================
// Transfer
// ===================
async function processTransfer({ from_account_id, to_account_id, amount, counterparty, idempotency_key }) {
  const existing = await db.query(
    "SELECT txn_id FROM transaction_idempotency WHERE idempotency_key=$1",
    [idempotency_key]
  );
  if (existing.rows.length) return { txn_id: existing.rows[0].txn_id, message: "Transfer already processed" };

  const fromAccount = await db.query("SELECT status, balance FROM accounts WHERE account_id=$1", [from_account_id]);
  const toAccount = await db.query("SELECT status FROM accounts WHERE account_id=$1", [to_account_id]);

  if (!fromAccount.rows.length || !toAccount.rows.length) throw new Error("ACCOUNT_NOT_FOUND");
  if (fromAccount.rows[0].status === "FROZEN" || toAccount.rows[0].status === "FROZEN") throw new Error("ACCOUNT_FROZEN");

  await checkDailyLimit(from_account_id, amount);
  if (parseFloat(fromAccount.rows[0].balance) < amount) throw new Error("INSUFFICIENT_FUNDS");

  const client = await db.connect();
  await client.query("BEGIN");

  const debitTxn = await client.query(
    `INSERT INTO transactions (account_id, amount, txn_type, counterparty)
     VALUES ($1, $2, 'TRANSFER_OUT', $3) RETURNING *`,
    [from_account_id, amount, counterparty]
  );
  await client.query("UPDATE accounts SET balance=balance-$1 WHERE account_id=$2", [amount, from_account_id]);

  const creditTxn = await client.query(
    `INSERT INTO transactions (account_id, amount, txn_type, counterparty)
     VALUES ($1, $2, 'TRANSFER_IN', $3) RETURNING *`,
    [to_account_id, amount, counterparty]
  );
  await client.query("UPDATE accounts SET balance=balance+$1 WHERE account_id=$2", [amount, to_account_id]);

  await client.query("INSERT INTO transaction_idempotency (idempotency_key, txn_id) VALUES ($1, $2)", [idempotency_key, debitTxn.rows[0].txn_id]);

  await client.query("COMMIT");

  await publishEvent("transaction.transfer", { debitTxn: debitTxn.rows[0], creditTxn: creditTxn.rows[0] });

  return { debitTxn: debitTxn.rows[0], creditTxn: creditTxn.rows[0] };
}

// ===================
// Statement / History
// ===================
async function getStatement(account_id, limit = 10, offset = 0) {
  const res = await db.query(
    `SELECT * FROM transactions
     WHERE account_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [account_id, limit, offset]
  );
  return res.rows;
}

async function getTransactionHistory(account_id) {
  const res = await db.query(
    `SELECT * FROM transactions
     WHERE account_id = $1
     ORDER BY created_at DESC`,
    [account_id]
  );
  return res.rows;
}

// ===================
// Export
// ===================
export default {
  processDeposit,
  processWithdraw,
  processTransfer,
  checkDailyLimit,
  getStatement,
  getTransactionHistory
};
