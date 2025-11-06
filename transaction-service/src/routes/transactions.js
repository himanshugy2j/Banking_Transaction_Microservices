import express from "express";
import transactionService from "../services/transactionService.js";

const router = express.Router();

// Deposit endpoint
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

// Withdraw endpoint
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

// Get statement endpoint
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
