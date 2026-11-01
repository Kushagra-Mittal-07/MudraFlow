-- =============================================================================
-- MudraFlow: Stored Procedures, Triggers, and Views (Phase 2, Complete)
-- File: db/02_programs.sql
--
-- Contains:
--   Triggers:
--     trg_txn_block_frozen, trg_account_audit
--   Stored Procedures:
--     sp_register_customer, sp_open_account, sp_transfer,
--     sp_create_fd, sp_approve_loan, sp_decide_service_request,
--     sp_process_maturities
--   Views:
--     v_applications
--
-- All procedures use SQL SECURITY DEFINER so they can update account.balance
-- even though mudraflow_app has no UPDATE privilege on that column.
-- =============================================================================

USE mudraflow;

-- -----------------------------------------------------------------------------
-- TRIGGERS
-- (created before procedures because the procedures insert into txn and update
-- account, so the triggers must be in place to enforce rules from the start)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_txn_block_frozen;
DROP TRIGGER IF EXISTS trg_account_audit;

DELIMITER $$

-- trg_txn_block_frozen
-- WHY: This is the database-level safety net. Even if the backend code forgets
--      to check account status, the database itself will refuse to create a
--      transaction row that touches a frozen account. Belt-and-suspenders.
CREATE TRIGGER trg_txn_block_frozen
BEFORE INSERT ON txn
FOR EACH ROW
BEGIN
  DECLARE v_status_from ENUM('ACTIVE','FROZEN');
  DECLARE v_status_to   ENUM('ACTIVE','FROZEN');

  -- Check sender account (only when it exists — NULL means bank-originated credit)
  IF NEW.from_account_id IS NOT NULL THEN
    SELECT status INTO v_status_from
    FROM account WHERE account_id = NEW.from_account_id;

    IF v_status_from = 'FROZEN' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Account is frozen';
    END IF;
  END IF;

  -- Check receiver account (only when it exists — NULL means money locked into FD)
  IF NEW.to_account_id IS NOT NULL THEN
    SELECT status INTO v_status_to
    FROM account WHERE account_id = NEW.to_account_id;

    IF v_status_to = 'FROZEN' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Account is frozen';
    END IF;
  END IF;
END$$

-- trg_account_audit
-- WHY: Every single balance change is logged automatically by the database,
--      creating an audit trail that nobody can skip. The @current_txn_id session
--      variable links each audit row to the transaction that caused it.
CREATE TRIGGER trg_account_audit
AFTER UPDATE ON account
FOR EACH ROW
BEGIN
  IF OLD.balance <> NEW.balance THEN
    INSERT INTO audit_log (account_id, txn_id, old_balance, new_balance)
    VALUES (NEW.account_id, @current_txn_id, OLD.balance, NEW.balance);
  END IF;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- STORED PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_register_customer;
DROP PROCEDURE IF EXISTS sp_open_account;
DROP PROCEDURE IF EXISTS sp_transfer;
DROP PROCEDURE IF EXISTS sp_create_fd;
DROP PROCEDURE IF EXISTS sp_approve_loan;
DROP PROCEDURE IF EXISTS sp_decide_service_request;
DROP PROCEDURE IF EXISTS sp_process_maturities;

DELIMITER $$

-- =============================================================================
-- sp_register_customer
-- =============================================================================
-- WHY this procedure exists:
--   Registration must be ACID — the customer row, account row, opening deposit
--   transaction and balance update must all succeed or all fail. If any step
--   fails, the EXIT HANDLER rolls everything back so we never get an orphan
--   customer without an account or an account without its opening deposit.
-- =============================================================================
CREATE PROCEDURE sp_register_customer(
  IN  p_name           VARCHAR(80),
  IN  p_dob            DATE,
  IN  p_email          VARCHAR(100),
  IN  p_phone          CHAR(10),
  IN  p_pan            CHAR(10),
  IN  p_address        VARCHAR(255),
  IN  p_password_hash  VARCHAR(100),
  IN  p_account_type   ENUM('SAVINGS','CURRENT'),
  IN  p_branch_id      INT,
  IN  p_opening_amount DECIMAL(15,2),
  OUT p_customer_id    BIGINT,
  OUT p_account_number CHAR(10)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_account_id INT;
  DECLARE v_txn_id     BIGINT;

  -- WHY: If any SQL error occurs (duplicate email/PAN, FK violation, etc.),
  --      roll back everything and re-signal the error to the caller.
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Step 1: Validate business rules before touching any table.
  -- WHY: The spec requires age >= 18 and opening deposit >= 1000. Checking
  --      before the transaction avoids creating rows we'd have to roll back.
  IF TIMESTAMPDIFF(YEAR, p_dob, CURDATE()) < 18 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Customer must be at least 18 years old';
  END IF;

  IF p_opening_amount < 1000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Opening deposit must be at least 1000';
  END IF;

  START TRANSACTION;

  -- Step 2: Insert the customer row.
  -- WHY: The customer must exist before we can create an account that
  --      references it via the foreign key.
  INSERT INTO customer (full_name, dob, email, phone, pan, address, password_hash)
  VALUES (p_name, p_dob, p_email, p_phone, p_pan, p_address, p_password_hash);

  SET p_customer_id = LAST_INSERT_ID();

  -- Step 3: Insert the account with balance 0 and a temporary account number.
  -- WHY: account_number depends on account_id (auto-increment), which we only
  --      know after inserting. We use a placeholder and update immediately.
  INSERT INTO account (account_number, customer_id, branch_id, account_type, balance, opened_on)
  VALUES ('0000000000', p_customer_id, p_branch_id, p_account_type, 0.00, CURDATE());

  SET v_account_id = LAST_INSERT_ID();

  -- Generate the real account number: '5' followed by 9 digits derived from account_id
  SET p_account_number = CONCAT('5', LPAD(1000000 + v_account_id, 9, '0'));
  UPDATE account SET account_number = p_account_number WHERE account_id = v_account_id;

  -- Step 4: Insert the opening deposit transaction.
  -- WHY: Every balance change must have a matching txn row so the ledger
  --      invariant holds: balance = SUM(credits) - SUM(debits).
  --      from_account_id is NULL because money enters the system from outside.
  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
  VALUES (
    'TMP',                      -- placeholder, updated below
    NULL,                       -- money comes from outside the system
    v_account_id,               -- credited to the new account
    p_opening_amount,
    'INTERNAL',                 -- system-generated movement
    'OPENING_DEPOSIT',
    'Opening deposit at registration'
  );

  SET v_txn_id = LAST_INSERT_ID();

  -- Generate the real reference number: MF + YYYYMMDD + 6-digit txn_id
  UPDATE txn
  SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  -- Step 5: Set @current_txn_id so the audit trigger can link this balance
  --         change to the transaction that caused it.
  SET @current_txn_id = v_txn_id;

  -- Credit the account with the opening deposit
  UPDATE account SET balance = p_opening_amount WHERE account_id = v_account_id;

  -- Clear the session variable to prevent stale values on pooled connections
  SET @current_txn_id = NULL;

  -- Step 6: Everything worked — make it permanent.
  COMMIT;
END$$

-- =============================================================================
-- sp_open_account
-- =============================================================================
-- WHY this procedure exists:
--   Opening a second (or third) account moves money from an existing account
--   to a new one. This is a transfer of funds that must be atomic: the debit
--   from the funding account and the credit to the new account happen together
--   or not at all.
-- =============================================================================
CREATE PROCEDURE sp_open_account(
  IN  p_customer_id     BIGINT,
  IN  p_account_type    ENUM('SAVINGS','CURRENT'),
  IN  p_branch_id       INT,
  IN  p_from_account_id INT,
  IN  p_amount          DECIMAL(15,2),
  OUT p_new_account_id  INT,
  OUT p_account_number  CHAR(10)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_owner       BIGINT;
  DECLARE v_status      ENUM('ACTIVE','FROZEN');
  DECLARE v_balance     DECIMAL(15,2);
  DECLARE v_txn_id      BIGINT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Validate minimum opening amount
  IF p_amount < 1000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Opening deposit must be at least 1000';
  END IF;

  START TRANSACTION;

  -- Lock the funding account row to prevent concurrent modifications.
  -- WHY: SELECT ... FOR UPDATE acquires a row-level lock so no other
  --      transaction can change this account's balance until we commit.
  SELECT customer_id, status, balance
  INTO v_owner, v_status, v_balance
  FROM account
  WHERE account_id = p_from_account_id
  FOR UPDATE;

  -- WHY: Only the account owner can fund a new account with their money.
  IF v_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;

  -- WHY: A frozen account cannot send money (the trigger would also block it,
  --      but checking here gives a clearer error message).
  IF v_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Funding account is not active';
  END IF;

  -- WHY: Cannot spend more money than you have.
  IF v_balance < p_amount THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  -- Create the new account with zero balance (money arrives via the txn below)
  INSERT INTO account (account_number, customer_id, branch_id, account_type, balance, opened_on)
  VALUES ('0000000000', p_customer_id, p_branch_id, p_account_type, 0.00, CURDATE());

  SET p_new_account_id = LAST_INSERT_ID();
  SET p_account_number = CONCAT('5', LPAD(1000000 + p_new_account_id, 9, '0'));
  UPDATE account SET account_number = p_account_number WHERE account_id = p_new_account_id;

  -- Record the internal transfer from the funding account to the new account
  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
  VALUES (
    'TMP',
    p_from_account_id,
    p_new_account_id,
    p_amount,
    'INTERNAL',
    'TRANSFER',
    'Funding new account'
  );

  SET v_txn_id = LAST_INSERT_ID();
  UPDATE txn
  SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  -- Debit the funding account and credit the new account
  SET @current_txn_id = v_txn_id;

  UPDATE account SET balance = balance - p_amount WHERE account_id = p_from_account_id;
  UPDATE account SET balance = balance + p_amount WHERE account_id = p_new_account_id;

  SET @current_txn_id = NULL;

  COMMIT;
END$$

-- =============================================================================
-- sp_transfer
-- =============================================================================
-- WHY this procedure exists:
--   This is the core of the banking system. Moving money between two accounts
--   must be atomic (all-or-nothing), isolated (no other transfer can interfere),
--   and consistent (balances never go negative, frozen accounts are blocked).
--
-- KEY DESIGN: Both rows are locked in ascending account_id order to prevent
-- deadlocks. If user A sends to B while B sends to A simultaneously, both
-- transactions lock the lower account_id first, so one waits for the other
-- instead of each holding a lock the other needs.
-- =============================================================================
CREATE PROCEDURE sp_transfer(
  IN  p_customer_id       BIGINT,
  IN  p_from_account_id   INT,
  IN  p_to_account_number CHAR(10),
  IN  p_to_ifsc           CHAR(11),
  IN  p_receiver_name     VARCHAR(80),
  IN  p_amount            DECIMAL(15,2),
  IN  p_mode              ENUM('IMPS','NEFT','RTGS'),
  IN  p_remarks           VARCHAR(100),
  OUT p_reference_no      VARCHAR(20)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_to_account_id INT;
  DECLARE v_lower_id      INT;
  DECLARE v_upper_id      INT;
  DECLARE v_from_owner    BIGINT;
  DECLARE v_from_status   ENUM('ACTIVE','FROZEN');
  DECLARE v_from_balance  DECIMAL(15,2);
  DECLARE v_to_status     ENUM('ACTIVE','FROZEN');
  DECLARE v_txn_id        BIGINT;
  DECLARE v_dummy_balance DECIMAL(15,2);
  DECLARE v_dummy_status  ENUM('ACTIVE','FROZEN');

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Step 1: Validate transfer mode rules BEFORE starting the transaction.
  -- WHY: These are pure business-rule checks that don't need locks. Failing
  --      fast avoids holding locks for invalid requests.
  IF p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Amount must be greater than zero';
  END IF;

  IF p_mode = 'IMPS' AND p_amount > 500000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'IMPS allows up to 5,00,000';
  END IF;

  IF p_mode = 'RTGS' AND p_amount < 200000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RTGS needs at least 2,00,000';
  END IF;

  -- Step 2: Find the receiver account by joining account and branch.
  -- WHY: Both account_number AND IFSC must match the same account. This
  --      ensures the money goes to the right branch's account.
  SELECT a.account_id INTO v_to_account_id
  FROM account a
  JOIN branch b ON a.branch_id = b.branch_id
  WHERE a.account_number = p_to_account_number
    AND b.ifsc = p_to_ifsc
  LIMIT 1;

  IF v_to_account_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Receiver account or IFSC not found';
  END IF;

  -- Step 3: Reject self-transfer.
  -- WHY: Transferring to yourself is meaningless and could mask bugs.
  IF p_from_account_id = v_to_account_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot transfer to the same account';
  END IF;

  -- Step 4: Begin the transaction.
  START TRANSACTION;

  -- Step 5: Lock BOTH account rows in ascending account_id order.
  -- WHY: Always locking the lower ID first prevents deadlocks. If we locked
  --      in random order, two opposite transfers could each hold one lock
  --      and wait for the other forever.
  IF p_from_account_id < v_to_account_id THEN
    SET v_lower_id = p_from_account_id;
    SET v_upper_id = v_to_account_id;
  ELSE
    SET v_lower_id = v_to_account_id;
    SET v_upper_id = p_from_account_id;
  END IF;

  -- Lock the lower-ID row first
  SELECT balance, status INTO v_dummy_balance, v_dummy_status
  FROM account WHERE account_id = v_lower_id FOR UPDATE;

  -- Lock the upper-ID row second
  SELECT balance, status INTO v_dummy_balance, v_dummy_status
  FROM account WHERE account_id = v_upper_id FOR UPDATE;

  -- Step 6: Now read the actual sender data (we have the lock, so it's safe).
  -- WHY: We need the sender's owner, status and balance. Reading after locking
  --      guarantees nobody can change these values until we commit.
  SELECT customer_id, status, balance
  INTO v_from_owner, v_from_status, v_from_balance
  FROM account WHERE account_id = p_from_account_id;

  -- WHY: Only the account owner can send money from their account.
  IF v_from_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;

  -- WHY: Frozen accounts cannot send money.
  IF v_from_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Sender account is frozen';
  END IF;

  -- Read receiver status
  SELECT status INTO v_to_status
  FROM account WHERE account_id = v_to_account_id;

  -- WHY: Frozen accounts cannot receive money either.
  IF v_to_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Receiver account is frozen';
  END IF;

  -- WHY: Cannot spend more than you have. The CHECK constraint would also
  --      catch this, but a clear error message is better for the user.
  IF v_from_balance < p_amount THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  -- Step 7: Insert the transaction record.
  INSERT INTO txn (reference_no, from_account_id, to_account_id, receiver_name,
                   amount, mode, txn_type, remarks)
  VALUES (
    'TMP',
    p_from_account_id,
    v_to_account_id,
    p_receiver_name,
    p_amount,
    p_mode,
    'TRANSFER',
    p_remarks
  );

  SET v_txn_id = LAST_INSERT_ID();

  UPDATE txn
  SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  -- Set @current_txn_id so the audit trigger links audit rows to this txn
  SET @current_txn_id = v_txn_id;

  -- Step 8: Debit the sender and credit the receiver.
  -- WHY: Both updates must happen inside the same transaction. If either fails,
  --      the EXIT HANDLER rolls back both, keeping the ledger consistent.
  UPDATE account SET balance = balance - p_amount WHERE account_id = p_from_account_id;
  UPDATE account SET balance = balance + p_amount WHERE account_id = v_to_account_id;

  SET @current_txn_id = NULL;

  -- Build the reference number to return to the caller
  SET p_reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'));

  -- Step 9: Commit — all changes are now permanent.
  COMMIT;
END$$

-- =============================================================================
-- sp_create_fd
-- =============================================================================
-- WHY this procedure exists:
--   Creating a Fixed Deposit moves money OUT of a customer's savings/current
--   account and locks it for a set tenure. This must be atomic: the debit from
--   the account, the FD_CREATE txn record, and the new fixed_deposit row all
--   succeed together or all fail. The balance CHECK constraint and the audit
--   trigger both rely on this happening inside one transaction.
--
-- Maturity formula (simple interest):
--   maturity_amount = amount * (1 + rate/100 * tenure_months/12)
-- =============================================================================
CREATE PROCEDURE sp_create_fd(
  IN  p_customer_id   BIGINT,
  IN  p_account_id    INT,
  IN  p_amount        DECIMAL(15,2),
  IN  p_tenure_months INT,
  IN  p_instruction   ENUM('CREDIT','RENEW'),
  OUT p_fd_id         INT
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_owner       BIGINT;
  DECLARE v_status      ENUM('ACTIVE','FROZEN');
  DECLARE v_balance     DECIMAL(15,2);
  DECLARE v_rate        DECIMAL(4,2);
  DECLARE v_maturity    DECIMAL(15,2);
  DECLARE v_mat_date    DATE;
  DECLARE v_txn_id      BIGINT;

  -- WHY: If any SQL error occurs, undo everything and re-signal to the caller.
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Step 1: Validate business rules BEFORE touching any table.
  -- WHY: Only the five allowed tenures are valid per spec. Rejecting early
  --      avoids wasting a transaction on invalid requests.
  IF p_tenure_months NOT IN (6, 12, 24, 36, 60) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tenure must be 6, 12, 24, 36 or 60 months';
  END IF;

  -- WHY: Minimum FD amount per spec is ₹1000.
  IF p_amount < 1000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'FD amount must be at least 1000';
  END IF;

  START TRANSACTION;

  -- Step 2: Lock the source account row to prevent concurrent balance changes.
  -- WHY: SELECT ... FOR UPDATE acquires a row-level exclusive lock so no other
  --      transaction can modify this account's balance until we commit.
  SELECT customer_id, status, balance
  INTO v_owner, v_status, v_balance
  FROM account
  WHERE account_id = p_account_id
  FOR UPDATE;

  -- Step 3: Verify the account belongs to the customer calling the procedure.
  -- WHY: A customer must not be able to create an FD from someone else's account.
  IF v_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;

  -- WHY: Frozen accounts cannot send money out (additional check to the trigger).
  IF v_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Account is not active';
  END IF;

  -- WHY: Cannot create an FD for more money than is available.
  IF v_balance < p_amount THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  -- Step 4: Calculate interest rate and maturity amount.
  -- WHY: The rate is determined by the function get_fd_rate and frozen into the
  --      FD row. Even if the rate table changes later, this FD keeps its rate.
  SET v_rate = get_fd_rate(p_tenure_months);
  SET v_maturity = ROUND(p_amount * (1 + v_rate / 100 * p_tenure_months / 12), 2);
  SET v_mat_date = DATE_ADD(CURDATE(), INTERVAL p_tenure_months MONTH);

  -- Step 5: Insert the FD_CREATE transaction record.
  -- WHY: Every balance change must have a matching txn row so the ledger
  --      invariant holds. from_account_id is the source, to_account_id is NULL
  --      because money is being locked into the FD, not going to another account.
  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount,
                   mode, txn_type, remarks)
  VALUES (
    'TMP',
    p_account_id,   -- money leaves this account
    NULL,            -- money goes into the FD (not another account)
    p_amount,
    'INTERNAL',      -- system movement
    'FD_CREATE',
    CONCAT('FD created for ', p_tenure_months, ' months')
  );

  SET v_txn_id = LAST_INSERT_ID();

  -- Generate the real reference number: MF + YYYYMMDD + 6-digit txn_id
  UPDATE txn
  SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  -- Step 6: Debit the account balance.
  -- WHY: Set @current_txn_id so the audit trigger knows which txn caused the
  --      balance change. Clear it after to prevent stale links.
  SET @current_txn_id = v_txn_id;
  UPDATE account SET balance = balance - p_amount WHERE account_id = p_account_id;
  SET @current_txn_id = NULL;

  -- Step 7: Insert the fixed_deposit row.
  -- WHY: This row tracks the FD's terms, maturity date, and current status.
  INSERT INTO fixed_deposit (customer_id, account_id, amount, rate, tenure_months,
                             start_date, maturity_date, maturity_amount,
                             maturity_instruction, status)
  VALUES (
    p_customer_id,
    p_account_id,
    p_amount,
    v_rate,
    p_tenure_months,
    CURDATE(),
    v_mat_date,
    v_maturity,
    p_instruction,
    'ACTIVE'
  );

  SET p_fd_id = LAST_INSERT_ID();

  -- Step 8: Everything succeeded — make it permanent.
  COMMIT;
END$$

-- =============================================================================
-- sp_approve_loan
-- =============================================================================
-- WHY this procedure exists:
--   When a staff member approves or rejects a pending loan, the decision must
--   be atomic. For APPROVED loans, the credited amount and LOAN_CREDIT txn must
--   all happen together. For REJECTED loans, only the status update is needed.
--   Locking the loan row first prevents two staff members from deciding the
--   same loan simultaneously.
-- =============================================================================
CREATE PROCEDURE sp_approve_loan(
  IN p_loan_id   INT,
  IN p_emp_id    VARCHAR(10),
  IN p_decision  VARCHAR(10)    -- 'APPROVED' or 'REJECTED'
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_loan_status  VARCHAR(10);
  DECLARE v_account_id   INT;
  DECLARE v_amount       DECIMAL(15,2);
  DECLARE v_acct_status  ENUM('ACTIVE','FROZEN');
  DECLARE v_txn_id       BIGINT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Step 1: Validate the decision value.
  -- WHY: Only APPROVED or REJECTED are meaningful. Anything else is a bug.
  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Decision must be APPROVED or REJECTED';
  END IF;

  START TRANSACTION;

  -- Step 2: Lock the loan row and read its current state.
  -- WHY: SELECT ... FOR UPDATE prevents another staff member from deciding this
  --      loan at the same time. We read the current status to verify it's PENDING.
  SELECT status, account_id, amount
  INTO v_loan_status, v_account_id, v_amount
  FROM loan
  WHERE loan_id = p_loan_id
  FOR UPDATE;

  -- WHY: If the loan doesn't exist, the SELECT returns nothing and v_loan_status
  --      stays NULL.
  IF v_loan_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Loan not found';
  END IF;

  -- WHY: Only PENDING loans can be decided. Deciding again would double-credit.
  IF v_loan_status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Loan is not pending';
  END IF;

  -- Step 3: Handle REJECTED decision — just update status and stop.
  -- WHY: A rejected loan doesn't move money, so no txn row or balance change.
  IF p_decision = 'REJECTED' THEN
    UPDATE loan
    SET status     = 'REJECTED',
        decided_by = p_emp_id,
        decided_on = NOW()
    WHERE loan_id = p_loan_id;

    COMMIT;
  ELSE
    -- Step 4: APPROVED — lock the account row and verify it's ACTIVE.
    -- WHY: We need to credit money into this account, so it must be ACTIVE.
    SELECT status INTO v_acct_status
    FROM account
    WHERE account_id = v_account_id
    FOR UPDATE;

    IF v_acct_status <> 'ACTIVE' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Account is not active';
    END IF;

    -- Step 5: Insert the LOAN_CREDIT transaction.
    -- WHY: from_account_id is NULL because the bank is lending money (money
    --      enters the system from outside). to_account_id is the borrower's account.
    INSERT INTO txn (reference_no, from_account_id, to_account_id, amount,
                     mode, txn_type, remarks)
    VALUES (
      'TMP',
      NULL,              -- money comes from the bank
      v_account_id,      -- credited to borrower's account
      v_amount,
      'INTERNAL',
      'LOAN_CREDIT',
      CONCAT('Loan #', p_loan_id, ' approved')
    );

    SET v_txn_id = LAST_INSERT_ID();

    UPDATE txn
    SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
    WHERE txn_id = v_txn_id;

    -- Step 6: Credit the borrower's account.
    SET @current_txn_id = v_txn_id;
    UPDATE account SET balance = balance + v_amount WHERE account_id = v_account_id;
    SET @current_txn_id = NULL;

    -- Step 7: Update the loan row with the decision.
    UPDATE loan
    SET status     = 'APPROVED',
        decided_by = p_emp_id,
        decided_on = NOW()
    WHERE loan_id = p_loan_id;

    COMMIT;
  END IF;
END$$

-- =============================================================================
-- sp_decide_service_request
-- =============================================================================
-- WHY this procedure exists:
--   When a staff member approves or rejects a debit card or cheque book request,
--   the procedure generates a demo card number (for approved debit cards) and
--   records who decided and when. The card number format depends on the card
--   network: 4 = Visa, 5 = Mastercard, 6 = RuPay, followed by 15 random digits.
-- =============================================================================
CREATE PROCEDURE sp_decide_service_request(
  IN p_request_id INT,
  IN p_emp_id     VARCHAR(10),
  IN p_decision   VARCHAR(10)    -- 'APPROVED' or 'REJECTED'
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_status        VARCHAR(10);
  DECLARE v_request_type  VARCHAR(20);
  DECLARE v_network       VARCHAR(20);
  DECLARE v_card_number   CHAR(16);
  DECLARE v_card_expiry   DATE;
  DECLARE v_prefix        CHAR(1);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Step 1: Validate the decision value.
  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Decision must be APPROVED or REJECTED';
  END IF;

  START TRANSACTION;

  -- Step 2: Lock the service_request row and read its current state.
  -- WHY: Prevents two staff members from deciding the same request at once.
  SELECT status, request_type, network
  INTO v_status, v_request_type, v_network
  FROM service_request
  WHERE request_id = p_request_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Service request not found';
  END IF;

  -- WHY: Only REQUESTED items can be decided. Re-deciding is not allowed.
  IF v_status <> 'REQUESTED' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Service request is not in REQUESTED status';
  END IF;

  -- Step 3: For an APPROVED debit card, generate a 16-digit demo card number.
  -- WHY: The first digit indicates the card network per spec:
  --   4 = Visa, 5 = Mastercard, 6 = RuPay.
  IF p_decision = 'APPROVED' AND v_request_type = 'DEBIT_CARD' THEN
    -- Determine the starting digit from the card network
    IF v_network = 'VISA' THEN
      SET v_prefix = '4';
    ELSEIF v_network = 'MASTERCARD' THEN
      SET v_prefix = '5';
    ELSE
      SET v_prefix = '6';   -- RUPAY
    END IF;

    -- Generate a 16-digit card number: 1 prefix + 8 digits + 7 digits = 16 digits
    SET v_card_number = CONCAT(
      v_prefix,
      LPAD(FLOOR(RAND() * 100000000), 8, '0'),
      LPAD(FLOOR(RAND() * 10000000), 7, '0')
    );

    -- Card expires 5 years from today
    SET v_card_expiry = DATE_ADD(CURDATE(), INTERVAL 5 YEAR);

    UPDATE service_request
    SET status      = 'APPROVED',
        card_number = v_card_number,
        card_expiry = v_card_expiry,
        decided_by  = p_emp_id,
        decided_on  = NOW()
    WHERE request_id = p_request_id;

  ELSE
    -- For REJECTED requests or approved CHEQUE_BOOK, no card is generated.
    UPDATE service_request
    SET status     = p_decision,
        decided_by = p_emp_id,
        decided_on = NOW()
    WHERE request_id = p_request_id;
  END IF;

  COMMIT;
END$$

-- =============================================================================
-- sp_process_maturities
-- =============================================================================
-- WHY this procedure exists:
--   FDs that have reached their maturity date need to be processed. This is a
--   batch job (typically run by a staff member or a scheduled task).
--
--   CREDIT instruction: The maturity_amount is credited back to the customer's
--   linked account, a FD_MATURITY txn is created, and the FD is marked MATURED.
--   If the account is FROZEN, that FD is skipped (money stays locked).
--
--   RENEW instruction: The old FD is marked MATURED and a NEW FD is created
--   with the maturity_amount as the new principal, the same tenure, the current
--   rate from get_fd_rate(), and instruction RENEW. No money moves, so no txn.
-- =============================================================================
CREATE PROCEDURE sp_process_maturities(
  IN  p_emp_id          VARCHAR(10),
  OUT p_processed_count INT
)
SQL SECURITY DEFINER
BEGIN
  -- Cursor variables for each FD row
  DECLARE v_fd_id             INT;
  DECLARE v_customer_id       BIGINT;
  DECLARE v_account_id        INT;
  DECLARE v_amount            DECIMAL(15,2);
  DECLARE v_maturity_amount   DECIMAL(15,2);
  DECLARE v_tenure            INT;
  DECLARE v_instruction       VARCHAR(10);
  DECLARE v_acct_status       ENUM('ACTIVE','FROZEN');
  DECLARE v_txn_id            BIGINT;
  DECLARE v_new_rate          DECIMAL(4,2);
  DECLARE v_new_maturity      DECIMAL(15,2);
  DECLARE v_done              INT DEFAULT 0;

  -- WHY: The cursor selects all ACTIVE FDs whose maturity date has passed.
  DECLARE cur_mature CURSOR FOR
    SELECT fd_id, customer_id, account_id, amount, maturity_amount,
           tenure_months, maturity_instruction
    FROM fixed_deposit
    WHERE status = 'ACTIVE'
      AND maturity_date <= CURDATE();

  -- WHY: When the cursor has no more rows, set the done flag to exit the loop.
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_processed_count = 0;

  START TRANSACTION;

  OPEN cur_mature;

  -- WHY: We loop through each matured FD one at a time.
  read_loop: LOOP
    FETCH cur_mature INTO v_fd_id, v_customer_id, v_account_id, v_amount,
                          v_maturity_amount, v_tenure, v_instruction;

    IF v_done THEN
      LEAVE read_loop;
    END IF;

    -- Lock the linked account to check its status for both CREDIT and RENEW
    SELECT status INTO v_acct_status
    FROM account
    WHERE account_id = v_account_id
    FOR UPDATE;

    -- WHY: If the account is FROZEN, skip this FD — frozen accounts
    --      cannot receive money or renew until unfrozen.
    IF v_acct_status = 'FROZEN' THEN
      ITERATE read_loop;
    END IF;

    IF v_instruction = 'CREDIT' THEN
      -- Step A: Insert a FD_MATURITY txn to record the money flowing back.
      -- WHY: from_account_id is NULL because the bank is releasing money
      --      from the FD (entering the customer's account from outside).
      INSERT INTO txn (reference_no, from_account_id, to_account_id, amount,
                       mode, txn_type, remarks)
      VALUES (
        'TMP',
        NULL,              -- money returns from the FD
        v_account_id,      -- credited to the linked account
        v_maturity_amount,
        'INTERNAL',
        'FD_MATURITY',
        CONCAT('FD #', v_fd_id, ' matured (CREDIT)')
      );

      SET v_txn_id = LAST_INSERT_ID();

      UPDATE txn
      SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
      WHERE txn_id = v_txn_id;

      -- Step B: Credit the maturity amount back to the account.
      SET @current_txn_id = v_txn_id;
      UPDATE account
      SET balance = balance + v_maturity_amount
      WHERE account_id = v_account_id;
      SET @current_txn_id = NULL;

      -- Step C: Mark the old FD as MATURED.
      UPDATE fixed_deposit SET status = 'MATURED' WHERE fd_id = v_fd_id;

    ELSEIF v_instruction = 'RENEW' THEN
      -- Step A: Mark the old FD as MATURED.
      UPDATE fixed_deposit SET status = 'MATURED' WHERE fd_id = v_fd_id;

      -- Step B: Create a new ACTIVE FD with the maturity amount as principal.
      -- WHY: The new FD uses the CURRENT rate from get_fd_rate(), same tenure,
      --      and keeps the RENEW instruction so it auto-renews again next time.
      --      No money moves (it stays locked), so no txn row is inserted.
      SET v_new_rate = get_fd_rate(v_tenure);
      SET v_new_maturity = ROUND(v_maturity_amount * (1 + v_new_rate / 100 * v_tenure / 12), 2);

      INSERT INTO fixed_deposit (customer_id, account_id, amount, rate, tenure_months,
                                 start_date, maturity_date, maturity_amount,
                                 maturity_instruction, status)
      VALUES (
        v_customer_id,
        v_account_id,
        v_maturity_amount,       -- new principal = old maturity amount
        v_new_rate,
        v_tenure,
        CURDATE(),
        DATE_ADD(CURDATE(), INTERVAL v_tenure MONTH),
        v_new_maturity,
        'RENEW',
        'ACTIVE'
      );
    END IF;

    SET p_processed_count = p_processed_count + 1;
  END LOOP;

  CLOSE cur_mature;

  COMMIT;
END$$

DELIMITER ;

-- =============================================================================
-- v_applications
-- =============================================================================
-- WHY this view exists:
--   The staff dashboard needs a single list showing both loan applications and
--   service requests together. A UNION ALL view gives them identical column
--   names and types so the UI can render one unified table. Ordering by date
--   is done in the query that reads the view, not in the view itself.
-- =============================================================================
CREATE OR REPLACE VIEW v_applications AS
SELECT
  'LOAN'            AS application_type,
  loan_id           AS application_id,
  customer_id,
  account_id,
  CONCAT('Loan of ₹', amount, ' for ', purpose) AS details,
  status,
  applied_on        AS applied_on
FROM loan

UNION ALL

SELECT
  request_type      AS application_type,
  request_id        AS application_id,
  customer_id,
  account_id,
  CONCAT(request_type, ' request') AS details,
  status,
  requested_on      AS applied_on
FROM service_request;
