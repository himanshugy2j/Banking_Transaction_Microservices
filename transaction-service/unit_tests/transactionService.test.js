// @jest-environment node
import { jest } from "@jest/globals";

// --- Mock definitions (must be declared before imports) ---
const mockQuery = jest.fn();
const mockPublishEvent = jest.fn();

jest.unstable_mockModule("../src/db/connection.js", () => ({
  default: { query: mockQuery },
}));

jest.unstable_mockModule("../src/services/eventPublisher.js", () => ({
  publishEvent: mockPublishEvent,
}));

// --- Import after mocks are registered ---
const { default: transactionService } = await import("../src/services/transactionService.js");
const { default: db } = await import("../src/db/connection.js");
const eventPublisher = await import("../src/services/eventPublisher.js");

// --- Tests ---
describe("Transaction Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("processDeposit", () => {
    test("throws error if account is frozen", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "FROZEN", balance: 1000 }] });

      await expect(
        transactionService.processDeposit({ account_id: 1, amount: 1000, counterparty: "test" })
      ).rejects.toThrow("ACCOUNT_FROZEN");
    });

    test("deposits money and publishes event", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: "ACTIVE", balance: 1000 }] }) // checkAccountStatus
        .mockResolvedValueOnce({ rows: [{ balance: 1000 }] }) // get balance
        .mockResolvedValueOnce({
          rows: [
            { txn_id: 1, account_id: 1, amount: 1000, txn_type: "DEPOSIT", counterparty: "test" },
          ],
        }) // insert txn
        .mockResolvedValueOnce({}); // update balance

      mockPublishEvent.mockResolvedValue();

      const txn = await transactionService.processDeposit({
        account_id: 1,
        amount: 1000,
        counterparty: "test",
      });

      expect(txn).toMatchObject({ account_id: 1, amount: 1000, txn_type: "DEPOSIT" });
      expect(mockPublishEvent).toHaveBeenCalledWith("transaction.deposit", expect.any(Object));
    });
  });

  describe("processWithdraw", () => {
    test("throws error if account is frozen", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "FROZEN", balance: 1000 }] });

      await expect(
        transactionService.processWithdraw({ account_id: 1, amount: 500, counterparty: "test" })
      ).rejects.toThrow("ACCOUNT_FROZEN");
    });

    test("throws error if insufficient funds", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: "ACTIVE", balance: 100 }] }) // checkAccountStatus
        .mockResolvedValueOnce({ rows: [{ balance: 100 }] }); // get balance

      await expect(
        transactionService.processWithdraw({ account_id: 1, amount: 500, counterparty: "test" })
      ).rejects.toThrow("INSUFFICIENT_FUNDS");
    });

    test("withdraws money and publishes event", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ status: "ACTIVE", balance: 1000 }] }) // checkAccountStatus
        .mockResolvedValueOnce({ rows: [{ balance: 1000 }] }) // get balance
        .mockResolvedValueOnce({
          rows: [
            { txn_id: 2, account_id: 1, amount: 500, txn_type: "WITHDRAW", counterparty: "test" },
          ],
        }) // insert txn
        .mockResolvedValueOnce({}); // update balance

      mockPublishEvent.mockResolvedValue();

      const txn = await transactionService.processWithdraw({
        account_id: 1,
        amount: 500,
        counterparty: "test",
      });

      expect(txn).toMatchObject({ account_id: 1, amount: 500, txn_type: "WITHDRAW" });
      expect(mockPublishEvent).toHaveBeenCalledWith("transaction.withdraw", expect.any(Object));
    });
  });
});
