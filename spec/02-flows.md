# 02. Flows

> **Note:** this file defines what each feature does. **Where things sit on screen, navigation and page layouts are defined in `05-ui.md`**, which takes priority for layout. Differences you will see there: the dashboard is called Home and also shows this month's money in and out, the next FD maturity, an accounts list and the latest applications; the "Accounts" list and "Open another account" live in the top-bar account switcher, the Home accounts list and the Profile page; Services is one hub that includes Track applications; Payees has its own page.

## Customer flow

### 1. Landing page
Two buttons: **Login** and **Open Account**. A small link for **Staff login**.

### 2. Register
1. Form: full name, date of birth, email, phone, PAN, address, account type (Savings or Current), branch, opening deposit (demo, minimum ₹1,000), password, confirm password.
2. Next screen asks for the demo OTP (`123456`).
3. Backend calls `sp_register_customer`. In one ACID transaction it creates the customer, the first account and the opening deposit entry.
4. Success screen: a receipt with Customer ID, Account Number (shown in full here only), branch, IFSC and opening balance.

### 3. Login
- Customer ID and password.
- 5 wrong attempts lock the customer for 10 minutes. Show the remaining lock time.
- A successful login resets `failed_attempts` to 0 and returns a JWT.

### 4. Dashboard
Top to bottom:
1. **Account tabs** across the top, one per account, labelled like `Savings ••••4821`, plus an **Open account** button at the end.
2. **Balance card** for the selected account:
   - Account type, status badge (Active or Frozen)
   - Account number masked as `•••• •••• 4821`, with VIEW and COPY chips
   - Balance **hidden by default** as `₹ XX,XXX.XX`; an eye icon toggles it
   - When revealed, also show the amount in words (Indian system, for example "One lakh twenty-four thousand five hundred rupees and seventy-five paise")
   - Branch name and IFSC in small text
3. **Quick actions:** Transfer, History, Fixed deposit, Loan, Services.
4. **Status strip:** active FD count and pending requests count.
5. **Recent transactions:** the last 5 for the selected account. Credits in green with a down-left arrow, debits in red with an up-right arrow.

### 5. Accounts
List of the customer's accounts with type, masked number, status and balance (hidden toggle). Button **Open another account**: choose type and branch, choose a funding account and amount, confirm with password. Calls `sp_open_account` (ACID, money moves from the funding account to the new one).

### 6. Transfer
1. Choose the **from-account**.
2. Choose how to pay:
   - **Direct transfer:** receiver name, receiver account number, IFSC, amount, mode.
   - **Beneficiary transfer:** pick a saved beneficiary, amount, mode.
3. The backend checks the account number and IFSC exist together in our tables and shows the review screen.
4. **Review screen:** from, to, amount, mode, remarks.
5. Confirm with **password and OTP (`123456`)**.
6. Receipt screen with reference number, from and to (masked), amount, mode, time.

**Add beneficiary:** name, account number, IFSC. The backend verifies the account exists and the IFSC matches its branch. Confirm with password.

### 7. History and receipts
- Ledger for the selected account with filters: date range, type (transfer, opening deposit, FD, loan credit, FD maturity), min and max amount.
- Each row opens a receipt page with a **Print** button.

### 8. Fixed deposit
1. Choose the account (balance shown), amount, tenure (6, 12, 24, 36 or 60 months).
2. The rate appears from `get_fd_rate`. The maturity amount is shown live.
3. Choose the maturity instruction: **Credit to account** or **Renew**.
4. Review, then confirm with password.
5. Money leaves the account and the FD becomes Active.
6. **My FDs** lists all FDs with status. Payout happens at maturity only.

Maturity amount formula (simple interest, easy to explain): `amount * (1 + rate/100 * tenure_months/12)`.

### 9. Services
One page with two cards, both stored in the `service_request` table.

- **Debit card:** account, name on card, network (Visa, Mastercard, RuPay), delivery address, confirm with password. Status: Requested, then **Active** once staff approve. Approval generates a demo card number and expiry.
- **Cheque book:** account, number of leaves (10, 25 or 50), delivery address, confirm with password. Status: Requested, then Approved.

### 10. Loan
Account, amount, purpose, duration in months, employment status, annual income. The rate appears from `get_loan_rate`. Confirm with password. Status is **Pending** until staff decide. Approval credits the account.

### 11. Track applications
One list showing every loan and service request, from the `v_applications` view, with stamp-style status badges (Pending, Approved, Rejected, Requested, Active).

### 12. Profile
Read-only details. PAN is masked as `••••••234F`. No editing.

---

## Staff flow

### 1. Login
Employee ID and password.

### 2. Overview
- Stat tiles: total customers, total accounts, total balance, transactions today, pending approvals.
- **Money per branch:** a table or simple bar chart from a `GROUP BY branch` query.

### 3. Approvals (two tabs)
- **Loans:** list of pending loans. Approve (calls `sp_approve_loan`, credits the account) or Reject.
- **Cards and cheque books:** list of pending service requests. Approve (calls `sp_decide_service_request`, generates card number and expiry for cards) or Reject.

### 4. Customers and accounts
Search by customer ID, name, or account number. Freeze or unfreeze an account. A frozen account cannot send or receive money.

### 5. Transactions
Filterable list of every transaction: date range, type, account number, amount range.

### 6. FD maturities
List of Active FDs whose maturity date is today or earlier. A **Process maturities** button calls `sp_process_maturities` and shows how many were processed.

Staff can never edit a balance directly.
