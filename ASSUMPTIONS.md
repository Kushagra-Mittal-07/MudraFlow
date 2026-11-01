# MudraFlow: Assumptions and Design Clarifications

This document records all architectural assumptions, schema clarifications, and resolved discrepancies across `/spec`, ensuring full traceability for the report and viva.

## 1. Table Naming: `txn`
- **Spec Observation:** The conceptual ER diagram (`er-diagram.svg`) designates the entity as `TRANSACTION`, while `03-database.md` §1 explicitly names the physical table `txn` to avoid collision with MySQL's reserved keyword `TRANSACTION`.
- **Assumption:** The MySQL table is named `txn`. In documentation and presentation materials, `TRANSACTION` refers to the conceptual entity and `txn` to the physical relation.

## 2. Direct INSERT for Pending Loan and Service Request Applications
- **Spec Observation:** `01-overview.md` defines 7 stored procedures (register, open account, transfer, create FD, approve loan, decide service request, process maturities). None exist for *submitting* loan applications or *requesting* debit cards/cheque books.
- **Assumption:** In accordance with `03-database.md` §9 (`mudraflow_app` is granted `INSERT` on `beneficiary`, `loan`, `service_request`), the backend directly executes parameterized `INSERT` statements for initial application submissions. The stored procedures `sp_approve_loan` and `sp_decide_service_request` handle decision-making and balance/card generation.

## 3. Debit Card Status Representation
- **Spec Observation:** `03-database.md` §1 defines `service_request.status` as `ENUM('REQUESTED','APPROVED','REJECTED')`. `02-flows.md` and `05-ui.md` state that debit cards show `Active` once approved.
- **Assumption:** The database stores `status = 'APPROVED'`. The API and UI render `APPROVED` debit cards with the label `ACTIVE`, adhering to note in `03-database.md` line 126 ("UI shows APPROVED cards as 'Active'").

## 4. `account_number` and `txn.reference_no` Generation
- **Spec Observation:** Both `account.account_number` (`CHAR(10)`) and `txn.reference_no` (`VARCHAR(20)`) are `NOT NULL UNIQUE` columns whose values incorporate the row's auto-incrementing ID.
- **Assumption:** During procedural insertion (`sp_register_customer`, `sp_open_account`, `sp_transfer`, `sp_create_fd`, `sp_approve_loan`, `sp_process_maturities`), rows are initially inserted with a unique temporary placeholder (`LPAD(UUID_SHORT() % 10000000000, 10, '0')` or `CONCAT('TMP', UUID_SHORT())`). The procedure captures `LAST_INSERT_ID()` and immediately updates the row to its formatted identity (`CONCAT('5', LPAD(1000000 + account_id, 9, '0'))` and `CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(txn_id, 6, '0'))`) within the same ACID transaction before commit.

## 5. View `v_applications` Unified Aliases
- **Spec Observation:** `v_applications` performs a `UNION ALL` between `loan` and `service_request`.
- **Assumption:** Unified column aliases are used: `application_type`, `application_id`, `reference_no` (formatted as `LN-0001`, `CD-0001`, `CB-0001`), `customer_id`, `account_id`, `details`, `status`, and `applied_on`.

## 6. Beneficiary Transfer Resolution
- **Spec Observation:** `04-api.md` allows `POST /transfers` with either explicit payee details or a `beneficiary_id`. `sp_transfer` accepts raw payee details.
- **Assumption:** When `beneficiary_id` is supplied, the backend looks up `account_number`, `ifsc`, and `name` from `beneficiary` belonging to the authenticated customer before calling `sp_transfer`.

## 7. Account Lockout Lifecycle
- **Spec Observation:** 5 consecutive failed login attempts lock a customer for 10 minutes.
- **Assumption:** On login attempt:
  1. If `locked_until > NOW()`, reject immediately with remaining time.
  2. If `locked_until <= NOW()`, clear `locked_until`.
  3. If password matches, set `failed_attempts = 0` and `locked_until = NULL`.
  4. If password fails, increment `failed_attempts`. If `failed_attempts >= 5`, set `locked_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE)` and reset `failed_attempts = 0`. UI displays attempts remaining as `5 - failed_attempts`.

## 8. Frozen Account Block Trigger
- **Spec Observation:** `trg_txn_block_frozen` prevents transactions involving frozen accounts.
- **Assumption:** The trigger evaluates `NEW.from_account_id` and `NEW.to_account_id` independently with `IS NOT NULL` checks to safely accommodate transactions where one side is NULL (opening deposit, FD creation, loan credit, FD maturity).

## 9. Maturity Processing for Frozen Accounts
- **Spec Observation:** `sp_process_maturities` skips CREDIT maturities if the account is frozen.
- **Assumption:** If an account is `FROZEN`, both CREDIT and RENEW operations for that account are skipped during batch processing, incrementing the skipped counter to maintain strict account freezes.

