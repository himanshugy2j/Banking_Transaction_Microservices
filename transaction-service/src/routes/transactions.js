// src/routes/transactions.js
import express from "express";
import transactionService from "../services/transactionService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: APIs for deposits, withdrawals, and account statements
 */

/**
 * @swagger
 * /transactions/deposit:
 *   post:
 *     summary: Deposit money into an account
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_id
 *               - amount
 *             properties:
 *               account_id:
 *                 type: integer
 *                 example: 1001
 *               amount:
 *                 type: number
 *                 example: 2500.75
 *               counterparty:
 *                 type: string
 *                 example: "ATM Deposit"
 *               description:
 *                 type: string
 *                 example: "Initial deposit"
 *     responses:
 *       201:
 *         description: Deposit successful
 *       422:
 *         description: Overdraft not allowed
 *       500:
 *         description: Internal error
 */
router.post("/deposit", async (req, res) => {
  try {
    const { account_id, amount, counterparty, description } = req.body;
    const txn = await transactionService.processDeposit({
      account_id,
      amount,
      counterparty,
      description,
    });
    return res.status(201).json(txn);
  } catch (err) {
    console.error("deposit error:", err);
    if (err.code === "NO_OVERDRAFT")
      return res.status(422).json({ error: "NO_OVERDRAFT" });
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/**
 * @swagger
 * /transactions/withdraw:
 *   post:
 *     summary: Withdraw money from an account
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_id
 *               - amount
 *             properties:
 *               account_id:
 *                 type: integer
 *                 example: 1001
 *               amount:
 *                 type: number
 *                 example: 500.00
 *               counterparty:
 *                 type: string
 *                 example: "ATM Withdrawal"
 *               description:
 *                 type: string
 *                 example: "Cash withdrawal"
 *     responses:
 *       201:
 *         description: Withdrawal successful
 *       422:
 *         description: Overdraft not allowed
 *       500:
 *         description: Internal error
 */
router.post("/withdraw", async (req, res) => {
  try {
    const { account_id, amount, counterparty, description } = req.body;
    const txn = await transactionService.processWithdraw({
      account_id,
      amount,
      counterparty,
      description,
    });
    return res.status(201).json(txn);
  } catch (err) {
    console.error("withdraw error:", err);
    if (err.code === "NO_OVERDRAFT")
      return res.status(422).json({ error: "NO_OVERDRAFT" });
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/**
 * @swagger
 * /transactions/statement/{accountId}:
 *   get:
 *     summary: Get the account statement for a specific account
 *     tags: [Transactions]
 *     parameters:
 *       - name: accountId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1001
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           example: 50
 *       - name: offset
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           example: 0
 *     responses:
 *       200:
 *         description: List of transactions for the account
 *       500:
 *         description: Internal error
 */
router.get("/statement/:accountId", async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId, 10);
    const limit = parseInt(req.query.limit || "50", 10);
    const offset = parseInt(req.query.offset || "0", 10);
    const rows = await transactionService.getStatement(accountId, limit, offset);
    return res.json(rows);
  } catch (err) {
    console.error("statement error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

export default router;