# 🏦 MudraFlow — Relational Database Management System (DBMS)

> **Core Banking System Project** featuring ACID-compliant transactions, InnoDB row-level locking, automated triggers, stored procedures, audit logging, and an interactive Python CLI interface built for **XAMPP MySQL / MariaDB**.

---

## 📋 Table of Contents
- [Quick Start: Python + XAMPP (Submission Guide)](#-quick-start-python--xampp-submission-guide)
- [System Architecture](#-system-architecture)
- [Database Design & Schema (Schema.sql)](#-database-design--schema-schemasql)
- [Stored Procedures, Triggers & Functions](#-stored-procedures-triggers--functions)
- [CLI Application Features (main.py)](#-cli-application-features-mainpy)
- [Demo Credentials](#-demo-credentials)
- [ACID Concurrency Demo (Viva Highlight)](#-acid-concurrency-demo-viva-highlight)
- [Project Structure](#-project-structure)

---

## 🚀 Quick Start: Python + XAMPP (Submission Guide)

For college/lab submission, MudraFlow runs with **2 primary files**:
1. `Schema.sql` — All DDL, tables, constraints, procedures, triggers, views, and initial seed data.
2. `main.py` — Interactive, colored CLI banking portal connecting directly to your local MySQL/XAMPP.

### Step 1: Start MySQL in XAMPP
1. Open the **XAMPP Control Panel**.
2. Click **Start** next to **MySQL** (Default port: `3306`).

### Step 2: Import `Schema.sql`
You can import the database using either **phpMyAdmin** or the **Command Prompt**:

#### Option A: Using phpMyAdmin (GUI)
1. Open your browser and navigate to `http://localhost/phpmyadmin`.
2. Click on the **Import** tab at the top.
3. Choose the file `Schema.sql` from this project folder.
4. Click **Import** (or **Go**) at the bottom.
   > The script automatically creates the `mudraflow` database and all 10 tables, triggers, and procedures.

#### Option B: Using Command Prompt / Terminal
```cmd
cd C:\xampp\mysql\bin
mysql.exe -u root < "C:\path\to\mudraflow\Schema.sql"
```

### Step 3: Install Python Dependencies
```bash
pip install mysql-connector-python tabulate bcrypt
```

### Step 4: Run the Banking Application
```bash
python main.py
```

---

## 🏛 System Architecture

MudraFlow is built around the fundamental DBMS rule: **The database is the single source of truth.**
- **No direct balance mutations:** Balances can *never* be updated via arbitrary `UPDATE` queries. All debits, credits, and fund transfers execute strictly through ACID-compliant stored procedures (`sp_transfer`).
- **Row-Level Locking:** All accounts involved in money movement are locked using `SELECT ... FOR UPDATE` ordered by Account ID to prevent race conditions and deadlocks.
- **Automated Trigger Auditing:** Any status change, freeze, or balance modification automatically appends an immutable record to `account_audit`.

```
               ┌──────────────────────────────────────┐
               │         main.py (Python CLI)         │
               │   Customer Portal  │  Staff Portal   │
               └──────────────────┬───────────────────┘
                                  │ (mysql-connector)
                                  ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║                   MySQL 8 / MariaDB (XAMPP)                      ║
 ║                                                                  ║
 ║  ┌─────────────────────────┐      ┌───────────────────────────┐  ║
 ║  │    Stored Procedures    │      │         Triggers          │  ║
 ║  │ • sp_transfer           │      │ • trg_account_audit       │  ║
 ║  │ • sp_create_fd          │      │ • trg_prevent_frozen_debit│  ║
 ║  │ • sp_approve_loan       │      │ • trg_prevent_direct_edit │  ║
 ║  │ • sp_process_maturities │      └─────────────┬─────────────┘  ║
 ║  │ • sp_register_customer  │                    │                ║
 ║  └───────────┬─────────────┘                    ▼                ║
 ║              ▼                       ┌────────────────────────┐  ║
 ║  ┌─────────────────────────┐         │     account_audit      │  ║
 ║  │ 10 Relational Tables    │────────▶│   (Immutable Log)      │  ║
 ║  │ (InnoDB Row Locks)      │         └────────────────────────┘  ║
 ║  └─────────────────────────┘                                     ║
 ╚══════════════════════════════════════════════════════════════════╝
```

---

## 🗄 Database Design & Schema (`Schema.sql`)

The schema consists of **10 normalized relational tables** enforcing Foreign Keys and `ON DELETE RESTRICT`:

| Table | Description |
|---|---|
| `customer` | Stores customer credentials (bcrypt passwords), Aadhaar, PAN, phone, and active status. |
| `account` | Holds savings, current, and FD accounts with precise `DECIMAL(12,2)` balances. |
| `staff` | Bank employee logins with operational roles (`TELLER`, `MANAGER`, `ADMIN`). |
| `txn` | Ledger records for all debits and credits with UTR transaction references. |
| `fixed_deposit` | Term deposits linked to accounts, tracking principal, tenure, interest rate, and maturity. |
| `loan` | Loan accounts tracking sanctioned amount, outstanding balance, and EMI schedule. |
| `service_request`| Tracks customer requests for cheque books, debit cards, and credit facilities. |
| `payee` | Saved beneficiaries for one-click internal and inter-bank transfers. |
| `login_attempts` | Security tracking for failed customer and staff login attempts. |
| `account_audit` | Immutable trigger-maintained audit trail recording all balance and status transitions. |

---

## ⚡ Stored Procedures, Triggers & Functions

### Stored Procedures
1. **`sp_transfer(p_src, p_dst, p_amt, p_mode, p_remarks, OUT p_status, OUT p_msg)`**:
   - Validates account status (checks for frozen/dormant accounts).
   - Validates sufficient balance.
   - Enforces transaction mode rules (RTGS min ₹2,00,000, IMPS max ₹5,00,000).
   - Locks source and destination accounts simultaneously via `SELECT ... FOR UPDATE`.
   - Debits source, credits destination, and writes dual balanced ledger entries into `txn`.
   - Full rollback on failure (`DECLARE EXIT HANDLER FOR SQLEXCEPTION`).

2. **`sp_create_fd(p_acc_id, p_principal, p_tenure_months, OUT p_fd_id)`**:
   - Calls the `get_fd_rate()` function to determine interest tier.
   - Locks account, debits principal, logs transfer txn, and creates the fixed deposit.

3. **`sp_approve_loan(p_loan_id, p_staff_id, p_decision, OUT p_msg)`**:
   - Handles loan disbursement. Upon approval, automatically credits the linked savings account and creates an active disbursement record.

4. **`sp_process_maturities()`**:
   - Batch job cursor that scans all matured active FDs, computes compound maturity value, credits the savings account, and closes the FD.

5. **`sp_register_customer(...)`**:
   - Validates unique PAN/Aadhaar and provisions both customer profile and primary savings account in a single atomic transaction.

### Triggers
- **`trg_account_audit`**: Fires `AFTER UPDATE` on `account` to append old balance, new balance, old status, new status, timestamp, and changing user to `account_audit`.
- **`trg_prevent_frozen_debit`**: Fires `BEFORE INSERT` on `txn` to block any debit transaction on a frozen account.
- **`trg_prevent_direct_balance_edit`**: Ensures balances cannot be altered outside stored procedure session contexts.

### Views & Functions
- **`get_fd_rate(tenure_months)`**: Deterministic stored function returning interest percentage based on tenure.
- **`v_applications`**: Comprehensive analytical view joining loan and service requests with customer details.

---

## 💻 CLI Application Features (`main.py`)

Run `python main.py` to open the interactive terminal application:

```text
============================================================================
  MUDRAFLOW BANKING SYSTEM · MAIN MENU
============================================================================
  [1] Customer Banking Portal (Accounts, Transfers, Passbook, FDs)
  [2] Bank Staff & Operations Portal (Approvals, Liquidity, Freezes)
  [3] Live Concurrency & ACID Race-Condition Demo (Test D2)
  [4] View Immutable Trigger Audit Log (account_audit)
  [5] System & Database Health Check
  [0] Exit Application
```

### 1. Customer Banking Portal
- **Login / Register**: Authenticate using Customer ID or Phone and bcrypt password.
- **Passbook / Statement**: View paginated transaction history with Running Balances, UTR numbers, and timestamps.
- **Fund Transfer**: Instant transfers via IMPS, NEFT, or RTGS with automatic balance validation.
- **Open Fixed Deposit**: Real-time maturity calculation with dynamic interest rates.
- **Service Requests**: Apply for Loans, Cheque Books, or Debit Cards.
- **Beneficiaries**: Add and manage payees.

### 2. Bank Staff & Operations Portal
- **Dashboard & Liquidity**: Real-time overview of branch deposits, loan book, and vault balance.
- **Review Loan Applications**: Inspect pending loans with customer income and approve/reject.
- **Account Freeze / Unfreeze**: Emergency freeze toggle (fires audit trigger).
- **Process FD Maturities**: Execute batch interest crediting and maturity settlements.
- **Master Ledger**: Filter transactions across all accounts.

### 3. Live Concurrency & ACID Race-Condition Demo (Menu [3])
A built-in viva demonstration proving InnoDB row locking:
- Launches **two parallel Python threads** attempting to withdraw **₹8,000 each** at the exact same millisecond from an account with only **₹10,000 balance**.
- Proves that Thread 1 locks the row and succeeds, while Thread 2 is blocked and safely rolled back with `Insufficient balance`. Total balance correctly ends at ₹2,000, preventing any negative balance or double-spend.

---

## 🔑 Demo Credentials

### Customer Portal
| Customer ID | Full Name | Password | Primary Account ID |
|---|---|---|---|
| `10000001` | Aarav Sharma | `Password@123` | `10001` |
| `10000002` | Priya Patel | `Password@123` | `10002` |
| `10000003` | Rohan Iyer | `Password@123` | `10003` |

### Bank Staff Portal
| Employee ID | Name | Role | Password |
|---|---|---|---|
| `EMP001` (or `1`) | Vikram Malhotra | Senior Manager | `Demo@123` |
| `EMP002` (or `2`) | Sunita Sen | Chief Loan Officer | `Demo@123` |
| `EMP003` (or `3`) | Rajesh Kumar | Branch Teller | `Demo@123` |

---

## 📁 Project Structure

```
mudraflow/
├── Schema.sql                 # Complete database schema, procedures, triggers & seeds
├── main.py                    # Interactive Python CLI banking application
├── MudraFlow_Project_Report.md# Complete DBMS term project report
├── .env.example               # Database configuration template
├── README.md                  # Project documentation & run guide
├── backend/                   # Optional: Express.js REST API layer
├── frontend/                  # Optional: React + Vite web dashboard
└── spec/                      # System design specifications & schema notes
```
