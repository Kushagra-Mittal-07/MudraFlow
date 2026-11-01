-- =============================================================================
-- MudraFlow: Stored Procedures and Triggers (Phase 2, Part A)
-- File: db/02_programs.sql
--
-- Contains:
--   sp_register_customer, sp_open_account, sp_transfer
--   trg_account_audit, trg_txn_block_frozen
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
  IN  p_customer_id    BIGINT,
  IN  p_account_type   ENUM('SAVINGS','CURRENT'),
  IN  p_branch_id      INT,
  IN  p_from_account_id INT,
  IN  p_amount         DECIMAL(15,2),
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
  IN  p_customer_id      BIGINT,
  IN  p_from_account_id  INT,
  IN  p_to_account_number CHAR(10),
  IN  p_to_ifsc          CHAR(11),
  IN  p_receiver_name    VARCHAR(80),
  IN  p_amount           DECIMAL(15,2),
  IN  p_mode             ENUM('IMPS','NEFT','RTGS'),
  IN  p_remarks          VARCHAR(100),
  OUT p_reference_no     VARCHAR(20)
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

DELIMITER ;

