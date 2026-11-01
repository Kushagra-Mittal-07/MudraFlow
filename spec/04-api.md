# 04. API (Node.js and Express)

Base path `/api`. JSON in, JSON out. Auth uses a JWT in the `Authorization: Bearer <token>` header. The token carries `role` (`customer` or `staff`) and the id. Customer routes reject staff tokens and the other way round.

## Conventions

- Success: `{ "ok": true, "data": ... }`
- Error: `{ "ok": false, "message": "readable text" }` with a suitable status code. Procedure errors from `SIGNAL` pass their message through. Never return raw SQL errors.
- **Password confirmation:** endpoints marked `[pw]` take a `password` field. The backend compares it with the stored bcrypt hash first. Wrong password gives 401 and the procedure is not called.
- **OTP:** endpoints marked `[otp]` take an `otp` field, valid only if it equals `123456`.
- **Ownership:** every customer route checks that the account or record belongs to the logged-in customer.
- **Masking:** the API never sends a full account number in lists. Send `account_number_masked` (`•••• •••• 4821`) and `last4`. The full number is sent only on the registration receipt and on the profile or accounts detail call for the owner.
- PAN is sent masked (`••••••234F`: the first 6 characters hidden).
- Staff endpoints return **full** account numbers (staff need them to search and act). Customer endpoints never do, except on the registration receipt and `GET /accounts/:id` (used by the VIEW and COPY chips).
- Use parameterised queries only.

## Auth

| Method and path | Body | Notes |
|---|---|---|
| POST `/auth/register` | all registration fields, `otp` `[otp]` | calls `sp_register_customer`, returns customer_id, account_number, receipt data |
| POST `/auth/login` | customer_id, password | checks `locked_until`. On a wrong password increment `failed_attempts`; at 5 set `locked_until = NOW() + 10 minutes` and reset the counter. On success reset and return JWT |
| POST `/staff/auth/login` | emp_id, password | returns JWT with role staff |

## Customer

| Method and path | Purpose |
|---|---|
| GET `/dashboard?account_id=` | everything the Home page needs for the active account: all the customer's accounts (masked, with status and balance), the selected account's card data (type, status, masked number, balance, branch name, IFSC), `month_in` and `month_out` (this calendar month's credits and debits for that account, from one `SUM ... GROUP BY` query), active FD count, `next_fd_maturity` (earliest `maturity_date` and `maturity_amount` among ACTIVE FDs, or null), pending requests count, the last 5 transactions (with `description` and `balance_after`), and the 3 latest loan or service requests from `v_applications` |
| GET `/accounts` | all accounts of the customer, masked |
| GET `/accounts/:id` | one account with the **full** account number (for VIEW and COPY), branch name and IFSC |
| POST `/accounts` | open another account `[pw]`. Body: account_type, branch_id, from_account_id, amount. Calls `sp_open_account` |
| GET `/branches` | list for dropdowns |
| POST `/transfers/review` | body: from_account_id, to_account_number, ifsc, amount, mode (or beneficiary_id). Validates receiver and mode rules without moving money, returns the review summary |
| POST `/transfers` | `[pw]` `[otp]`. Body: from_account_id, mode, amount, remarks, and either (to_account_number, ifsc, receiver_name) or beneficiary_id. Calls `sp_transfer`, returns reference_no |
| GET `/transactions/:reference_no` | receipt data for printing |
| GET `/transactions` | history. Query: account_id, from, to, type, min, max, page. The response also includes `summary`: `{ count, money_in, money_out }` for the current filters (computed over the filtered set, not just the current page). Each row includes `description` (built by the backend, e.g. `Transfer to ••••0004 · Property advance`, `Opening deposit`, `Fixed deposit created`, `Loan credited`) and `balance_after`. Compute `balance_after` in SQL with a window function over the account's full ledger **before** filtering and paging: `balance_after = account.balance - COALESCE(SUM(signed_amount) OVER (ORDER BY created_at DESC, txn_id DESC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)`, where `signed_amount` is +amount for credits and -amount for debits |
| GET `/beneficiaries` | saved payees |
| POST `/beneficiaries` | `[pw]`. Body: name, account_number, ifsc. Verifies account and IFSC exist together, then inserts |
| GET `/fd/preview?amount=&tenure=` | returns rate (from `get_fd_rate`) and maturity amount |
| POST `/fd` | `[pw]`. Body: account_id, amount, tenure_months, instruction. Calls `sp_create_fd` |
| GET `/fd` | the customer's FDs |
| GET `/loans/rate?duration=` | returns rate from `get_loan_rate` |
| POST `/loans` | `[pw]`. Body: account_id, amount, purpose, duration_months, employment_status, annual_income. Inserts a PENDING loan with rate from `get_loan_rate` |
| POST `/services/debit-card` | `[pw]`. Body: account_id, name_on_card, network, delivery_address |
| POST `/services/cheque-book` | `[pw]`. Body: account_id, leaves (10, 25 or 50), delivery_address |
| GET `/applications` | rows from `v_applications` for this customer |
| GET `/profile` | customer details with PAN masked |

## Staff

| Method and path | Purpose |
|---|---|
| GET `/staff/overview` | tiles: customers, accounts, total balance, transactions today, pending approvals. Plus money per branch (`GROUP BY`), `pending_loans`, `pending_services`, `fd_due_count`, and the 8 latest transactions |
| GET `/staff/loans?status=` | loans list |
| POST `/staff/loans/:id/decision` | body: decision. Calls `sp_approve_loan` |
| GET `/staff/services?status=` | service requests list |
| POST `/staff/services/:id/decision` | body: decision. Calls `sp_decide_service_request` |
| GET `/staff/customers?q=` | search by customer id, name or account number. Returns matching customers with their account count |
| GET `/staff/customers/:id` | one customer's details (PAN masked) and all their accounts with full account numbers, balances and statuses |
| PATCH `/staff/accounts/:id/status` | body: status (`ACTIVE` or `FROZEN`). Updates only the status column |
| GET `/staff/transactions` | filters: from, to, type, account_number, min, max, page. Includes `summary`: `{ count, total_amount }` for the filters |
| GET `/staff/fd/due` | ACTIVE FDs with `maturity_date <= today`, plus `total_payout` (sum of maturity amounts for CREDIT instructions) |
| POST `/staff/fd/process-maturities` | calls `sp_process_maturities`, returns processed_count |

## Backend rules

- The backend must never run `UPDATE account SET balance`. The database user would be refused anyway.
- Use a connection pool and one connection per request when calling procedures.
- Return amounts as strings or numbers with two decimals. The frontend formats them in the Indian system (₹1,24,500.75).
