# MudraFlow

> A DBMS-centric online banking system engineered with **MySQL 8 (InnoDB)**, **Node.js (Express)**, and **React (Vite)**.
> In MudraFlow, the database is the star: financial invariants, balance mutations, and concurrency controls are enforced directly in the database engine.

---

## Key Engineering Highlights

1. **Balances Change Only Inside Stored Procedures:**
   - The application backend connects as a restricted MySQL user `mudraflow_app`.
   - `mudraflow_app` has **zero** `UPDATE` permission on `account.balance`.
   - All balance changes execute exclusively through stored procedures (`sp_register_customer`, `sp_open_account`, `sp_transfer`, `sp_create_fd`, `sp_approve_loan`, `sp_decide_service_request`, `sp_process_maturities`).

2. **Concurrency & Deadlock Prevention (Pessimistic Locking):**
   - Money transfers use `SELECT ... FOR UPDATE` with locks acquired in consistent ascending account order (`LEAST(from_id, to_id)` then `GREATEST(from_id, to_id)`).
   - This eliminates race conditions and circular waits (deadlocks), ensuring accounts never go negative even under high concurrent load.

3. **Regulatory Audit Logging & Freeze Protection:**
   - Trigger `trg_account_audit` logs every balance or status change to the append-only `account_audit` table.
   - Trigger `trg_txn_block_frozen` prevents any debits or credits on frozen accounts.

4. **Passbook UI Design:**
   - Built to specification with zero external UI kits, zero gradients, zero emoji, and a clean tabular layout.
   - Fully responsive across 360px (mobile cards & bottom tab bar), 768px (off-canvas drawer), and 1280px (full desktop view).
   - Print-optimized stylesheets for transaction receipts and account statements.

---

## Project Structure

```
mudraflow/
├── db/                       # Database scripts and benchmarks
│   ├── 01_schema.sql         # 10 tables, constraints, users, and grants
│   ├── 02_programs.sql       # Stored procedures, functions, triggers, views
│   ├── seed.js               # Seed script with bcrypt-hashed passwords
│   └── tests/                # Concurrency and EXPLAIN benchmark tests
├── backend/                  # Thin Express API layer
│   ├── server.js             # Server entry point
│   ├── db.js                 # MySQL connection pool (mudraflow_app)
│   ├── routes/               # auth, customer, staff routes
│   └── tests/                # Automated API gate tests (12/12)
├── frontend/                 # React 18 + Vite Passbook UI
│   ├── src/components/       # AppShell, LedgerTable, Slip, Drawers, Modals
│   ├── src/pages/            # Customer & Staff portal pages
│   ├── src/styles/           # Design tokens, responsive, and print CSS
│   └── tests/                # Formatters and currency unit tests (7/7)
├── spec/                     # Complete specifications (01 to 07)
└── docs/                     # Presentation demo script & EXPLAIN benchmark
```

---

## Prerequisites

- **MySQL Server 8.0+** running locally (InnoDB storage engine)
- **Node.js 18+** (LTS recommended)
- **npm 9+**

---

## Installation & Setup

### 1. Clone & Install Dependencies

```powershell
# In project root:
cd backend
npm install

cd ../frontend
npm install

cd ..
```

### 2. Configure Environment Variables

Create `.env` in the project root and `backend/.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mudraflow
DB_USER=mudraflow_app
DB_PASSWORD=MudraAppPass@123

# Admin credentials for schema creation/migrations
DB_ADMIN_USER=root
DB_ADMIN_PASSWORD=your_root_password

# Application Settings
PORT=3000
JWT_SECRET=mudraflow_demo_jwt_secret_key_change_in_production
NODE_ENV=development
```

### 3. Initialize the Database & Seed Data

Run the database setup scripts in order using MySQL client:

```powershell
# 1. Create schema and database users (run as root)
mysql -u root -p < db/01_schema.sql

# 2. Create procedures, functions, triggers, and views
mysql -u root -p < db/02_programs.sql

# 3. Populate seed data with hashed passwords
node db/seed.js
```

---

## Running the Application

### Start the Backend API (Port 3000)

```powershell
cd backend
node server.js
```
The API server starts at `http://localhost:3000`.

### Start the Frontend Dev Server (Port 5173)

In a separate terminal:

```powershell
cd frontend
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## Running Verification Tests

### 1. Frontend Unit Tests (7/7)
Tests Indian currency grouping (`formatMoney`), amount-in-words, and date masking:
```powershell
npm test --prefix frontend
```

### 2. Backend Automated API Gate Tests (12/12)
Validates auth lockout, access controls, transfers, staff approvals, and ledger invariants:
```powershell
node backend/tests/api-tests.js
```

### 3. Concurrency Race Condition Test (Test D2)
Simultaneously executes two ₹8,000 transfers on an account with ₹10,000 balance:
```powershell
node db/tests/concurrency.js
```
*Expected result:* Exactly one transfer succeeds; the second waits for the lock and fails with `Insufficient balance`. Balance never goes negative.

### 4. Database Indexing Benchmark (Test D4)
Benchmarks full-table scan vs. composite B-Tree index over 50,000 rows:
```powershell
mysql -u root -p < db/tests/explain.sql
```
*Result:* Query inspection rows drop from 50,000 to 112 (**446x speedup**), eliminating filesort.

---

## Demo Credentials

### Customer Login (`/login`)
- **Customer ID:** `10000001` (Aarav Patel) or any seed customer (`10000001` to `10000008`)
- **Password:** `Password@123`
- **Demo OTP:** `123456`

### Staff Login (`/staff/login`)
- **Staff ID:** `1` (or `EMP001`)
- **Password:** `StaffPassword@123`

---

## Presentation & Viva Walkthrough

See [`docs/demo-script.md`](file:///c:/Users/Kushagra/Downloads/mudraflow-project-start/mudraflow/docs/demo-script.md) for a comprehensive, 8-minute presentation guide covering registration, transfers, concurrency demonstrations, fixed deposits, staff approvals, and index optimization.
