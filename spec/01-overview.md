# 01. Overview

## What MudraFlow is

A demo online banking system. Customers register, log in, move money between accounts, create fixed deposits, apply for loans, and request debit cards and cheque books. Staff approve requests, freeze accounts, and process FD maturities.

All banks in the system are MudraFlow branches, so every account number and IFSC is checked against our own tables. There is no external bank.

## Tech stack (defaults, change only if needed)

| Layer | Choice |
|---|---|
| Database | MySQL 8.x, InnoDB |
| Backend | Node.js, Express, `mysql2` (promise API), `bcrypt`, `jsonwebtoken` |
| Frontend | React with Vite |
| Auth | JWT, separate roles: `customer` and `staff` |

## Money rules (the most important rules in the project)

Customers cannot deposit or withdraw cash. Money enters the system in only three ways:

1. **Opening deposit**: demo money entered at registration.
2. **Approved loan**: credited to the customer's account by staff approval.
3. **Matured fixed deposit**: credited to the account when staff process maturities.

Everything else is movement:

- Transfers between accounts.
- Money locked into a fixed deposit (leaves the account, returns at maturity).

Staff can never edit a balance directly. Every balance change happens inside a stored procedure.

**Ledger invariant:** for every account, `balance = SUM(credits) - SUM(debits)` computed from the `txn` table. A test in `07-testing.md` checks this.

## Verification rules

| Action | Verification |
|---|---|
| Registration | Demo OTP `123456` |
| Login | Customer ID + password. 5 wrong attempts lock the user for 10 minutes |
| Transfer (direct or beneficiary) | Password + demo OTP `123456` |
| Add beneficiary, create FD, card request, cheque book request, loan request, open another account | Password only |
| Staff actions | None extra (already logged in) |

There is **no PIN** anywhere. The password the customer created at signup is used for every confirmation. Password checking (bcrypt) happens in the backend before it calls the stored procedure. OTP checking is a simple comparison with `123456` in the backend.

## Transfer modes

| Mode | Rule |
|---|---|
| IMPS | Amount up to ₹5,00,000 |
| NEFT | Any amount |
| RTGS | Amount at least ₹2,00,000 |

## Scope summary

- **10 tables:** branch, employee, customer, account, txn, beneficiary, fixed_deposit, loan, service_request, audit_log
- **7 stored procedures:** register, open another account, transfer, create FD, approve loan, decide service request, process maturities
- **2 stored functions:** `get_fd_rate`, `get_loan_rate`
- **2 triggers:** audit on balance change, block transactions on frozen accounts
- **1 view:** `v_applications`
- **Indexes:** account number, customer ID, transaction date, plus status columns

## DBMS concept map (for the report and viva)

| Concept | Where it lives |
|---|---|
| ER diagram, cardinality | Whole schema, `er-diagram/` |
| Normalization (1NF to 3NF) | `txn`, `loan`, `account` |
| ACID | Register, transfer, open account, create FD, approve loan |
| Row locking | `sp_transfer` using `SELECT ... FOR UPDATE`, locking in account_id order to avoid deadlocks |
| Triggers | `trg_account_audit`, `trg_txn_block_frozen` |
| Stored procedures and functions | The 7 procedures, 2 rate functions |
| View | `v_applications` (UNION of loans and service requests) |
| Indexes | `EXPLAIN` before and after on the history query |
| Joins and aggregation | Staff overview, history filters |
| Access control | Column-level GRANTs so the app cannot change balances directly |

## Explicitly out of scope

PIN, OTP table, interest rate table, fraud alerts, Help page, card block/unblock, profile editing, top customers, 7-day chart, real SMS or email, real payment gateways.
