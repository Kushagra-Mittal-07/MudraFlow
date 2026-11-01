# MudraFlow Backend

## Prerequisites
- **Node.js** (v18 or newer)
- **MySQL 8** (InnoDB) – a database named `mudraflow` with the schema built from `db/01_schema.sql` and `db/02_programs.sql`
- `npm` (comes with Node)

## Setup
```bash
# 1. Install dependencies
npm install

# 2. Copy the example environment file and edit the values
cp .env.example .env
#   - Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, etc.

# 3. Seed the database (runs stored procedures only)
node db/seed/seed.js
```

## Running the server
```bash
npm start          # runs `node server.js`
# The server listens on the port defined in .env (default 3000)
```

## Running the test suite
```bash
node backend/tests/api-tests.js
```
All tests from spec/07‑testing.md (E1‑E13) should pass.

## API Overview
All routes are prefixed with `/api`.

### Auth routes
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/auth/register` | – | Register a new customer (OTP verification required) |
| `POST` | `/auth/login` | – | Customer login – returns JWT |
| `POST` | `/staff/auth/login` | – | Staff login – returns JWT |

### Customer routes (`role=customer`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard?account_id=` | Dashboard with account list, recent transactions, balances, FD stats, pending counts |
| `GET` | `/accounts` | List all of the customer's accounts (masked) |
| `GET` | `/accounts/:id` | Full account details (full number) |
| `POST` | `/accounts` | Open a new account (password‑confirmed) |
| `POST` | `/transfers/review` | Validate a transfer without moving money |
| `POST` | `/transfers` | Execute a transfer (password + OTP) |
| `GET` | `/transactions?account_id=` | Transaction history for a specific account |
| `GET` | `/fd` | List active Fixed Deposits |
| `POST` | `/fd` | Create Fixed Deposit (password‑confirmed) |
| `GET` | `/loans` | List customer's loans |
| `POST` | `/loans` | Request a new loan (password‑confirmed) |
| `GET` | `/services` | List customer's service requests |
| `POST` | `/services` | Request a new service (e.g., debit card) |
| `GET` | `/profile` | Customer profile (masked PAN) |

### Staff routes (`role=staff`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/staff/overview` | Aggregated statistics: total customers, accounts, balance, today’s transactions, pending approvals |
| `GET` | `/staff/loans` | List all loans (optional `?status=` filter) |
| `POST` | `/staff/loans/:id/decision` | Approve/reject a loan (calls `sp_approve_loan`) |
| `GET` | `/staff/services` | List all service requests (optional `?status=` filter) |
| `POST` | `/staff/services/:id/decision` | Approve/reject a service request (calls `sp_decide_service_request`) |
| `GET` | `/staff/customers` | Search customers by ID, name, email or account number |
| `GET` | `/staff/customers/:id` | Full customer detail with un‑masked account numbers |
| `PATCH` | `/staff/accounts/:id/status` | Freeze or un‑freeze an account (updates `status` only) |
| `GET` | `/staff/transactions` | List transactions with flexible filters (`account_number`, `type`, date range, amount range) |
| `GET` | `/staff/fd/due` | List active Fixed Deposits that have matured or mature today |
| `POST` | `/staff/fd/process` | Process maturities (`sp_process_maturities`) |

All routes return JSON in the form:
```json
{ "ok": true, "data": { … } }
```
Error responses follow the same structure with `{"ok": false, "message": "…"}` and propagate any `SIGNAL` messages from stored procedures.

## Coding Style & Conventions
- All DB interactions use **parameterised queries** – never concatenate values into SQL strings.
- Password checks (`[pw]` routes) use `bcrypt.compare` before invoking any stored procedure.
- OTP is hard‑coded to `123456` for the demo (see spec/04‑api.md).
- Money changes **only** via stored procedures – the backend never runs `UPDATE account SET balance`.
- Every route is wrapped with `asyncHandler` for unified error handling.

---
*This README was generated to satisfy Phase 3 Part B requirements.*
