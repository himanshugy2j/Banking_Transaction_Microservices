import express from "express";
import transactionService from "../services/transactionService.js";

const router = express.Router();

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
 *             properties:
 *               account_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               counterparty:
 *                 type: string
 *             required:
 *               - account_id
 *               - amount
 *     responses:
 *       200:
 *         description: Deposit successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input or business error
 *       500:
 *         description: Internal server error
 */
router.post("/deposit", async (req, res) => {
  try {
    const txn = await transactionService.processDeposit(req.body);
    res.json(txn);
  } catch (err) {
    console.error("deposit error:", err);
    if (err.code) {
      // Send specific error code and 400 status
      res.status(400).json({ error: err.code });
    } else {
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
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
 *             properties:
 *               account_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               counterparty:
 *                 type: string
 *             required:
 *               - account_id
 *               - amount
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input or business error
 *       500:
 *         description: Internal server error
 */
router.post("/withdraw", async (req, res) => {
  try {
    const txn = await transactionService.processWithdraw(req.body);
    res.json(txn);
  } catch (err) {
    console.error("withdraw error:", err);
    if (err.code) {
      // Send specific error code and 400 status
      res.status(400).json({ error: err.code });
    } else {
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
});

/**
 * @swagger
 * /transactions/statement/{account_id}:
 *   get:
 *     summary: Get account statement (latest transactions)
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Statement retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input or business error
 *       500:
 *         description: Internal server error
 */
router.get("/statement/:account_id", async (req, res) => {
  try {
    const { account_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const statement = await transactionService.getStatement(account_id, limit, offset);
    res.json(statement);
  } catch (err) {
    console.error("statement error:", err);
    if (err.code) {
      res.status(400).json({ error: err.code });
    } else {
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
});

export default router;
