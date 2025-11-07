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

SELECT setval('transactions_txn_id_seq', COALESCE((SELECT MAX(txn_id)+1 FROM transactions), 1), false);

