Banking Transaction Service
The Transaction Service manages all core banking operations—deposits, withdrawals, and transfers—ensuring data consistency and idempotency.
It maintains account balances, prevents duplicate transactions, and publishes transaction events to RabbitMQ so other services (like Notifications) can react asynchronously.

✨ Features
Handles Deposit, Withdraw, and Transfer operations

Maintains account balances with validation

Uses idempotency keys to prevent duplicate transactions

Publishes events to RabbitMQ (transaction_events queue)

REST API with Swagger Documentation

PostgreSQL persistence layer

📁 Project Structure
text
.
├── .env
├── docker-compose.yml
├── Dockerfile
├── package.json
├── scripts/
│   └── init.sql
├── src/
│   ├── app.js                   # Express entry point
│   ├── db/
│   │   └── connection.js        # PostgreSQL connection
│   ├── routes/
│   │   └── transactions.js      # REST endpoints
│   └── services/
│       ├── transactionService.js# Core business logic
│       └── eventPublisher.js    # Publishes events to RabbitMQ
🧩 Prerequisites
Node.js >= 20

npm

Docker & Docker Compose

RabbitMQ (can be run with Docker Compose)

⚙️ Environment Configuration
Create a .env file with:

text
PORT=3000
DB_HOST=transaction-db
DB_USER=postgres
DB_PASS=postgres
DB_NAME=transaction_db
DB_PORT=5432
RABBITMQ_URL=amqp://admin:Password@transaction-rabbitmq:5672/
🗄️ Database Schema
Auto-initialized via scripts/init.sql.
Key tables:

customers

Column	Type	Description
customer_id	SERIAL	Primary key
name	VARCHAR(100)	Customer name
email	VARCHAR(100)	Customer email
phone	VARCHAR(20)	Contact number
kyc_status	VARCHAR(20)	KYC verification status
created_at	TIMESTAMP	Auto timestamp
accounts

Column	Type	Description
account_id	SERIAL	Primary key
customer_id	INTEGER	Foreign key to customers
account_number	VARCHAR(50)	Unique account number
balance	NUMERIC(15,2)	Current balance
created_at	TIMESTAMP	Auto timestamp
transactions

Column	Type	Description
txn_id	SERIAL	Primary key
account_id	INTEGER	Linked account
txn_type	VARCHAR(50)	Deposit/Withdraw/Transfer
amount	NUMERIC(15,2)	Transaction amount
balance_before	NUMERIC(15,2)	Previous balance
balance_after	NUMERIC(15,2)	Updated balance
counterparty	VARCHAR(50)	Other account in transfer
created_at	TIMESTAMP	Auto timestamp
transaction_idempotency

Column	Type	Description
id	SERIAL	Primary key
idempotency_key	VARCHAR(255)	Unique request key
account_id	INTEGER	Related account
created_at	TIMESTAMP	Auto timestamp
🐳 Running with Docker Compose
Build and start all services (DB, RabbitMQ, Transaction):

text
docker-compose up --build
Run detached:

text
docker-compose up -d
View logs:

text
docker logs -f transaction-service
Expected:

Transactions table ready

Swagger docs at http://localhost:3000/api-docs

Server running on port 3000

🧠 Running Locally (Without Docker)
Install & start:

text
npm install
npm run dev
Ensure PostgreSQL and RabbitMQ are accessible per your .env.

🌐 API Endpoints
Method	Endpoint	Description
POST	/transactions/deposit	Deposit funds
POST	/transactions/withdraw	Withdraw funds
POST	/transactions/transfer	Transfer between accounts
GET	/api-docs	Swagger Documentation
🧾 Example Requests
Deposit
text
curl -X POST http://localhost:3000/transactions/deposit   -H "Content-Type: application/json"   -d '{
    "account_id": 1, "amount": 1000, "idempotency_key": "dep-001"
  }'
Response:

json
{
  "message": "Deposit successful",
  "account_id": 1,
  "amount": 1000,
  "balance_after": 11000
}
Withdraw
text
curl -X POST http://localhost:3000/transactions/withdraw   -H "Content-Type: application/json"   -d '{
    "account_id": 1, "amount": 500, "idempotency_key": "with-001"
  }'
Response:

json
{
  "message": "Withdrawal successful",
  "account_id": 1,
  "amount": 500,
  "balance_after": 10500
}
Transfer
text
curl -X POST http://localhost:3000/transactions/transfer   -H "Content-Type: application/json"   -d '{
    "from_account_id": 1, "to_account_id": 2,
    "amount": 1000, "counterparty": "ACC1002",
    "idempotency_key": "transfer-001"
  }'
Response:

json
{
  "message": "Transfer successful",
  "debitTxn": { "amount": 1000 },
  "creditTxn": { "amount": 1000 }
}
🔄 Event Flow
text
User initiates deposit/withdraw/transfer
→ Transaction Service validates & updates balances
→ Publishes event to RabbitMQ
→ Notification Service consumes & stores notification
🧪 Testing
Unit & integration tests with Jest & Supertest, e.g.:

unit_tests/transactionService.test.js

js
import request from "supertest";
import app from "../src/app.js";

describe("Transaction API", () => {
  test("Deposit should succeed", async () => {
    const res = await request(app)
      .post("/transactions/deposit")
      .send({ account_id: 1, amount: 500, idempotency_key: "test-key-1" });
    expect(res.statusCode).toBe(200);
  });
});
Run:

text
npm test
If Cannot use import statement outside a module, add "type": "module" in your package.json.

🧩 Idempotency Explained
Every transaction request must have an idempotency_key—this prevents repeated client requests from causing duplicates.
Workflow:

text
Client sends idempotency_key
→ Check transaction_idempotency table
   ├─ If exists: Return same response
   └─ If new:    Process transaction, store key, publish event
⚙️ Configuration Overview
text
src/
├── app.js                     # Express app setup
├── routes/
│   └── transactions.js        # REST endpoints
├── services/
│   ├── transactionService.js  # Business logic
│   └── eventPublisher.js      # RabbitMQ event publisher
├── db/
│   └── connection.js          # PostgreSQL connection
└── scripts/
    └── init.sql               # DB initialization
📘 Swagger Documentation
Access Swagger UI at:
👉 http://localhost:3000/api-docs

📜 License
MIT License

👤 Author
Himanshu S Gautam
Student ID: 2024TM93048

🧭 Quick Start
text
# 1. Clone repository
git clone <your-repo-url>
cd transaction-service

# 2. Configure environment
cp .env.example .env

# 3. Start service
docker-compose up --build

# 4. Access docs
http://localhost:3000/api-docs