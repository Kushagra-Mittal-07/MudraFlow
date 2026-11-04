# MudraFlow: 8-Minute Presentation & Viva Demo Script

This script provides a step-by-step presentation walkthrough for presentation day. Designed for an ~8-minute live demonstration highlighting MudraFlow's core DBMS engineering, stored procedures, ACID transaction integrity, concurrency isolation, audit triggers, and indexing performance.

---

## Presentation Overview & Timing Guide

| Phase | Time | Topic / Screen | Key Technical Highlight |
|---|---|---|---|
| **1. Intro & Architecture** | 0:00 – 1:00 | Terminal / ER Diagram | MySQL 8 InnoDB, procedures own balances, `mudraflow_app` restricted grants |
| **2. Registration & Account** | 1:00 – 2:15 | Browser: `/register` | Atomic `sp_register_customer`, OTP verification, initial opening deposit ledger entry |
| **3. Transfer & ACID** | 2:15 – 3:30 | Browser: `/app/transfer` | `sp_transfer`, ordered `FOR UPDATE` dead-lock prevention, live slip, receipt stamp |
| **4. Concurrency Demo** | 3:30 – 4:45 | Terminal: `node db/tests/concurrency.js` | Test D2: simultaneous ₹8,000 transfers on ₹10,000 balance; row locking prevents race |
| **5. Fixed Deposit Booking**| 4:45 – 5:30 | Browser: `/app/fd` | `sp_create_fd`, `get_fd_rate()` deterministic tenure interest rate function |
| **6. Staff Loan Approval**  | 5:30 – 6:30 | Browser: `/staff/approvals` | `sp_approve_loan`, staff review drawer, instant customer ledger disbursement |
| **7. Audit Log & Triggers** | 6:30 – 7:15 | MySQL CLI / Staff Customers | `trg_account_audit`, freeze enforcement via `trg_txn_block_frozen` |
| **8. EXPLAIN Optimization**| 7:15 – 8:00 | Terminal / `explain-output.txt` | 50,000 rows benchmark, composite B-tree index, 446x I/O reduction, zero filesort |

---

## Detailed Step-by-Step Script

### 1. Introduction & Architecture (0:00 – 1:00)

**Presenter dialogue:**
> *"Good morning professors and examiners. Today we present MudraFlow, a secure online banking platform engineered specifically around relational database management principles in MySQL 8.
> In MudraFlow, the database is the star. Unlike typical web applications that perform business logic and balance calculations in application memory, MudraFlow enforces all financial invariants directly inside MySQL 8 stored procedures and triggers.
> Furthermore, the application backend connects exclusively through a restricted MySQL user account `mudraflow_app`, which has zero UPDATE permissions on the account balance column. It is mathematically impossible for backend code or SQL injection to mutate balances without passing through our stored procedures."*

**Action:**
1. Show project structure: `/db/01_schema.sql`, `/db/02_programs.sql`, `/spec/er-diagram/`.
2. Point out the two users: `mudraflow_admin` (schema owner) and `mudraflow_app` (restricted runtime user).

---

### 2. Registration & Account Opening (1:00 – 2:15)

**Presenter dialogue:**
> *"Let us begin by registering a new customer. We will see how MudraFlow atomically creates the customer entity, provisions a savings account, and generates the initial opening deposit transaction."*

**Action:**
1. Navigate in browser to `http://localhost:5173/register`.
2. Step 1 (Identity):
   - Name: `Aditya Vikram`
   - Mobile: `9876543299`
   - Email: `aditya.vikram@example.com`
   - PAN: `ABCDE1234F`
   - DOB: `1995-05-15`
   - Address: `Plot 42, Sector 14, Dwarka, New Delhi`
   - Branch: `Dwarka Sec-12 (MUDF0000483)`
   - Account Type: `SAVINGS`
   - Initial Deposit: `₹10,000.00`
   - Password: `Password@123`
3. Click **Proceed to verification**.
4. Step 2 (Verification):
   - Enter demo OTP: `123456`.
   - Click **Verify and open account**.
5. Step 3 (Success):
   - Notice the green `ACCOUNT OPENED` stamp, customer ID, full account number, and IFSC.
   - Click **Go to account dashboard**.
6. Home Dashboard:
   - Point out the masked account number `•••• 0010` (click **View** to reveal, **Copy** to copy).
   - Show the hidden balance `₹ ••,••,•••` (click **Show** to reveal `₹10,000.00` with the words *"Ten thousand rupees only"*).
   - Point out the ledger: Row 1 is `OPENING_DEPOSIT` for `+₹10,000.00` with `balance_after` of `₹10,000.00`.

---

### 3. Transfer & ACID Transaction Guarantees (2:15 – 3:30)

**Presenter dialogue:**
> *"Now let's execute a funds transfer to an existing payee. Notice how the user interface enforces transfer rules live, while the database stored procedure guarantees atomic balance movement."*

**Action:**
1. Click **Transfer** in the sidebar (or bottom tab bar on mobile).
2. Select Payee: `Priya Verma (•••• 0002)`.
3. Enter Amount: `₹3,000.00`.
   - Show how amount in words dynamically updates: *"Three thousand rupees only"*.
   - Point out the live Transfer Slip preview on the right.
   - Note mode selection: IMPS and NEFT are active; RTGS is disabled with the note *"RTGS requires minimum ₹2,00,000"*.
4. Select Mode: `IMPS`.
5. Enter Remarks: `Project consultation fee`.
6. Click **Review transfer**.
7. In the confirmation modal:
   - Enter Password: `Password@123`.
   - Enter OTP: `123456`.
   - Click **Confirm and Pay ₹3,000.00**.
8. Success & Receipt:
   - Instant navigation to `/app/receipt/TXN-...` with the official ledger record and green `PAID` stamp.
   - Click **Print Receipt** (show browser print preview: clean 16mm white layout with stamp intact, chrome hidden).
   - Click **Back to history**: show the ledger with debit `-₹3,000.00` and updated balance `₹7,000.00`.

---

### 4. Concurrency Test Demo (D2) (3:30 – 4:45)

**Presenter dialogue:**
> *"One of the greatest hazards in banking databases is race conditions during concurrent transfers. If an account has ₹10,000, and two transfer requests of ₹8,000 arrive at the exact same millisecond, an improperly designed database could allow both to succeed, creating an illegal negative balance of -₹6,000.
> In MudraFlow, procedure `sp_transfer` uses ordered pessimistic locking (`SELECT ... FOR UPDATE` ordered by `account_id` ascending). This completely prevents race conditions and eliminates deadlocks. Let us demonstrate this live."*

**Action:**
1. Open terminal and run:
   ```powershell
   node db/tests/concurrency.js
   ```
2. Explain the live terminal output to the examiners:
   - Account X starts with ₹10,000.
   - Session 1 and Session 2 open simultaneously and invoke `sp_transfer` for ₹8,000 from Account X concurrently.
   - Session 2 grabs the row lock first and succeeds.
   - Session 1 waits on the lock, reads the updated balance (₹2,000), checks the `balance >= p_amount` constraint, and cleanly rolls back with error: `'Insufficient balance'`.
   - Final balance of Account X is exactly ₹2,000.00; Account Y is ₹8,000.00. The balance never went negative!

---

### 5. Fixed Deposit Booking (4:45 – 5:30)

**Presenter dialogue:**
> *"Next, let's explore fixed deposits. Rates are not hardcoded in the frontend; they are calculated deterministically by the MySQL stored function `get_fd_rate(tenure_months)`."*

**Action:**
1. In browser, navigate to `/app/fd`.
2. Click **Open a fixed deposit**.
3. Select tenure tile: `12 Months · 7.00% p.a.`.
4. Enter Principal: `₹5,000.00`.
   - Point out the live Deposit Certificate preview: Maturity date (1 year later), maturity amount `₹5,350.00`, maturity instruction: `Credit to savings account`.
5. Enter Password and click **Lock fixed deposit**.
6. Show result:
   - Savings account balance decreases atomically from ₹7,000 to ₹2,000.
   - Fixed deposit table displays the new active term deposit with tenure, rate, and maturity amount.
   - Ledger reflects `FD_CREATED` with debit `-₹5,000.00`.

---

### 6. Staff Loan Approval Workflow (5:30 – 6:30)

**Presenter dialogue:**
> *"Now we demonstrate bank staff operations. Staff members review and approve credit facilities, but crucially, staff have no ability to manually edit balances."*

**Action:**
1. Customer requests loan:
   - Navigate to `/app/services`.
   - Click **Apply for loan**.
   - Select Personal Loan: `₹25,000.00` for `12 Months`.
   - Annual Income: `₹6,00,000`, Employment: `Salaried`.
   - Purpose: `Medical emergency`.
   - Submit application. Shows status `PENDING` in Applications table.
2. Log in as Staff:
   - Open a new tab or log out and visit `http://localhost:5173/staff/login`.
   - Login ID: `1` (or `EMP001`), Password: `StaffPassword@123`.
3. Staff Overview:
   - Show the gold `STAFF` badge, dark theme, and the Approvals badge showing `1 Pending`.
   - Click **Approvals** -> Loans tab.
   - Click **Review** on the `₹25,000.00` loan request.
   - Review drawer displays customer details, income, and destination account.
   - Click **Approve**. Confirmation modal states: *"Approve loan? ₹25,000.00 will be credited to account."*
   - Click **Confirm Approval**.
4. Customer Account Credit:
   - Return to the customer session (or log back in as `10000010`).
   - Available balance is now `₹27,000.00`!
   - Ledger displays transaction: `LOAN_CREDITED` for `+₹25,000.00`.

---

### 7. Audit Log Triggers & Frozen Account Enforcement (6:30 – 7:15)

**Presenter dialogue:**
> *"Regulatory banking compliance mandates tamper-evident audit trails. MudraFlow employs trigger `trg_account_audit` to capture every state change, and trigger `trg_txn_block_frozen` to prevent transactions on frozen accounts."*

**Action:**
1. In Staff portal, navigate to `/staff/customers`.
2. Search and select customer `Aditya Vikram`.
3. In Accounts on ledger, click **Freeze**. Modal confirms: *"Freeze account? Customer will not be able to send or receive money."*
4. In Customer portal:
   - Refresh Home. Red banner appears: *"This account is frozen. Transfers are disabled."*
   - Attempt a transfer: Trigger `trg_txn_block_frozen` immediately rejects with `"Sender account is frozen"`.
5. Show the MySQL audit log:
   ```sql
   SELECT audit_id, account_id, old_status, new_status, old_balance, new_balance, changed_by, changed_at
   FROM account_audit
   ORDER BY audit_id DESC LIMIT 5;
   ```
   - Show the recorded audit row documenting who changed the account status and the exact timestamp.

---

### 8. Database Index Performance & EXPLAIN Benchmark (7:15 – 8:00)

**Presenter dialogue:**
> *"To demonstrate real-world query optimization, we benchmarked transaction search performance over a 50,000 row ledger using MySQL's EXPLAIN query plan tool."*

**Action:**
1. Open `docs/explain-output.txt` (or show the slide):
   ```sql
   SELECT * FROM txn
   WHERE from_account_id = 1
     AND created_at BETWEEN '2026-02-01' AND '2026-03-01'
   ORDER BY created_at DESC;
   ```
2. Highlight the metrics:
   - **Before Index:**
     - Access Type: `ALL` (Full Table Scan).
     - Rows examined: `50,000`.
     - Extra: `Using filesort` (expensive sort buffer pass).
   - **After Index (`idx_txn_from_created` on `(from_account_id, created_at)`):**
     - Access Type: `range` (B-Tree index seek).
     - Rows examined: `112` (a **446x reduction** in disk and buffer I/O).
     - Extra: `Backward index scan` (index order satisfies `ORDER BY DESC`, eliminating filesort completely).

---

## Conclusion & Viva Questions Readiness

**Closing statement:**
> *"In summary, MudraFlow proves that robust database architecture—leveraging stored procedures for atomic balance mutations, pessimistic locking for concurrency safety, triggers for immutable audit logging, and composite indexes for sub-millisecond retrieval—builds a secure, scalable banking system. Thank you, and we welcome your questions."*

### Key Viva Q&A Reference:
- **Q: Why don't you update balances directly in Node.js?**
  *A:* To eliminate race conditions and enforce the principle of least privilege. By restricting `mudraflow_app` from executing raw `UPDATE account SET balance`, the database itself becomes the impenetrable single source of truth.
- **Q: How does `sp_transfer` avoid deadlocks?**
  *A:* Deadlocks occur when Session A locks account 1 and waits for 2, while Session B locks 2 and waits for 1. `sp_transfer` always acquires row locks in ascending order (`LEAST(from_id, to_id)` then `GREATEST(from_id, to_id)`). Circular wait is mathematically impossible.
- **Q: How does the ledger guarantee balance integrity?**
  *A:* The ledger is append-only. The balance after every transaction is verified using SQL window function `SUM(delta) OVER (PARTITION BY account_id ORDER BY created_at ASC, txn_id ASC)`.

