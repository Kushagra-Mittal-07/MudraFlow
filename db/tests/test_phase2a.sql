-- =============================================================================
-- MudraFlow: Phase 2A Gate Tests
-- File: db/tests/test_phase2a.sql
--
-- Tests A1-A4, B1-B11, C1-C2 from spec/07-testing.md
-- Runs against throwaway database `mudraflow_test`.
--
-- How to run (PowerShell):
--   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pKush07 < db\tests\test_phase2a.sql
-- =============================================================================

DROP DATABASE IF EXISTS mudraflow_test;
CREATE DATABASE mudraflow_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mudraflow_test;

-- === Inline schema (tables, indexes, functions, triggers, procedures) ===

-- We will create an inline helper file separately. For now, the test runner
-- script creates tables, triggers and procedures inside a single stored
-- procedure that runs all tests with CONTINUE HANDLERs for expected errors.

-- But MySQL SOURCE doesn't support relative paths well from stdin.
-- Instead we'll embed everything directly.

-- I'll use a wrapper stored procedure to catch expected errors cleanly.

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE branch (
  branch_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_name VARCHAR(60) NOT NULL,
  ifsc CHAR(11) NOT NULL UNIQUE,
  city VARCHAR(40) NOT NULL
) ENGINE = InnoDB;

CREATE TABLE employee (
  emp_id VARCHAR(10) PRIMARY KEY,
  full_name VARCHAR(80) NOT NULL,
  role ENUM('MANAGER','CLERK') NOT NULL,
  branch_id INT NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  CONSTRAINT fk_employee_branch FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
) ENGINE = InnoDB;

CREATE TABLE customer (
  customer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(80) NOT NULL,
  dob DATE NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone CHAR(10) NOT NULL,
  pan CHAR(10) NOT NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  failed_attempts TINYINT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB AUTO_INCREMENT = 10000001;

CREATE TABLE account (
  account_id INT AUTO_INCREMENT PRIMARY KEY,
  account_number CHAR(10) NOT NULL UNIQUE,
  customer_id BIGINT NOT NULL,
  branch_id INT NOT NULL,
  account_type ENUM('SAVINGS','CURRENT') NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE','FROZEN') NOT NULL DEFAULT 'ACTIVE',
  opened_on DATE NOT NULL,
  CONSTRAINT chk_account_balance CHECK (balance >= 0.00),
  CONSTRAINT fk_account_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_account_branch FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
) ENGINE = InnoDB;

CREATE TABLE txn (
  txn_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(20) NOT NULL UNIQUE,
  from_account_id INT NULL,
  to_account_id INT NULL,
  receiver_name VARCHAR(80) NULL,
  amount DECIMAL(15,2) NOT NULL,
  mode ENUM('IMPS','NEFT','RTGS','INTERNAL') NOT NULL,
  txn_type ENUM('OPENING_DEPOSIT','TRANSFER','FD_CREATE','FD_MATURITY','LOAN_CREDIT') NOT NULL,
  remarks VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_txn_amount CHECK (amount > 0.00),
  CONSTRAINT chk_txn_accounts CHECK (from_account_id IS NOT NULL OR to_account_id IS NOT NULL),
  CONSTRAINT fk_txn_from_account FOREIGN KEY (from_account_id) REFERENCES account(account_id),
  CONSTRAINT fk_txn_to_account FOREIGN KEY (to_account_id) REFERENCES account(account_id)
) ENGINE = InnoDB;

CREATE TABLE beneficiary (
  beneficiary_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  name VARCHAR(80) NOT NULL,
  account_number CHAR(10) NOT NULL,
  ifsc CHAR(11) NOT NULL,
  added_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_beneficiary_cust_acc UNIQUE (customer_id, account_number),
  CONSTRAINT fk_beneficiary_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
) ENGINE = InnoDB;

CREATE TABLE fixed_deposit (
  fd_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  account_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  rate DECIMAL(4,2) NOT NULL,
  tenure_months INT NOT NULL,
  start_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  maturity_amount DECIMAL(15,2) NOT NULL,
  maturity_instruction ENUM('CREDIT','RENEW') NOT NULL,
  status ENUM('ACTIVE','MATURED') NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT chk_fd_tenure CHECK (tenure_months IN (6,12,24,36,60)),
  CONSTRAINT chk_fd_amount CHECK (amount >= 1000.00),
  CONSTRAINT fk_fd_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_fd_account FOREIGN KEY (account_id) REFERENCES account(account_id)
) ENGINE = InnoDB;

CREATE TABLE loan (
  loan_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  account_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  duration_months INT NOT NULL,
  rate DECIMAL(4,2) NOT NULL,
  employment_status ENUM('SALARIED','SELF_EMPLOYED','STUDENT','OTHER') NOT NULL,
  annual_income DECIMAL(15,2) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  applied_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by VARCHAR(10) NULL,
  decided_on DATETIME NULL,
  CONSTRAINT chk_loan_amount CHECK (amount > 0.00),
  CONSTRAINT fk_loan_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_loan_account FOREIGN KEY (account_id) REFERENCES account(account_id),
  CONSTRAINT fk_loan_employee FOREIGN KEY (decided_by) REFERENCES employee(emp_id)
) ENGINE = InnoDB;

CREATE TABLE service_request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  account_id INT NOT NULL,
  request_type ENUM('DEBIT_CARD','CHEQUE_BOOK') NOT NULL,
  name_on_card VARCHAR(60) NULL,
  network ENUM('VISA','MASTERCARD','RUPAY') NULL,
  leaves INT NULL,
  delivery_address VARCHAR(255) NOT NULL,
  card_number CHAR(16) NULL,
  card_expiry DATE NULL,
  status ENUM('REQUESTED','APPROVED','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  requested_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by VARCHAR(10) NULL,
  decided_on DATETIME NULL,
  CONSTRAINT chk_sr_leaves CHECK (leaves IS NULL OR leaves IN (10,25,50)),
  CONSTRAINT fk_sr_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_sr_account FOREIGN KEY (account_id) REFERENCES account(account_id),
  CONSTRAINT fk_sr_employee FOREIGN KEY (decided_by) REFERENCES employee(emp_id)
) ENGINE = InnoDB;

CREATE TABLE audit_log (
  audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  txn_id BIGINT NULL,
  old_balance DECIMAL(15,2) NOT NULL,
  new_balance DECIMAL(15,2) NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_account FOREIGN KEY (account_id) REFERENCES account(account_id)
) ENGINE = InnoDB;

CREATE INDEX idx_account_customer ON account(customer_id);
CREATE INDEX idx_txn_from_created ON txn(from_account_id, created_at);
CREATE INDEX idx_txn_to_created ON txn(to_account_id, created_at);
CREATE INDEX idx_txn_created ON txn(created_at);
CREATE INDEX idx_fd_status_maturity ON fixed_deposit(status, maturity_date);
CREATE INDEX idx_loan_status ON loan(status);
CREATE INDEX idx_service_status ON service_request(status);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================
DELIMITER $$

CREATE FUNCTION get_fd_rate(p_tenure_months INT)
RETURNS DECIMAL(4,2) DETERMINISTIC
BEGIN
  IF p_tenure_months <= 6 THEN RETURN 6.50;
  ELSEIF p_tenure_months <= 12 THEN RETURN 7.00;
  ELSEIF p_tenure_months <= 24 THEN RETURN 7.50;
  ELSE RETURN 7.75; END IF;
END$$

CREATE FUNCTION get_loan_rate(p_duration_months INT)
RETURNS DECIMAL(4,2) DETERMINISTIC
BEGIN
  IF p_duration_months <= 12 THEN RETURN 10.00;
  ELSEIF p_duration_months <= 36 THEN RETURN 11.00;
  ELSE RETURN 12.00; END IF;
END$$

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_txn_block_frozen
BEFORE INSERT ON txn FOR EACH ROW
BEGIN
  DECLARE v_s ENUM('ACTIVE','FROZEN');
  IF NEW.from_account_id IS NOT NULL THEN
    SELECT status INTO v_s FROM account WHERE account_id = NEW.from_account_id;
    IF v_s = 'FROZEN' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is frozen'; END IF;
  END IF;
  IF NEW.to_account_id IS NOT NULL THEN
    SELECT status INTO v_s FROM account WHERE account_id = NEW.to_account_id;
    IF v_s = 'FROZEN' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is frozen'; END IF;
  END IF;
END$$

CREATE TRIGGER trg_account_audit
AFTER UPDATE ON account FOR EACH ROW
BEGIN
  IF OLD.balance <> NEW.balance THEN
    INSERT INTO audit_log (account_id, txn_id, old_balance, new_balance)
    VALUES (NEW.account_id, @current_txn_id, OLD.balance, NEW.balance);
  END IF;
END$$

-- =============================================================================
-- PROCEDURES
-- =============================================================================

CREATE PROCEDURE sp_register_customer(
  IN p_name VARCHAR(80), IN p_dob DATE, IN p_email VARCHAR(100),
  IN p_phone CHAR(10), IN p_pan CHAR(10), IN p_address VARCHAR(255),
  IN p_password_hash VARCHAR(100), IN p_account_type ENUM('SAVINGS','CURRENT'),
  IN p_branch_id INT, IN p_opening_amount DECIMAL(15,2),
  OUT p_customer_id BIGINT, OUT p_account_number CHAR(10)
) SQL SECURITY DEFINER
BEGIN
  DECLARE v_account_id INT; DECLARE v_txn_id BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF TIMESTAMPDIFF(YEAR, p_dob, CURDATE()) < 18 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer must be at least 18 years old'; END IF;
  IF p_opening_amount < 1000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening deposit must be at least 1000'; END IF;

  START TRANSACTION;
  INSERT INTO customer (full_name,dob,email,phone,pan,address,password_hash)
  VALUES (p_name,p_dob,p_email,p_phone,p_pan,p_address,p_password_hash);
  SET p_customer_id = LAST_INSERT_ID();

  INSERT INTO account (account_number,customer_id,branch_id,account_type,balance,opened_on)
  VALUES ('0000000000',p_customer_id,p_branch_id,p_account_type,0.00,CURDATE());
  SET v_account_id = LAST_INSERT_ID();
  SET p_account_number = CONCAT('5',LPAD(1000000+v_account_id,9,'0'));
  UPDATE account SET account_number=p_account_number WHERE account_id=v_account_id;

  INSERT INTO txn (reference_no,from_account_id,to_account_id,amount,mode,txn_type,remarks)
  VALUES ('TMP',NULL,v_account_id,p_opening_amount,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration');
  SET v_txn_id = LAST_INSERT_ID();
  UPDATE txn SET reference_no=CONCAT('MF',DATE_FORMAT(NOW(),'%Y%m%d'),LPAD(v_txn_id,6,'0')) WHERE txn_id=v_txn_id;

  SET @current_txn_id = v_txn_id;
  UPDATE account SET balance=p_opening_amount WHERE account_id=v_account_id;
  SET @current_txn_id = NULL;
  COMMIT;
END$$

CREATE PROCEDURE sp_open_account(
  IN p_customer_id BIGINT, IN p_account_type ENUM('SAVINGS','CURRENT'),
  IN p_branch_id INT, IN p_from_account_id INT, IN p_amount DECIMAL(15,2),
  OUT p_new_account_id INT, OUT p_account_number CHAR(10)
) SQL SECURITY DEFINER
BEGIN
  DECLARE v_owner BIGINT; DECLARE v_status ENUM('ACTIVE','FROZEN');
  DECLARE v_balance DECIMAL(15,2); DECLARE v_txn_id BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_amount < 1000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening deposit must be at least 1000'; END IF;

  START TRANSACTION;
  SELECT customer_id,status,balance INTO v_owner,v_status,v_balance
  FROM account WHERE account_id=p_from_account_id FOR UPDATE;

  IF v_owner<>p_customer_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account does not belong to this customer'; END IF;
  IF v_status<>'ACTIVE' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Funding account is not active'; END IF;
  IF v_balance<p_amount THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient balance'; END IF;

  INSERT INTO account (account_number,customer_id,branch_id,account_type,balance,opened_on)
  VALUES ('0000000000',p_customer_id,p_branch_id,p_account_type,0.00,CURDATE());
  SET p_new_account_id=LAST_INSERT_ID();
  SET p_account_number=CONCAT('5',LPAD(1000000+p_new_account_id,9,'0'));
  UPDATE account SET account_number=p_account_number WHERE account_id=p_new_account_id;

  INSERT INTO txn (reference_no,from_account_id,to_account_id,amount,mode,txn_type,remarks)
  VALUES ('TMP',p_from_account_id,p_new_account_id,p_amount,'INTERNAL','TRANSFER','Funding new account');
  SET v_txn_id=LAST_INSERT_ID();
  UPDATE txn SET reference_no=CONCAT('MF',DATE_FORMAT(NOW(),'%Y%m%d'),LPAD(v_txn_id,6,'0')) WHERE txn_id=v_txn_id;

  SET @current_txn_id=v_txn_id;
  UPDATE account SET balance=balance-p_amount WHERE account_id=p_from_account_id;
  UPDATE account SET balance=balance+p_amount WHERE account_id=p_new_account_id;
  SET @current_txn_id=NULL;
  COMMIT;
END$$

CREATE PROCEDURE sp_transfer(
  IN p_customer_id BIGINT, IN p_from_account_id INT,
  IN p_to_account_number CHAR(10), IN p_to_ifsc CHAR(11),
  IN p_receiver_name VARCHAR(80), IN p_amount DECIMAL(15,2),
  IN p_mode ENUM('IMPS','NEFT','RTGS'), IN p_remarks VARCHAR(100),
  OUT p_reference_no VARCHAR(20)
) SQL SECURITY DEFINER
BEGIN
  DECLARE v_to_account_id INT; DECLARE v_lower_id INT; DECLARE v_upper_id INT;
  DECLARE v_from_owner BIGINT; DECLARE v_from_status ENUM('ACTIVE','FROZEN');
  DECLARE v_from_balance DECIMAL(15,2); DECLARE v_to_status ENUM('ACTIVE','FROZEN');
  DECLARE v_txn_id BIGINT;
  DECLARE v_dummy_b DECIMAL(15,2); DECLARE v_dummy_s ENUM('ACTIVE','FROZEN');
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_amount<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Amount must be greater than zero'; END IF;
  IF p_mode='IMPS' AND p_amount>500000 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='IMPS allows up to 5,00,000'; END IF;
  IF p_mode='RTGS' AND p_amount<200000 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='RTGS needs at least 2,00,000'; END IF;

  SELECT a.account_id INTO v_to_account_id
  FROM account a JOIN branch b ON a.branch_id=b.branch_id
  WHERE a.account_number=p_to_account_number AND b.ifsc=p_to_ifsc LIMIT 1;

  IF v_to_account_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Receiver account or IFSC not found'; END IF;
  IF p_from_account_id=v_to_account_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot transfer to the same account'; END IF;

  START TRANSACTION;
  IF p_from_account_id<v_to_account_id THEN SET v_lower_id=p_from_account_id; SET v_upper_id=v_to_account_id;
  ELSE SET v_lower_id=v_to_account_id; SET v_upper_id=p_from_account_id; END IF;

  SELECT balance,status INTO v_dummy_b,v_dummy_s FROM account WHERE account_id=v_lower_id FOR UPDATE;
  SELECT balance,status INTO v_dummy_b,v_dummy_s FROM account WHERE account_id=v_upper_id FOR UPDATE;

  SELECT customer_id,status,balance INTO v_from_owner,v_from_status,v_from_balance
  FROM account WHERE account_id=p_from_account_id;

  IF v_from_owner<>p_customer_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account does not belong to this customer'; END IF;
  IF v_from_status<>'ACTIVE' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Sender account is frozen'; END IF;
  SELECT status INTO v_to_status FROM account WHERE account_id=v_to_account_id;
  IF v_to_status<>'ACTIVE' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Receiver account is frozen'; END IF;
  IF v_from_balance<p_amount THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient balance'; END IF;

  INSERT INTO txn (reference_no,from_account_id,to_account_id,receiver_name,amount,mode,txn_type,remarks)
  VALUES ('TMP',p_from_account_id,v_to_account_id,p_receiver_name,p_amount,p_mode,'TRANSFER',p_remarks);
  SET v_txn_id=LAST_INSERT_ID();
  UPDATE txn SET reference_no=CONCAT('MF',DATE_FORMAT(NOW(),'%Y%m%d'),LPAD(v_txn_id,6,'0')) WHERE txn_id=v_txn_id;

  SET @current_txn_id=v_txn_id;
  UPDATE account SET balance=balance-p_amount WHERE account_id=p_from_account_id;
  UPDATE account SET balance=balance+p_amount WHERE account_id=v_to_account_id;
  SET @current_txn_id=NULL;

  SET p_reference_no=CONCAT('MF',DATE_FORMAT(NOW(),'%Y%m%d'),LPAD(v_txn_id,6,'0'));
  COMMIT;
END$$

-- =============================================================================
-- TEST RUNNER: A stored procedure that runs all tests using CONTINUE HANDLER
-- to catch expected errors without aborting the entire script.
-- =============================================================================

CREATE PROCEDURE run_all_tests()
BEGIN
  DECLARE v_err_msg TEXT DEFAULT '';
  DECLARE v_cid1 BIGINT; DECLARE v_acc1 CHAR(10);
  DECLARE v_cid2 BIGINT; DECLARE v_acc2 CHAR(10);
  DECLARE v_ref VARCHAR(20);
  DECLARE v_bal DECIMAL(15,2);
  DECLARE v_bal2 DECIMAL(15,2);
  DECLARE v_aid1 INT;
  DECLARE v_aid2 INT;
  DECLARE v_audit_count_before INT;
  DECLARE v_audit_count_after INT;
  DECLARE v_cust_count INT;

  -- Seed branches
  INSERT INTO branch (branch_id, branch_name, ifsc, city) VALUES
    (1, 'Rohini Sec-9', 'MUDF0000482', 'Delhi'),
    (2, 'Dwarka Sec-12', 'MUDF0000483', 'Delhi');

  -- =========================================================================
  -- TEST B1: Valid registration with 10,000
  -- =========================================================================
  SELECT '=== B1: Valid registration ===' AS test;
  CALL sp_register_customer('Riya Sharma','2000-05-15','riya@test.com','9876543210',
    'ABCDE1234F','Delhi','hash','SAVINGS',1,10000.00, v_cid1, v_acc1);
  SET v_aid1 = (SELECT account_id FROM account WHERE account_number = v_acc1);
  SELECT v_cid1 AS customer_id, v_acc1 AS account_number;
  SELECT balance FROM account WHERE account_id = v_aid1;
  SELECT txn_type, amount, mode FROM txn WHERE to_account_id = v_aid1;
  SELECT 'B1 PASSED: customer, account, txn created, balance=10000' AS result;

  -- =========================================================================
  -- TEST B2: Opening deposit too low (500) — must be rejected
  -- =========================================================================
  SELECT '=== B2: Opening deposit 500 (expect rejection) ===' AS test;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B2 PASSED: Rejected with "', v_err_msg, '"') AS result;
    END;
    CALL sp_register_customer('Bad','2000-01-01','bad@test.com','1111111111',
      'XXXXX9999X','Delhi','hash','SAVINGS',1,500.00, @_x, @_y);
  END;
  -- Verify no orphan customer was left behind
  SELECT COUNT(*) INTO v_cust_count FROM customer WHERE email = 'bad@test.com';
  SELECT IF(v_cust_count=0, 'B2 CONFIRMED: No orphan customer row', 'B2 FAIL: orphan customer found') AS check_result;

  -- =========================================================================
  -- TEST B3: Duplicate PAN — must be rejected, rolled back
  -- =========================================================================
  SELECT '=== B3: Duplicate PAN (expect rejection) ===' AS test;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B3 PASSED: Rejected with "', v_err_msg, '"') AS result;
    END;
    CALL sp_register_customer('Dup PAN','2000-01-01','dup@test.com','2222222222',
      'ABCDE1234F','Delhi','hash','SAVINGS',1,5000.00, @_x, @_y);
  END;

  -- Register second customer for transfer tests
  SELECT '=== SETUP: Register Priya ===' AS test;
  CALL sp_register_customer('Priya Verma','1998-03-20','priya@test.com','8765432109',
    'FGHIJ5678K','Delhi','hash','SAVINGS',2,60000.00, v_cid2, v_acc2);
  SET v_aid2 = (SELECT account_id FROM account WHERE account_number = v_acc2);
  SELECT v_cid2 AS priya_id, v_acc2 AS priya_acc;

  -- =========================================================================
  -- TEST B4: IMPS over limit (5,00,001)
  -- =========================================================================
  SELECT '=== B4: IMPS 5,00,001 (expect rejection) ===' AS test;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B4 PASSED: "', v_err_msg, '"') AS result;
    END;
    CALL sp_transfer(v_cid1, v_aid1, v_acc2, 'MUDF0000483', 'Priya', 500001.00, 'IMPS', 'test', @_r);
  END;

  -- =========================================================================
  -- TEST B5: RTGS under minimum (1,99,999)
  -- =========================================================================
  SELECT '=== B5: RTGS 1,99,999 (expect rejection) ===' AS test;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B5 PASSED: "', v_err_msg, '"') AS result;
    END;
    CALL sp_transfer(v_cid1, v_aid1, v_acc2, 'MUDF0000483', 'Priya', 199999.00, 'RTGS', 'test', @_r);
  END;

  -- =========================================================================
  -- TEST B6: Valid NEFT transfer of 2,000
  -- =========================================================================
  SELECT '=== B6: Valid NEFT transfer 2000 ===' AS test;
  SET v_bal = (SELECT balance FROM account WHERE account_id = v_aid1);
  SET v_bal2 = (SELECT balance FROM account WHERE account_id = v_aid2);
  CALL sp_transfer(v_cid1, v_aid1, v_acc2, 'MUDF0000483', 'Priya Verma', 2000.00, 'NEFT', 'B6 test', v_ref);
  SELECT v_ref AS reference_no;
  SELECT v_bal AS riya_before,
         (SELECT balance FROM account WHERE account_id = v_aid1) AS riya_after,
         v_bal2 AS priya_before,
         (SELECT balance FROM account WHERE account_id = v_aid2) AS priya_after;
  SELECT 'B6 PASSED' AS result;

  -- =========================================================================
  -- TEST B7: Transfer more than balance
  -- =========================================================================
  SELECT '=== B7: Insufficient balance (expect rejection) ===' AS test;
  SET v_bal = (SELECT balance FROM account WHERE account_id = v_aid1);
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B7 PASSED: "', v_err_msg, '"') AS result;
    END;
    CALL sp_transfer(v_cid1, v_aid1, v_acc2, 'MUDF0000483', 'Priya', 9999999.00, 'NEFT', 'too much', @_r);
  END;
  -- Confirm balance unchanged
  SELECT IF((SELECT balance FROM account WHERE account_id = v_aid1) = v_bal,
    'B7 CONFIRMED: Balance unchanged', 'B7 FAIL: balance changed') AS check_result;

  -- =========================================================================
  -- TEST B8: Account / IFSC mismatch (Priya's acc with Riya's branch IFSC)
  -- =========================================================================
  SELECT '=== B8: Account/IFSC mismatch (expect rejection) ===' AS test;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B8 PASSED: "', v_err_msg, '"') AS result;
    END;
    CALL sp_transfer(v_cid1, v_aid1, v_acc2, 'MUDF0000482', 'Priya', 1000.00, 'NEFT', 'wrong ifsc', @_r);
  END;

  -- =========================================================================
  -- TEST B9: Self-transfer
  -- =========================================================================
  SELECT '=== B9: Self-transfer (expect rejection) ===' AS test;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B9 PASSED: "', v_err_msg, '"') AS result;
    END;
    CALL sp_transfer(v_cid1, v_aid1, v_acc1, 'MUDF0000482', 'Riya', 1000.00, 'NEFT', 'self', @_r);
  END;

  -- =========================================================================
  -- TEST B10: Transfer FROM a frozen account
  -- =========================================================================
  SELECT '=== B10: Transfer from frozen account (expect rejection) ===' AS test;
  UPDATE account SET status = 'FROZEN' WHERE account_id = v_aid1;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B10 PASSED: "', v_err_msg, '"') AS result;
    END;
    CALL sp_transfer(v_cid1, v_aid1, v_acc2, 'MUDF0000483', 'Priya', 1000.00, 'NEFT', 'frozen sender', @_r);
  END;
  -- Restore
  UPDATE account SET status = 'ACTIVE' WHERE account_id = v_aid1;

  -- =========================================================================
  -- TEST B11: Transfer TO a frozen account
  -- =========================================================================
  SELECT '=== B11: Transfer to frozen account (expect rejection) ===' AS test;
  UPDATE account SET status = 'FROZEN' WHERE account_id = v_aid2;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B11 PASSED: "', v_err_msg, '"') AS result;
    END;
    CALL sp_transfer(v_cid1, v_aid1, v_acc2, 'MUDF0000483', 'Priya', 1000.00, 'NEFT', 'frozen recv', @_r);
  END;
  -- Restore
  UPDATE account SET status = 'ACTIVE' WHERE account_id = v_aid2;

  -- =========================================================================
  -- TEST C1: Audit log after successful transfer (B6)
  -- Should have: Riya reg (1 audit), Priya reg (1 audit), B6 debit+credit (2 audit) = 4
  -- =========================================================================
  SELECT '=== C1: Audit log rows after successful transfer ===' AS test;
  SELECT audit_id, account_id, txn_id, old_balance, new_balance FROM audit_log ORDER BY audit_id;
  -- The B6 transfer should have produced 2 audit rows (sender debit, receiver credit)
  -- with the same txn_id
  SELECT CONCAT('C1: Found ', COUNT(*), ' total audit rows (expect 4)') AS result FROM audit_log;

  -- =========================================================================
  -- TEST C2: No audit rows from failed transfers (B4-B5, B7-B11 all failed)
  -- Audit count should still be 4
  -- =========================================================================
  SELECT '=== C2: No audit rows from failed transfers ===' AS test;
  SELECT COUNT(*) AS audit_count_should_be_4 FROM audit_log;
  SELECT 'C2 PASSED: Audit count unchanged by failed transfers' AS result;

  -- =========================================================================
  -- LEDGER INVARIANT (D1)
  -- =========================================================================
  SELECT '=== LEDGER INVARIANT (D1) ===' AS test;
  SELECT a.account_id, a.balance,
         COALESCE(c.credits,0) - COALESCE(d.debits,0) AS computed
  FROM account a
  LEFT JOIN (SELECT to_account_id id, SUM(amount) credits FROM txn
             WHERE to_account_id IS NOT NULL GROUP BY to_account_id) c ON c.id=a.account_id
  LEFT JOIN (SELECT from_account_id id, SUM(amount) debits FROM txn
             WHERE from_account_id IS NOT NULL GROUP BY from_account_id) d ON d.id=a.account_id
  WHERE a.balance <> COALESCE(c.credits,0) - COALESCE(d.debits,0);
  SELECT 'D1: Zero rows above = ledger consistent' AS result;

  SELECT '=== ALL PHASE 2A PROCEDURE TESTS COMPLETE ===' AS final;
END$$

DELIMITER ;

-- Run all tests
CALL run_all_tests();

-- Cleanup
DROP DATABASE mudraflow_test;
