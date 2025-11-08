import request from "supertest";
import app from "../src/app.js"; // your express app
import db from "../src/db/connection.js";

describe("Transaction Service API", () => {
  let depositIdempotencyKey;
  let withdrawIdempotencyKey;

  beforeAll(async () => {
    // Optionally reset DB or use test DB
  });

  afterAll(async () => {
    await db.query("DELETE FROM transactions");
    await db.query("DELETE FROM transaction_idempotency");
    await db.query("UPDATE accounts SET balance=10000 WHERE account_id=1");
    await db.end();
  });

  test("Deposit should succeed and publish event", async () => {
    depositIdempotencyKey = `deposit-test-${Date.now()}`;
    const res = await request(app)
      .post("/transactions/deposit")
      .send({
        account_id: 1,
        amount: 1000,
        idempotency_key: depositIdempotencyKey,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.balance_after).toBeDefined();
    expect(res.body.amount).toBe(1000);
  });

  test("Deposit with same idempotency key should not double charge", async () => {
    const res = await request(app)
      .post("/transactions/deposit")
      .send({
        account_id: 1,
        amount: 1000,
        idempotency_key: depositIdempotencyKey,
      });
    expect(res.body.message).toBe("Deposit already processed");
  });

  test("Withdraw should fail if insufficient funds", async () => {
    withdrawIdempotencyKey = `withdraw-test-${Date.now()}`;
    const res = await request(app)
      .post("/transactions/withdraw")
      .send({
        account_id: 3,
        amount: 5000,
        idempotency_key: withdrawIdempotencyKey,
      });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("INSUFFICIENT_FUNDS");
  });

  test("Transfer should succeed between two accounts", async () => {
    const key = `transfer-test-${Date.now()}`;
    const res = await request(app)
      .post("/transactions/transfer")
      .send({
        from_account_id: 1,
        to_account_id: 3,
        amount: 500,
        counterparty: "ACC1003",
        idempotency_key: key
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.debitTxn.amount).toBe(500);
    expect(res.body.creditTxn.amount).toBe(500);
  });
});
