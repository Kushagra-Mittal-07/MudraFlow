# 07. Testing

Run sections A to D directly in the MySQL client in Phase 2. Run section E through the API in Phase 3. Record the actual output of each test.

## A. Access control

| # | Test | Expected |
|---|---|---|
| A1 | As `mudraflow_app`, run `UPDATE account SET balance = 999999 WHERE account_id = 1` | Permission denied |
| A2 | As `mudraflow_app`, run `UPDATE account SET status = 'FROZEN' WHERE account_id = 1` | Allowed |
| A3 | As `mudraflow_app`, `CALL sp_transfer(...)` with valid data | Works (procedures run as DEFINER) |
| A4 | As `mudraflow_app`, `DELETE FROM txn` | Permission denied |

## B. Procedure rules

| # | Test | Expected |
|---|---|---|
| B1 | Register with a valid form and ₹10,000 | Customer, account and OPENING_DEPOSIT txn created, balance 10,000 |
| B2 | Register with an opening deposit of ₹500 | Rejected, nothing inserted (check no customer row remains) |
| B3 | Register with a duplicate PAN or email | Rejected, rolled back |
| B4 | Transfer IMPS of ₹5,00,001 | Rejected: IMPS limit |
| B5 | Transfer RTGS of ₹1,99,999 | Rejected: RTGS minimum |
| B6 | Transfer NEFT of any valid amount | Succeeds |
| B7 | Transfer more than the balance | Rejected, balances unchanged |
| B8 | Transfer to an account number and IFSC that do not match | Rejected |
| B9 | Transfer to your own account | Rejected |
| B10 | Transfer from a FROZEN account | Rejected by the procedure and by `trg_txn_block_frozen` |
| B11 | Transfer to a FROZEN account | Rejected |
| B12 | Create FD with tenure 7 months | Rejected |
| B13 | Create FD of ₹20,000 for 12 months | Balance drops by 20,000, FD ACTIVE, rate 7.00, maturity 21,400.00 |
| B14 | Approve a pending loan | Account credited, LOAN_CREDIT txn exists, loan APPROVED with `decided_by` |
| B15 | Approve the same loan again | Rejected: not pending |
| B16 | Approve a debit card request | `card_number` has 16 digits and the right starting digit, `card_expiry` is 5 years ahead |
| B17 | Process maturities with an FD whose date has passed (CREDIT) | Account credited, FD MATURED, FD_MATURITY txn exists |
| B18 | Process maturities with a RENEW FD | Old FD MATURED, a new ACTIVE FD for the maturity amount, no txn row |

## C. Triggers, view and rates

| # | Test | Expected |
|---|---|---|
| C1 | After every successful transfer | Two `audit_log` rows (sender and receiver) with correct old and new balances and the right `txn_id` |
| C2 | After a failed transfer | No audit rows added |
| C3 | `SELECT * FROM v_applications` | Shows loans and service requests together with consistent columns |
| C4 | `get_fd_rate` for 6, 12, 24, 36, 60 | 6.50, 7.00, 7.50, 7.75, 7.75 |
| C5 | `get_loan_rate` for 12, 24, 48 | 10.00, 11.00, 12.00 |

## D. Ledger and concurrency

**D1. Ledger invariant.** This query must return zero rows:

```sql
SELECT a.account_id, a.balance,
       COALESCE(c.credits,0) - COALESCE(d.debits,0) AS computed
FROM account a
LEFT JOIN (SELECT to_account_id id, SUM(amount) credits FROM txn
           WHERE to_account_id IS NOT NULL GROUP BY to_account_id) c ON c.id = a.account_id
LEFT JOIN (SELECT from_account_id id, SUM(amount) debits FROM txn
           WHERE from_account_id IS NOT NULL GROUP BY from_account_id) d ON d.id = a.account_id
WHERE a.balance <> COALESCE(c.credits,0) - COALESCE(d.debits,0);
```

**D2. Two simultaneous transfers on the same account.** Account X has ₹10,000. Open two MySQL sessions. In both, call `sp_transfer` for ₹8,000 from X at the same moment (use `SLEEP` inside a test copy of the procedure or two terminals). Expected: one succeeds, the other waits for the lock and then fails with "Insufficient balance". Final balance of X is ₹2,000, never negative.

**D3. Opposite transfers.** Account X sends to Y while Y sends to X at the same time, repeated 100 times with a script. Expected: no deadlock errors, ledger check D1 still passes.

**D4. Index comparison.** With about 50,000 rows in `txn`, run `EXPLAIN` on the history query for one account and date range, before and after creating the index. Save both outputs.

## E. API tests

| # | Test | Expected |
|---|---|---|
| E1 | Login with the right password | Token returned, `failed_attempts` reset to 0 |
| E2 | Login with a wrong password 5 times | The 5th sets `locked_until` 10 minutes ahead. A correct password during the lock is refused with the remaining time |
| E3 | Transfer with the wrong password | 401, no money moves |
| E4 | Transfer with the correct password and OTP `111111` | Rejected, no money moves |
| E5 | Transfer with the correct password and OTP `123456` | Succeeds, receipt returned |
| E6 | Customer A requests customer B's account history | 403 or 404 |
| E7 | A customer token on a `/staff/...` route | 403 |
| E8 | Dashboard response | Account numbers masked, five recent transactions at most |
| E9 | Staff freezes an account | Customer's next transfer from it fails with "Account is frozen" |
| E10 | Staff approves a loan | Customer's balance and history update |
| E11 | Registration with a wrong OTP | Rejected, no customer created |
| E12 | Profile response | PAN masked, no `password_hash` anywhere in any response |
| E13 | History rows for an account | The newest row's `balance_after` equals the account balance. Each older row's `balance_after` equals the next newer row's `balance_after` minus its signed amount. The oldest row's `balance_after` equals the opening deposit |

## F. UI checks

- The balance is hidden on first load, and the eye toggle shows or hides it along with the amount in words.
- Switching the active account in the top-bar switcher changes the number, balance, this-month totals, at-a-glance stats and recent transactions on Home, and becomes the default account on Transfer, History and the drawers.
- Amounts show in the Indian format (₹1,24,500.75).
- Statuses (Pending, Approved, Rejected, Requested, Active) show as badges.
- Receipts print cleanly.
