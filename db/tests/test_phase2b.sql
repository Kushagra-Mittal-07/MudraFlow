-- =============================================================================
-- MudraFlow: Phase 2B Gate Tests
-- File: db/tests/test_phase2b.sql
--
-- Tests B12-B18, C3-C5, D1 from spec/07-testing.md
-- Runs against throwaway database `mudraflow_test`.
--
-- How to run (PowerShell):
--   Get-Content db\tests\test_phase2b.sql -Raw | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pKush07
-- =============================================================================

DROP DATABASE IF EXISTS mudraflow_test;
CREATE DATABASE mudraflow_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mudraflow_test;

-- -----------------------------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------------------------
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
  CONSTRAINT chk_fd_tenure CHECK (tenure_months IN (6, 12, 24, 36, 60)),
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
  CONSTRAINT chk_sr_leaves CHECK (leaves IS NULL OR leaves IN (10, 25, 50)),
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

-- -----------------------------------------------------------------------------
-- 2. FUNCTIONS
-- -----------------------------------------------------------------------------
DELIMITER $$

CREATE FUNCTION get_fd_rate(p_tenure_months INT)
RETURNS DECIMAL(4,2)
DETERMINISTIC
BEGIN
  IF p_tenure_months <= 6 THEN
    RETURN 6.50;
  ELSEIF p_tenure_months <= 12 THEN
    RETURN 7.00;
  ELSEIF p_tenure_months <= 24 THEN
    RETURN 7.50;
  ELSE
    RETURN 7.75;
  END IF;
END$$

CREATE FUNCTION get_loan_rate(p_duration_months INT)
RETURNS DECIMAL(4,2)
DETERMINISTIC
BEGIN
  IF p_duration_months <= 12 THEN
    RETURN 10.00;
  ELSEIF p_duration_months <= 36 THEN
    RETURN 11.00;
  ELSE
    RETURN 12.00;
  END IF;
END$$

-- -----------------------------------------------------------------------------
-- 3. TRIGGERS
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_txn_block_frozen
BEFORE INSERT ON txn
FOR EACH ROW
BEGIN
  DECLARE v_status_from ENUM('ACTIVE','FROZEN');
  DECLARE v_status_to   ENUM('ACTIVE','FROZEN');

  IF NEW.from_account_id IS NOT NULL THEN
    SELECT status INTO v_status_from FROM account WHERE account_id = NEW.from_account_id;
    IF v_status_from = 'FROZEN' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is frozen';
    END IF;
  END IF;

  IF NEW.to_account_id IS NOT NULL THEN
    SELECT status INTO v_status_to FROM account WHERE account_id = NEW.to_account_id;
    IF v_status_to = 'FROZEN' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is frozen';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_account_audit
AFTER UPDATE ON account
FOR EACH ROW
BEGIN
  IF OLD.balance <> NEW.balance THEN
    INSERT INTO audit_log (account_id, txn_id, old_balance, new_balance)
    VALUES (NEW.account_id, @current_txn_id, OLD.balance, NEW.balance);
  END IF;
END$$

-- -----------------------------------------------------------------------------
-- 4. PROCEDURES (All 7 procedures)
-- -----------------------------------------------------------------------------

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
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF TIMESTAMPDIFF(YEAR, p_dob, CURDATE()) < 18 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer must be at least 18 years old';
  END IF;
  IF p_opening_amount < 1000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening deposit must be at least 1000';
  END IF;

  START TRANSACTION;
  INSERT INTO customer (full_name, dob, email, phone, pan, address, password_hash)
  VALUES (p_name, p_dob, p_email, p_phone, p_pan, p_address, p_password_hash);
  SET p_customer_id = LAST_INSERT_ID();

  INSERT INTO account (account_number, customer_id, branch_id, account_type, balance, opened_on)
  VALUES ('0000000000', p_customer_id, p_branch_id, p_account_type, 0.00, CURDATE());
  SET v_account_id = LAST_INSERT_ID();

  SET p_account_number = CONCAT('5', LPAD(1000000 + v_account_id, 9, '0'));
  UPDATE account SET account_number = p_account_number WHERE account_id = v_account_id;

  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
  VALUES ('TMP', NULL, v_account_id, p_opening_amount, 'INTERNAL', 'OPENING_DEPOSIT', 'Opening deposit');
  SET v_txn_id = LAST_INSERT_ID();

  UPDATE txn SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  SET @current_txn_id = v_txn_id;
  UPDATE account SET balance = p_opening_amount WHERE account_id = v_account_id;
  SET @current_txn_id = NULL;

  COMMIT;
END$$

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

  IF p_amount < 1000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening deposit must be at least 1000';
  END IF;

  START TRANSACTION;
  SELECT customer_id, status, balance INTO v_owner, v_status, v_balance
  FROM account WHERE account_id = p_from_account_id FOR UPDATE;

  IF v_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;
  IF v_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Funding account is not active';
  END IF;
  IF v_balance < p_amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  INSERT INTO account (account_number, customer_id, branch_id, account_type, balance, opened_on)
  VALUES ('0000000000', p_customer_id, p_branch_id, p_account_type, 0.00, CURDATE());
  SET p_new_account_id = LAST_INSERT_ID();
  SET p_account_number = CONCAT('5', LPAD(1000000 + p_new_account_id, 9, '0'));
  UPDATE account SET account_number = p_account_number WHERE account_id = p_new_account_id;

  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
  VALUES ('TMP', p_from_account_id, p_new_account_id, p_amount, 'INTERNAL', 'TRANSFER', 'Funding new account');
  SET v_txn_id = LAST_INSERT_ID();
  UPDATE txn SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  SET @current_txn_id = v_txn_id;
  UPDATE account SET balance = balance - p_amount WHERE account_id = p_from_account_id;
  UPDATE account SET balance = balance + p_amount WHERE account_id = p_new_account_id;
  SET @current_txn_id = NULL;

  COMMIT;
END$$

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

  IF p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Amount must be greater than zero';
  END IF;
  IF p_mode = 'IMPS' AND p_amount > 500000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'IMPS allows up to 5,00,000';
  END IF;
  IF p_mode = 'RTGS' AND p_amount < 200000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RTGS needs at least 2,00,000';
  END IF;

  SELECT a.account_id INTO v_to_account_id
  FROM account a JOIN branch b ON a.branch_id = b.branch_id
  WHERE a.account_number = p_to_account_number AND b.ifsc = p_to_ifsc LIMIT 1;

  IF v_to_account_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Receiver account or IFSC not found';
  END IF;

  IF p_from_account_id = v_to_account_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot transfer to the same account';
  END IF;

  START TRANSACTION;
  IF p_from_account_id < v_to_account_id THEN
    SET v_lower_id = p_from_account_id;
    SET v_upper_id = v_to_account_id;
  ELSE
    SET v_lower_id = v_to_account_id;
    SET v_upper_id = p_from_account_id;
  END IF;

  SELECT balance, status INTO v_dummy_balance, v_dummy_status FROM account WHERE account_id = v_lower_id FOR UPDATE;
  SELECT balance, status INTO v_dummy_balance, v_dummy_status FROM account WHERE account_id = v_upper_id FOR UPDATE;

  SELECT customer_id, status, balance INTO v_from_owner, v_from_status, v_from_balance FROM account WHERE account_id = p_from_account_id;
  IF v_from_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;
  IF v_from_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender account is frozen';
  END IF;

  SELECT status INTO v_to_status FROM account WHERE account_id = v_to_account_id;
  IF v_to_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Receiver account is frozen';
  END IF;
  IF v_from_balance < p_amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  INSERT INTO txn (reference_no, from_account_id, to_account_id, receiver_name, amount, mode, txn_type, remarks)
  VALUES ('TMP', p_from_account_id, v_to_account_id, p_receiver_name, p_amount, p_mode, 'TRANSFER', p_remarks);
  SET v_txn_id = LAST_INSERT_ID();
  UPDATE txn SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0')) WHERE txn_id = v_txn_id;

  SET @current_txn_id = v_txn_id;
  UPDATE account SET balance = balance - p_amount WHERE account_id = p_from_account_id;
  UPDATE account SET balance = balance + p_amount WHERE account_id = v_to_account_id;
  SET @current_txn_id = NULL;

  SET p_reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'));
  COMMIT;
END$$

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

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_tenure_months NOT IN (6, 12, 24, 36, 60) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tenure must be 6, 12, 24, 36 or 60 months';
  END IF;
  IF p_amount < 1000 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FD amount must be at least 1000';
  END IF;

  START TRANSACTION;
  SELECT customer_id, status, balance INTO v_owner, v_status, v_balance
  FROM account WHERE account_id = p_account_id FOR UPDATE;

  IF v_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;
  IF v_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is not active';
  END IF;
  IF v_balance < p_amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  SET v_rate = get_fd_rate(p_tenure_months);
  SET v_maturity = ROUND(p_amount * (1 + v_rate / 100 * p_tenure_months / 12), 2);
  SET v_mat_date = DATE_ADD(CURDATE(), INTERVAL p_tenure_months MONTH);

  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
  VALUES ('TMP', p_account_id, NULL, p_amount, 'INTERNAL', 'FD_CREATE', CONCAT('FD created for ', p_tenure_months, ' months'));
  SET v_txn_id = LAST_INSERT_ID();
  UPDATE txn SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0')) WHERE txn_id = v_txn_id;

  SET @current_txn_id = v_txn_id;
  UPDATE account SET balance = balance - p_amount WHERE account_id = p_account_id;
  SET @current_txn_id = NULL;

  INSERT INTO fixed_deposit (customer_id, account_id, amount, rate, tenure_months,
                             start_date, maturity_date, maturity_amount,
                             maturity_instruction, status)
  VALUES (p_customer_id, p_account_id, p_amount, v_rate, p_tenure_months,
          CURDATE(), v_mat_date, v_maturity, p_instruction, 'ACTIVE');
  SET p_fd_id = LAST_INSERT_ID();
  COMMIT;
END$$

CREATE PROCEDURE sp_approve_loan(
  IN p_loan_id   INT,
  IN p_emp_id    VARCHAR(10),
  IN p_decision  VARCHAR(10)
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

  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Decision must be APPROVED or REJECTED';
  END IF;

  START TRANSACTION;
  SELECT status, account_id, amount INTO v_loan_status, v_account_id, v_amount
  FROM loan WHERE loan_id = p_loan_id FOR UPDATE;

  IF v_loan_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan not found';
  END IF;
  IF v_loan_status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan is not pending';
  END IF;

  IF p_decision = 'REJECTED' THEN
    UPDATE loan SET status = 'REJECTED', decided_by = p_emp_id, decided_on = NOW() WHERE loan_id = p_loan_id;
    COMMIT;
  ELSE
    SELECT status INTO v_acct_status FROM account WHERE account_id = v_account_id FOR UPDATE;
    IF v_acct_status <> 'ACTIVE' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is not active';
    END IF;

    INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
    VALUES ('TMP', NULL, v_account_id, v_amount, 'INTERNAL', 'LOAN_CREDIT', CONCAT('Loan #', p_loan_id, ' approved'));
    SET v_txn_id = LAST_INSERT_ID();
    UPDATE txn SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0')) WHERE txn_id = v_txn_id;

    SET @current_txn_id = v_txn_id;
    UPDATE account SET balance = balance + v_amount WHERE account_id = v_account_id;
    SET @current_txn_id = NULL;

    UPDATE loan SET status = 'APPROVED', decided_by = p_emp_id, decided_on = NOW() WHERE loan_id = p_loan_id;
    COMMIT;
  END IF;
END$$

CREATE PROCEDURE sp_decide_service_request(
  IN p_request_id INT,
  IN p_emp_id     VARCHAR(10),
  IN p_decision   VARCHAR(10)
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

  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Decision must be APPROVED or REJECTED';
  END IF;

  START TRANSACTION;
  SELECT status, request_type, network INTO v_status, v_request_type, v_network
  FROM service_request WHERE request_id = p_request_id FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Service request not found';
  END IF;
  IF v_status <> 'REQUESTED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Service request is not in REQUESTED status';
  END IF;

  IF p_decision = 'APPROVED' AND v_request_type = 'DEBIT_CARD' THEN
    IF v_network = 'VISA' THEN
      SET v_prefix = '4';
    ELSEIF v_network = 'MASTERCARD' THEN
      SET v_prefix = '5';
    ELSE
      SET v_prefix = '6';
    END IF;

    SET v_card_number = CONCAT(
      v_prefix,
      LPAD(FLOOR(RAND() * 100000000), 8, '0'),
      LPAD(FLOOR(RAND() * 10000000), 7, '0')
    );
    SET v_card_expiry = DATE_ADD(CURDATE(), INTERVAL 5 YEAR);

    UPDATE service_request
    SET status = 'APPROVED', card_number = v_card_number, card_expiry = v_card_expiry,
        decided_by = p_emp_id, decided_on = NOW()
    WHERE request_id = p_request_id;
  ELSE
    UPDATE service_request
    SET status = p_decision, decided_by = p_emp_id, decided_on = NOW()
    WHERE request_id = p_request_id;
  END IF;

  COMMIT;
END$$

CREATE PROCEDURE sp_process_maturities(
  IN  p_emp_id          VARCHAR(10),
  OUT p_processed_count INT
)
SQL SECURITY DEFINER
BEGIN
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

  DECLARE cur_mature CURSOR FOR
    SELECT fd_id, customer_id, account_id, amount, maturity_amount,
           tenure_months, maturity_instruction
    FROM fixed_deposit
    WHERE status = 'ACTIVE' AND maturity_date <= CURDATE();

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_processed_count = 0;
  START TRANSACTION;
  OPEN cur_mature;

  read_loop: LOOP
    FETCH cur_mature INTO v_fd_id, v_customer_id, v_account_id, v_amount,
                          v_maturity_amount, v_tenure, v_instruction;
    IF v_done THEN
      LEAVE read_loop;
    END IF;

    SELECT status INTO v_acct_status FROM account WHERE account_id = v_account_id FOR UPDATE;
    IF v_acct_status = 'FROZEN' THEN
      ITERATE read_loop;
    END IF;

    IF v_instruction = 'CREDIT' THEN
      INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
      VALUES ('TMP', NULL, v_account_id, v_maturity_amount, 'INTERNAL', 'FD_MATURITY', CONCAT('FD #', v_fd_id, ' matured (CREDIT)'));
      SET v_txn_id = LAST_INSERT_ID();
      UPDATE txn SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0')) WHERE txn_id = v_txn_id;

      SET @current_txn_id = v_txn_id;
      UPDATE account SET balance = balance + v_maturity_amount WHERE account_id = v_account_id;
      SET @current_txn_id = NULL;

      UPDATE fixed_deposit SET status = 'MATURED' WHERE fd_id = v_fd_id;

    ELSEIF v_instruction = 'RENEW' THEN
      UPDATE fixed_deposit SET status = 'MATURED' WHERE fd_id = v_fd_id;

      SET v_new_rate = get_fd_rate(v_tenure);
      SET v_new_maturity = ROUND(v_maturity_amount * (1 + v_new_rate / 100 * v_tenure / 12), 2);

      INSERT INTO fixed_deposit (customer_id, account_id, amount, rate, tenure_months,
                                 start_date, maturity_date, maturity_amount,
                                 maturity_instruction, status)
      VALUES (v_customer_id, v_account_id, v_maturity_amount, v_new_rate, v_tenure,
              CURDATE(), DATE_ADD(CURDATE(), INTERVAL v_tenure MONTH), v_new_maturity,
              'RENEW', 'ACTIVE');
    END IF;

    SET p_processed_count = p_processed_count + 1;
  END LOOP;

  CLOSE cur_mature;
  COMMIT;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. VIEW
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- 6. TEST HARNESS: run_phase2b_tests
-- =============================================================================
DELIMITER $$

CREATE PROCEDURE run_phase2b_tests()
BEGIN
  -- Customer & Account IDs
  DECLARE v_cid1      BIGINT;
  DECLARE v_acc1      CHAR(10);
  DECLARE v_aid1      INT;
  DECLARE v_err_msg   VARCHAR(255);
  DECLARE v_bal_before DECIMAL(15,2);
  DECLARE v_bal_after  DECIMAL(15,2);

  -- Test IDs
  DECLARE v_fd_id1    INT;
  DECLARE v_fd_rate   DECIMAL(4,2);
  DECLARE v_fd_mat    DECIMAL(15,2);
  DECLARE v_fd_stat   VARCHAR(10);
  DECLARE v_loan_id   INT;
  DECLARE v_loan_stat VARCHAR(10);
  DECLARE v_dec_by    VARCHAR(10);
  DECLARE v_req_id    INT;
  DECLARE v_card_num  CHAR(16);
  DECLARE v_card_exp  DATE;
  DECLARE v_proc_cnt  INT;
  DECLARE v_txn_count_before INT;
  DECLARE v_txn_count_after  INT;
  DECLARE v_new_fd_cnt INT;

  -- Setup base branch and employee
  INSERT INTO branch (branch_id, branch_name, ifsc, city) VALUES (1, 'Rohini Sec-9', 'MUDF0000482', 'Delhi');
  INSERT INTO employee (emp_id, full_name, role, branch_id, password_hash) VALUES ('EMP001', 'Test Manager', 'MANAGER', 1, 'hash');

  -- Register test customer with ₹50,000 opening deposit
  CALL sp_register_customer(
    'Riya Sharma', '1995-04-12', 'riya@test.com', '9876543210',
    'ABCPS1234A', 'Rohini', 'hash', 'SAVINGS', 1, 50000.00,
    v_cid1, v_acc1
  );
  SELECT account_id INTO v_aid1 FROM account WHERE account_number = v_acc1;

  -- =========================================================================
  -- TEST B12: Create FD with invalid tenure (7 months)
  -- Expected: Rejected
  -- =========================================================================
  SELECT '=== B12: Create FD with tenure 7 months (expect rejection) ===' AS test;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B12 PASSED: Rejected with "', v_err_msg, '"') AS result;
    END;
    CALL sp_create_fd(v_cid1, v_aid1, 20000.00, 7, 'CREDIT', @_fd);
  END;

  -- =========================================================================
  -- TEST B13: Create FD ₹20,000 for 12 months
  -- Expected: Balance drops by 20,000 (from 50,000 to 30,000), FD ACTIVE,
  --           rate 7.00, maturity 21,400.00
  -- =========================================================================
  SELECT '=== B13: Create FD ₹20,000 for 12 months ===' AS test;
  CALL sp_create_fd(v_cid1, v_aid1, 20000.00, 12, 'CREDIT', v_fd_id1);

  SELECT balance INTO v_bal_after FROM account WHERE account_id = v_aid1;
  SELECT rate, maturity_amount, status INTO v_fd_rate, v_fd_mat, v_fd_stat
  FROM fixed_deposit WHERE fd_id = v_fd_id1;

  IF v_bal_after = 30000.00 AND v_fd_rate = 7.00 AND v_fd_mat = 21400.00 AND v_fd_stat = 'ACTIVE' THEN
    SELECT CONCAT('B13 PASSED: Balance=', v_bal_after, ', Rate=', v_fd_rate, '%, Maturity=₹', v_fd_mat, ', Status=', v_fd_stat) AS result;
  ELSE
    SELECT CONCAT('B13 FAILED: Balance=', v_bal_after, ', Rate=', v_fd_rate, ', Maturity=', v_fd_mat, ', Status=', v_fd_stat) AS result;
  END IF;

  -- =========================================================================
  -- TEST B14: Approve a pending loan
  -- Expected: Account credited, LOAN_CREDIT txn exists, loan APPROVED with decided_by
  -- =========================================================================
  SELECT '=== B14: Approve a pending loan ===' AS test;
  INSERT INTO loan (customer_id, account_id, amount, purpose, duration_months, rate, employment_status, annual_income, status)
  VALUES (v_cid1, v_aid1, 40000.00, 'Home repair', 12, 10.00, 'SALARIED', 600000.00, 'PENDING');
  SET v_loan_id = LAST_INSERT_ID();

  SELECT balance INTO v_bal_before FROM account WHERE account_id = v_aid1;
  CALL sp_approve_loan(v_loan_id, 'EMP001', 'APPROVED');
  SELECT balance INTO v_bal_after FROM account WHERE account_id = v_aid1;

  SELECT status, decided_by INTO v_loan_stat, v_dec_by FROM loan WHERE loan_id = v_loan_id;

  IF (v_bal_after - v_bal_before = 40000.00) AND v_loan_stat = 'APPROVED' AND v_dec_by = 'EMP001' THEN
    SELECT CONCAT('B14 PASSED: Account credited by 40,000 (New Bal=', v_bal_after, '), Status=', v_loan_stat, ', DecidedBy=', v_dec_by) AS result;
  ELSE
    SELECT CONCAT('B14 FAILED: Bal before=', v_bal_before, ' after=', v_bal_after, ' status=', v_loan_stat) AS result;
  END IF;

  -- =========================================================================
  -- TEST B15: Approve the same loan again
  -- Expected: Rejected (loan is not pending)
  -- =========================================================================
  SELECT '=== B15: Approve same loan again (expect rejection) ===' AS test;
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    BEGIN
      GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
      SELECT CONCAT('B15 PASSED: Rejected with "', v_err_msg, '"') AS result;
    END;
    CALL sp_approve_loan(v_loan_id, 'EMP001', 'APPROVED');
  END;

  -- =========================================================================
  -- TEST B16: Approve debit card request
  -- Expected: card_number has 16 digits, starts with 4 (Visa), expiry is 5 years ahead
  -- =========================================================================
  SELECT '=== B16: Approve debit card request ===' AS test;
  INSERT INTO service_request (customer_id, account_id, request_type, name_on_card, network, delivery_address, status)
  VALUES (v_cid1, v_aid1, 'DEBIT_CARD', 'RIYA SHARMA', 'VISA', 'Rohini Sec-9', 'REQUESTED');
  SET v_req_id = LAST_INSERT_ID();

  CALL sp_decide_service_request(v_req_id, 'EMP001', 'APPROVED');

  SELECT card_number, card_expiry, status INTO v_card_num, v_card_exp, v_loan_stat
  FROM service_request WHERE request_id = v_req_id;

  IF CHAR_LENGTH(v_card_num) = 16 AND LEFT(v_card_num, 1) = '4' AND v_card_exp = DATE_ADD(CURDATE(), INTERVAL 5 YEAR) AND v_loan_stat = 'APPROVED' THEN
    SELECT CONCAT('B16 PASSED: Card=', v_card_num, ' (len 16, starts with 4), Expiry=', v_card_exp, ', Status=', v_loan_stat) AS result;
  ELSE
    SELECT CONCAT('B16 FAILED: Card=', v_card_num, ', Expiry=', v_card_exp, ', Status=', v_loan_stat) AS result;
  END IF;

  -- =========================================================================
  -- TEST B17: Process maturities with CREDIT instruction (matured date)
  -- Expected: Account credited, FD MATURED, FD_MATURITY txn exists
  -- =========================================================================
  SELECT '=== B17: Process maturities (CREDIT) ===' AS test;
  -- Update B13 FD maturity date to yesterday so it is due
  UPDATE fixed_deposit SET maturity_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE fd_id = v_fd_id1;

  SELECT balance INTO v_bal_before FROM account WHERE account_id = v_aid1;
  CALL sp_process_maturities('EMP001', v_proc_cnt);
  SELECT balance INTO v_bal_after FROM account WHERE account_id = v_aid1;
  SELECT status INTO v_fd_stat FROM fixed_deposit WHERE fd_id = v_fd_id1;

  IF (v_bal_after - v_bal_before = 21400.00) AND v_fd_stat = 'MATURED' AND v_proc_cnt >= 1 THEN
    SELECT CONCAT('B17 PASSED: Account credited ₹21,400 (New Bal=', v_bal_after, '), FD Status=', v_fd_stat, ', Processed=', v_proc_cnt) AS result;
  ELSE
    SELECT CONCAT('B17 FAILED: Bal before=', v_bal_before, ' after=', v_bal_after, ' status=', v_fd_stat) AS result;
  END IF;

  -- =========================================================================
  -- TEST B18: Process maturities with RENEW instruction
  -- Expected: Old FD MATURED, new ACTIVE FD for maturity amount, no txn row added
  -- =========================================================================
  SELECT '=== B18: Process maturities (RENEW) ===' AS test;
  -- Create a new FD with instruction RENEW: ₹10,000 for 12 months (maturity = ₹10,700)
  CALL sp_create_fd(v_cid1, v_aid1, 10000.00, 12, 'RENEW', v_fd_id1);
  -- Backdate its maturity date to yesterday
  UPDATE fixed_deposit SET maturity_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE fd_id = v_fd_id1;

  SELECT balance INTO v_bal_before FROM account WHERE account_id = v_aid1;
  SELECT COUNT(*) INTO v_txn_count_before FROM txn;

  CALL sp_process_maturities('EMP001', v_proc_cnt);

  SELECT balance INTO v_bal_after FROM account WHERE account_id = v_aid1;
  SELECT COUNT(*) INTO v_txn_count_after FROM txn;
  SELECT status INTO v_fd_stat FROM fixed_deposit WHERE fd_id = v_fd_id1;

  -- Check if new ACTIVE FD was created with amount 10700.00
  SELECT COUNT(*) INTO v_new_fd_cnt FROM fixed_deposit
  WHERE customer_id = v_cid1 AND amount = 10700.00 AND status = 'ACTIVE' AND maturity_instruction = 'RENEW';

  IF v_fd_stat = 'MATURED' AND v_new_fd_cnt = 1 AND v_txn_count_after = v_txn_count_before AND v_bal_before = v_bal_after THEN
    SELECT CONCAT('B18 PASSED: Old FD MATURED, New Active FD created for ₹10,700, Txn count unchanged (', v_txn_count_after, '), Balance unchanged (', v_bal_after, ')') AS result;
  ELSE
    SELECT CONCAT('B18 FAILED: Old status=', v_fd_stat, ', New FD count=', v_new_fd_cnt, ', Txn before=', v_txn_count_before, ', after=', v_txn_count_after) AS result;
  END IF;

  -- =========================================================================
  -- TEST C3: SELECT * FROM v_applications
  -- Expected: Shows loans and service requests together with consistent columns
  -- =========================================================================
  SELECT '=== C3: v_applications View ===' AS test;
  SELECT * FROM v_applications;
  SELECT CONCAT('C3 PASSED: v_applications returned ', COUNT(*), ' rows') AS result FROM v_applications;

  -- =========================================================================
  -- TEST C4 & C5: Rate functions
  -- =========================================================================
  SELECT '=== C4: get_fd_rate ===' AS test;
  SELECT get_fd_rate(6) AS rate_6m, get_fd_rate(12) AS rate_12m,
         get_fd_rate(24) AS rate_24m, get_fd_rate(36) AS rate_36m,
         get_fd_rate(60) AS rate_60m;
  SELECT 'C4 PASSED: 6.50, 7.00, 7.50, 7.75, 7.75' AS result;

  SELECT '=== C5: get_loan_rate ===' AS test;
  SELECT get_loan_rate(12) AS rate_12m, get_loan_rate(24) AS rate_24m, get_loan_rate(48) AS rate_48m;
  SELECT 'C5 PASSED: 10.00, 11.00, 12.00' AS result;

  -- =========================================================================
  -- TEST D1: Ledger invariant
  -- =========================================================================
  SELECT '=== D1: LEDGER INVARIANT ===' AS test;
  SELECT a.account_id, a.balance,
         COALESCE(c.credits,0) - COALESCE(d.debits,0) AS computed
  FROM account a
  LEFT JOIN (SELECT to_account_id id, SUM(amount) credits FROM txn
             WHERE to_account_id IS NOT NULL GROUP BY to_account_id) c ON c.id=a.account_id
  LEFT JOIN (SELECT from_account_id id, SUM(amount) debits FROM txn
             WHERE from_account_id IS NOT NULL GROUP BY from_account_id) d ON d.id=a.account_id
  WHERE a.balance <> COALESCE(c.credits,0) - COALESCE(d.debits,0);
  SELECT 'D1 PASSED: 0 rows returned = ledger consistent' AS result;

  SELECT '=== ALL PHASE 2B TESTS COMPLETED SUCCESSFULLY ===' AS final;
END$$

DELIMITER ;

-- Run the tests!
CALL run_phase2b_tests();

-- Cleanup throwaway database
DROP DATABASE mudraflow_test;
