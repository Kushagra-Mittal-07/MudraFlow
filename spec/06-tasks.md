# 06. Tasks (build order with gates)

Do the phases in order. A phase is finished only when its **gate** passes. Show the output of the gate tests before moving on.

## Phase 1: Schema and seed data

- [ ] Create database `mudraflow`
- [ ] Create all 10 tables with keys, CHECK constraints and indexes (`03-database.md`, sections 1, 2, 7)
- [ ] Create `get_fd_rate` and `get_loan_rate`
- [ ] Create the two MySQL users and grants (section 9)
- [ ] Save everything as `db/01_schema.sql`

**Gate:** all tables exist, `SHOW CREATE TABLE` matches the spec, the functions return the right rates for 6, 12, 24, 36 and 60 months.

## Phase 2: Procedures, triggers, view

- [ ] `sp_register_customer`
- [ ] `sp_open_account`
- [ ] `sp_transfer` (with ordered `FOR UPDATE` locking)
- [ ] `sp_create_fd`
- [ ] `sp_approve_loan`
- [ ] `sp_decide_service_request`
- [ ] `sp_process_maturities`
- [ ] `trg_account_audit` and `trg_txn_block_frozen`
- [ ] `v_applications`
- [ ] Seed script `db/02_seed.sql` (or a Node seed script for bcrypt hashes) that calls the procedures
- [ ] Save as `db/02_programs.sql` and `db/03_seed`

**Gate:** run every SQL test in `07-testing.md`, sections A to D, directly in the MySQL client. The ledger check must return zero mismatches.

## Phase 3: Backend API

- [ ] Project setup, `.env`, connection pool using `mudraflow_app`
- [ ] Auth routes with lockout and JWT
- [ ] Customer routes (`04-api.md`)
- [ ] Staff routes
- [ ] Error handling that passes procedure messages through

**Gate:** all API tests in `07-testing.md`, section E, pass (use a REST client or a simple script). Confirm the app user cannot update balances (section A).

## Phase 4: Customer UI

- [ ] Landing, register with OTP step, login
- [ ] App shell (sidebar, top bar, bottom tab bar) and the active-account switcher
- [ ] Home (account summary with masked number and hidden balance, recent 5 entries, accounts list, at a glance, open applications)
- [ ] Open another account (drawer)
- [ ] Transfer (sticky live slip, payees), Payees page and add-payee drawer, receipt
- [ ] History with filters and printable receipt
- [ ] Fixed deposit and My FDs
- [ ] Services hub (card, cheque book and loan drawers, applications table)
- [ ] Profile

**Gate:** a person can complete register, login, transfer, FD, loan and card request through the UI with no console errors.

## Phase 5: Staff UI

- [ ] Staff login and staff shell
- [ ] Overview (stat strip, needs attention, money per branch, latest transactions)
- [ ] Approvals (tables with review drawer)
- [ ] Customers (split view) with freeze and unfreeze
- [ ] Transactions
- [ ] FD maturities

**Gate:** approving a loan in the staff UI shows the new balance and a LOAN_CREDIT transaction on the customer dashboard.

## Phase 6: Demo and report material

- [ ] Concurrency demo script (two simultaneous transfers on the same account)
- [ ] `EXPLAIN` before and after index comparison with screenshots
- [ ] ER diagram exported as an image
- [ ] Short demo script listing the steps for presentation day
