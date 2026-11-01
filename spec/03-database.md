# 03. Database (MySQL 8, InnoDB)

Database name: `mudraflow`. All tables use InnoDB and `utf8mb4`. Money columns are `DECIMAL(15,2)`. Never use FLOAT for money.

Table naming: lowercase snake_case. The transactions table is called `txn` to avoid clashing with the SQL keyword TRANSACTION.

## 1. Tables

### branch
| Column | Type | Notes |
|---|---|---|
| branch_id | INT PK AUTO_INCREMENT | |
| branch_name | VARCHAR(60) NOT NULL | |
| ifsc | CHAR(11) NOT NULL UNIQUE | `MUDF` + 7 digits, e.g. `MUDF0000482` |
| city | VARCHAR(40) NOT NULL | |

### employee
| Column | Type | Notes |
|---|---|---|
| emp_id | VARCHAR(10) PK | e.g. `EMP001` |
| full_name | VARCHAR(80) NOT NULL | |
| role | ENUM('MANAGER','CLERK') NOT NULL | |
| branch_id | INT NOT NULL FK to branch | |
| password_hash | VARCHAR(100) NOT NULL | bcrypt |

### customer
| Column | Type | Notes |
|---|---|---|
| customer_id | BIGINT PK AUTO_INCREMENT | start at 10000001 (8 digits) |
| full_name | VARCHAR(80) NOT NULL | |
| dob | DATE NOT NULL | must be 18 or older |
| email | VARCHAR(100) NOT NULL UNIQUE | |
| phone | CHAR(10) NOT NULL | |
| pan | CHAR(10) NOT NULL UNIQUE | format AAAAA9999A |
| address | VARCHAR(255) NOT NULL | |
| password_hash | VARCHAR(100) NOT NULL | bcrypt |
| failed_attempts | TINYINT NOT NULL DEFAULT 0 | |
| locked_until | DATETIME NULL | |
| created_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |

### account
| Column | Type | Notes |
|---|---|---|
| account_id | INT PK AUTO_INCREMENT | |
| account_number | CHAR(10) NOT NULL UNIQUE | `CONCAT('5', LPAD(1000000 + account_id, 9, '0'))`, e.g. `5001000001` |
| customer_id | BIGINT NOT NULL FK to customer | |
| branch_id | INT NOT NULL FK to branch | |
| account_type | ENUM('SAVINGS','CURRENT') NOT NULL | |
| balance | DECIMAL(15,2) NOT NULL DEFAULT 0 | `CHECK (balance >= 0)` |
| status | ENUM('ACTIVE','FROZEN') NOT NULL DEFAULT 'ACTIVE' | |
| opened_on | DATE NOT NULL | |

### txn
| Column | Type | Notes |
|---|---|---|
| txn_id | BIGINT PK AUTO_INCREMENT | |
| reference_no | VARCHAR(20) NOT NULL UNIQUE | e.g. `MF` + date + padded id |
| from_account_id | INT NULL FK to account | NULL for credits from the bank (opening deposit, loan, FD maturity) |
| to_account_id | INT NULL FK to account | NULL for money locked into an FD |
| receiver_name | VARCHAR(80) NULL | as typed by the customer on direct transfers |
| amount | DECIMAL(15,2) NOT NULL | `CHECK (amount > 0)` |
| mode | ENUM('IMPS','NEFT','RTGS','INTERNAL') NOT NULL | INTERNAL for system movements |
| txn_type | ENUM('OPENING_DEPOSIT','TRANSFER','FD_CREATE','FD_MATURITY','LOAN_CREDIT') NOT NULL | |
| remarks | VARCHAR(100) NULL | |
| created_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |

Rule: at least one of `from_account_id`, `to_account_id` is not NULL (`CHECK`).

### beneficiary
| Column | Type | Notes |
|---|---|---|
| beneficiary_id | INT PK AUTO_INCREMENT | |
| customer_id | BIGINT NOT NULL FK to customer | |
| name | VARCHAR(80) NOT NULL | |
| account_number | CHAR(10) NOT NULL | |
| ifsc | CHAR(11) NOT NULL | |
| added_on | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |

`UNIQUE (customer_id, account_number)`.

### fixed_deposit
| Column | Type | Notes |
|---|---|---|
| fd_id | INT PK AUTO_INCREMENT | |
| customer_id | BIGINT NOT NULL FK | |
| account_id | INT NOT NULL FK | account the money came from and returns to |
| amount | DECIMAL(15,2) NOT NULL | |
| rate | DECIMAL(4,2) NOT NULL | saved from `get_fd_rate` at creation |
| tenure_months | INT NOT NULL | 6, 12, 24, 36 or 60 |
| start_date | DATE NOT NULL | |
| maturity_date | DATE NOT NULL | |
| maturity_amount | DECIMAL(15,2) NOT NULL | simple interest |
| maturity_instruction | ENUM('CREDIT','RENEW') NOT NULL | |
| status | ENUM('ACTIVE','MATURED') NOT NULL DEFAULT 'ACTIVE' | |

### loan
| Column | Type | Notes |
|---|---|---|
| loan_id | INT PK AUTO_INCREMENT | |
| customer_id | BIGINT NOT NULL FK | |
| account_id | INT NOT NULL FK | account to credit on approval |
| amount | DECIMAL(15,2) NOT NULL | |
| purpose | VARCHAR(100) NOT NULL | |
| duration_months | INT NOT NULL | |
| rate | DECIMAL(4,2) NOT NULL | saved from `get_loan_rate` at application time |
| employment_status | ENUM('SALARIED','SELF_EMPLOYED','STUDENT','OTHER') NOT NULL | |
| annual_income | DECIMAL(15,2) NOT NULL | |
| status | ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' | |
| applied_on | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| decided_by | VARCHAR(10) NULL FK to employee | |
| decided_on | DATETIME NULL | |

### service_request
| Column | Type | Notes |
|---|---|---|
| request_id | INT PK AUTO_INCREMENT | |
| customer_id | BIGINT NOT NULL FK | |
| account_id | INT NOT NULL FK | |
| request_type | ENUM('DEBIT_CARD','CHEQUE_BOOK') NOT NULL | |
| name_on_card | VARCHAR(60) NULL | card only |
| network | ENUM('VISA','MASTERCARD','RUPAY') NULL | card only |
| leaves | INT NULL | cheque book only: 10, 25 or 50 |
| delivery_address | VARCHAR(255) NOT NULL | |
| card_number | CHAR(16) NULL | generated on card approval |
| card_expiry | DATE NULL | generated on card approval |
| status | ENUM('REQUESTED','APPROVED','REJECTED') NOT NULL DEFAULT 'REQUESTED' | UI shows APPROVED cards as "Active" |
| requested_on | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| decided_by | VARCHAR(10) NULL FK to employee | |
| decided_on | DATETIME NULL | |

### audit_log
| Column | Type | Notes |
|---|---|---|
| audit_id | BIGINT PK AUTO_INCREMENT | |
| account_id | INT NOT NULL FK | |
| txn_id | BIGINT NULL | taken from session variable `@current_txn_id` |
| old_balance | DECIMAL(15,2) NOT NULL | |
| new_balance | DECIMAL(15,2) NOT NULL | |
| changed_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |

## 2. Relationships

- customer 1:N account
- branch 1:N account
- branch 1:N employee
- account 1:N txn (as sender), account 1:N txn (as receiver)
- customer 1:N beneficiary
- customer 1:N fixed_deposit, account 1:N fixed_deposit
- customer 1:N loan, account 1:N loan, employee 1:N loan (decider)
- customer 1:N service_request, account 1:N service_request, employee 1:N service_request (decider)
- account 1:N audit_log

## 3. Stored functions

Both are `DETERMINISTIC` and return `DECIMAL(4,2)`.

**`get_fd_rate(p_tenure_months INT)`**
- up to 6 months: 6.50
- up to 12 months: 7.00
- up to 24 months: 7.50
- above 24 months: 7.75

**`get_loan_rate(p_duration_months INT)`**
- up to 12 months: 10.00
- up to 36 months: 11.00
- above 36 months: 12.00

The rate is copied onto each FD or loan row when it is created, so changing a function later never alters old records.

## 4. Stored procedures

All procedures use `START TRANSACTION`, an `EXIT HANDLER FOR SQLEXCEPTION` that does `ROLLBACK` then `RESIGNAL`, and `COMMIT` at the end. Business-rule failures use `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '...'` with a short readable message the backend can show.

Procedures that change balances must set `@current_txn_id` to the new `txn_id` before updating `account`, so the audit trigger can link the audit row.

### sp_register_customer
Inputs: name, dob, email, phone, pan, address, password_hash, account_type, branch_id, opening_amount.
Outputs: customer_id, account_number.
Steps:
1. Validate age 18 or older, opening_amount at least 1000.
2. Insert `customer`.
3. Insert `account` with balance 0, then set `account_number`.
4. Insert `txn` of type `OPENING_DEPOSIT` (from NULL, to the new account, mode INTERNAL).
5. Set `@current_txn_id`, then update the account balance to the opening amount.
6. Commit.

### sp_open_account
Inputs: customer_id, account_type, branch_id, from_account_id, amount.
Steps: lock the funding account row, check ownership, status ACTIVE, balance at least amount (minimum 1000). Create the new account at balance 0. Insert a `txn` of type TRANSFER, mode INTERNAL, from funding to new. Debit and credit. Commit.

### sp_transfer
Inputs: customer_id, from_account_id, to_account_number, to_ifsc, receiver_name, amount, mode, remarks.
Outputs: reference_no.
Steps:
1. Validate mode rules: IMPS at most 500000, RTGS at least 200000, NEFT any. Amount greater than 0.
2. Find the receiver account by joining `account` and `branch` on `account_number` and `ifsc`. If not found, signal "Receiver account or IFSC not found".
3. Reject if sender and receiver are the same account.
4. `START TRANSACTION`.
5. **Lock both account rows with `SELECT ... FOR UPDATE`, always in ascending `account_id` order.** This prevents deadlocks when two people transfer to each other at the same time.
6. Check the sender account belongs to `customer_id`. Check both accounts are ACTIVE. Check sender balance is at least amount.
7. Insert `txn` (TRANSFER). Set `@current_txn_id`.
8. Debit sender, credit receiver.
9. Commit and return `reference_no`.

### sp_create_fd
Inputs: customer_id, account_id, amount, tenure_months, instruction.
Outputs: fd_id.
Steps: validate tenure in (6, 12, 24, 36, 60) and amount at least 1000. Lock the account row. Check ownership, ACTIVE, balance. Rate from `get_fd_rate`. Compute maturity_date and maturity_amount. Insert `txn` of type FD_CREATE (from the account, to NULL). Debit. Insert the `fixed_deposit` row. Commit.

### sp_approve_loan
Inputs: loan_id, emp_id, decision ('APPROVED' or 'REJECTED').
Steps: lock the loan row, require status PENDING. If REJECTED, update the loan and stop. If APPROVED, lock the account row, require ACTIVE, insert `txn` of type LOAN_CREDIT (from NULL, to the account), credit the balance, update the loan with `decided_by` and `decided_on`. Commit.

### sp_decide_service_request
Inputs: request_id, emp_id, decision.
Steps: lock the row, require REQUESTED. For an approved DEBIT_CARD, generate a 16 digit demo card number (starts with 4 for Visa, 5 for Mastercard, 6 for RuPay) and an expiry five years ahead. Update status, `decided_by`, `decided_on`. Commit.

### sp_process_maturities
Inputs: emp_id. Output: processed_count.
Steps: loop with a cursor over ACTIVE FDs where `maturity_date <= CURDATE()`.
- If instruction is CREDIT: lock the account, skip it if the account is FROZEN, insert `txn` of type FD_MATURITY (from NULL, to the account) for `maturity_amount`, credit, mark the FD MATURED.
- If instruction is RENEW: mark the FD MATURED and insert a new ACTIVE FD with amount equal to the old maturity_amount, the same tenure, the current `get_fd_rate`, and instruction RENEW. No money moves, so no `txn` row.
Commit and return the count.

## 5. Triggers

### trg_account_audit
`AFTER UPDATE ON account FOR EACH ROW`. If `OLD.balance <> NEW.balance`, insert into `audit_log` (account_id, `@current_txn_id`, old balance, new balance).

### trg_txn_block_frozen
`BEFORE INSERT ON txn FOR EACH ROW`. If `from_account_id` or `to_account_id` belongs to an account with status FROZEN, `SIGNAL SQLSTATE '45000'` with message "Account is frozen". This enforces the rule at the database level even if the app forgets to check.

## 6. View

### v_applications
UNION ALL of:
- loans: `'LOAN'` as application_type, loan_id, customer_id, account_id, a summary like `CONCAT('Loan of ₹', amount, ' for ', purpose)`, status, applied_on
- service requests: request_type as application_type, request_id, customer_id, account_id, a summary like `CONCAT(request_type, ' request')`, status, requested_on

Same column names and types in both halves. Ordered by date in the query that uses it, not in the view.

## 7. Indexes

InnoDB creates indexes for foreign keys automatically. Add these explicitly:

| Index | Purpose |
|---|---|
| `account(customer_id)` | list a customer's accounts |
| `txn(from_account_id, created_at)` | history for sent money |
| `txn(to_account_id, created_at)` | history for received money |
| `txn(created_at)` | staff transaction list and "today" counts |
| `fixed_deposit(status, maturity_date)` | maturities due |
| `loan(status)` and `service_request(status)` | approval lists |

`account.account_number` and `customer.pan`, `customer.email` are already UNIQUE, so they have indexes.

For the report, write a script that bulk-inserts about 50,000 test rows into a copy of `txn`, then run `EXPLAIN` on the history query before and after creating the index and record the difference (`type`, `rows`, `key`).

## 8. Seed data

Seed using the stored procedures so the ledger stays consistent.

- **Branches:** Rohini Sec-9 `MUDF0000482`, Dwarka Sec-12 `MUDF0000483`, Noida Sec-18 `MUDF0000484`.
- **Employees:** `EMP001` (manager, Rohini), `EMP002` (clerk, Dwarka).
- **Customers (5), created by `sp_register_customer`** with different opening deposits:
  - Riya Sharma: ₹1,25,000
  - Priya Verma: ₹60,000
  - Rahul Sharma: ₹9,75,000
  - Neha Singh: ₹15,000
  - Amit Kumar: ₹3,40,000
- **A second account** for Riya via `sp_open_account`, so the 1:N relationship shows in the data.
- **8 to 10 sample transfers** between them via `sp_transfer`, using all three modes.
- **One FD** for Rahul, **one pending loan** for Priya, **one pending debit card request** for Neha.
- Demo password for every seeded user: `Demo@123` (hash it with bcrypt in the seed script).

## 9. Database users and permissions (access control)

Create two users:

- `mudraflow_app`: used by the backend. Grants:
  - `SELECT` on all tables
  - `INSERT` on `beneficiary`, `loan`, `service_request`
  - `UPDATE (failed_attempts, locked_until)` on `customer`
  - `UPDATE (status)` on `account` (staff freeze and unfreeze)
  - `EXECUTE` on all stored procedures
  - **No UPDATE on `account.balance`**, no DELETE anywhere
- `mudraflow_admin`: owner used for setup and tests.

Create procedures with `SQL SECURITY DEFINER` so they can update balances even though the app user cannot. This is the technical proof of "staff cannot edit balances directly".
