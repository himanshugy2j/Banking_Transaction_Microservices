CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  event_type VARCHAR(255),  -- increased from 100 to 255
  account_id INTEGER,
  amount NUMERIC(15,2),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
