import express from "express";
import transactionService from "../services/transactionService.js";

const router = express.Router();

// GET statement for an account (latest 50 transactions by default)
router.get("/:account_id/statement", async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const statement = await transactionService.getStatement(req.params.account_id, limit, offset);
    res.json(statement);
  } catch (err) {
    console.error("Error fetching statement:", err);
    res.status(400).json({ error: err.message });
  }
});

// GET all transactions for an account
router.get("/:account_id/transactions", async (req, res) => {
  try {
    const result = await transactionService.getTransactionHistory(req.params.account_id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;