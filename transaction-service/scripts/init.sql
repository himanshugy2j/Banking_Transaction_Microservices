-- ===========================
-- Transaction Service Init SQL
-- ===========================

-- Create tables (as you already have)
CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  kyc_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  account_id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id),
  account_number VARCHAR(20) UNIQUE,
  account_type VARCHAR(50),
  balance NUMERIC(15, 2),
  currency VARCHAR(10),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  txn_id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(account_id),
  amount NUMERIC(15, 2),
  txn_type VARCHAR(20),
  counterparty VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Insert default customers
-- ===========================
INSERT INTO customers (customer_id, name, email, phone, kyc_status)
VALUES 
  (1, 'John Doe', 'john@example.com', '9999999999', 'VERIFIED'),   -- Active account
  (2, 'Jane Smith', 'jane@example.com', '8888888888', 'VERIFIED'), -- Frozen account
  (3, 'Bob Lee', 'bob@example.com', '7777777777', 'VERIFIED')      -- Low balance
ON CONFLICT (customer_id) DO NOTHING;

-- ===========================
-- Insert default accounts
-- ===========================
INSERT INTO accounts (account_id, customer_id, account_number, account_type, balance, currency, status)
VALUES 
  (1, 1, 'ACC1001', 'SAVINGS', 10000, 'INR', 'ACTIVE'),   -- Active, sufficient balance
  (2, 2, 'ACC1002', 'SAVINGS', 5000, 'INR', 'FROZEN'),    -- Frozen account
  (3, 3, 'ACC1003', 'SAVINGS', 100, 'INR', 'ACTIVE')      -- Low balance, triggers insufficient funds
ON CONFLICT (account_id) DO NOTHING;

-- ===========================
-- Reset transaction sequence
-- ===========================
SELECT setval('transactions_txn_id_seq', COALESCE((SELECT MAX(txn_id)+1 FROM transactions), 1), false);

-- ===========================
-- Notes for testing
-- ===========================
-- Account 1: Active → can test deposit, withdrawal, daily limit
