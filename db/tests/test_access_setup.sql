-- =============================================================================
-- Setup script for access control tests (A1-A4)
-- Creates mudraflow_test with schema, triggers, procedures, and seed data
-- Run as root before running test_access_control.sql as mudraflow_app
-- =============================================================================

DROP DATABASE IF EXISTS mudraflow_test;
CREATE DATABASE mudraflow_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mudraflow_test;

-- Tables
CREATE TABLE branch (branch_id INT AUTO_INCREMENT PRIMARY KEY, branch_name VARCHAR(60) NOT NULL, ifsc CHAR(11) NOT NULL UNIQUE, city VARCHAR(40) NOT NULL) ENGINE=InnoDB;
CREATE TABLE employee (emp_id VARCHAR(10) PRIMARY KEY, full_name VARCHAR(80) NOT NULL, role ENUM('MANAGER','CLERK') NOT NULL, branch_id INT NOT NULL, password_hash VARCHAR(100) NOT NULL, CONSTRAINT fk_employee_branch FOREIGN KEY (branch_id) REFERENCES branch(branch_id)) ENGINE=InnoDB;
CREATE TABLE customer (customer_id BIGINT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(80) NOT NULL, dob DATE NOT NULL, email VARCHAR(100) NOT NULL UNIQUE, phone CHAR(10) NOT NULL, pan CHAR(10) NOT NULL UNIQUE, address VARCHAR(255) NOT NULL, password_hash VARCHAR(100) NOT NULL, failed_attempts TINYINT NOT NULL DEFAULT 0, locked_until DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB AUTO_INCREMENT=10000001;
CREATE TABLE account (account_id INT AUTO_INCREMENT PRIMARY KEY, account_number CHAR(10) NOT NULL UNIQUE, customer_id BIGINT NOT NULL, branch_id INT NOT NULL, account_type ENUM('SAVINGS','CURRENT') NOT NULL, balance DECIMAL(15,2) NOT NULL DEFAULT 0.00, status ENUM('ACTIVE','FROZEN') NOT NULL DEFAULT 'ACTIVE', opened_on DATE NOT NULL, CONSTRAINT chk_account_balance CHECK (balance >= 0.00), CONSTRAINT fk_account_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id), CONSTRAINT fk_account_branch FOREIGN KEY (branch_id) REFERENCES branch(branch_id)) ENGINE=InnoDB;
CREATE TABLE txn (txn_id BIGINT AUTO_INCREMENT PRIMARY KEY, reference_no VARCHAR(20) NOT NULL UNIQUE, from_account_id INT NULL, to_account_id INT NULL, receiver_name VARCHAR(80) NULL, amount DECIMAL(15,2) NOT NULL, mode ENUM('IMPS','NEFT','RTGS','INTERNAL') NOT NULL, txn_type ENUM('OPENING_DEPOSIT','TRANSFER','FD_CREATE','FD_MATURITY','LOAN_CREDIT') NOT NULL, remarks VARCHAR(100) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT chk_txn_amount CHECK (amount > 0.00), CONSTRAINT chk_txn_accounts CHECK (from_account_id IS NOT NULL OR to_account_id IS NOT NULL), CONSTRAINT fk_txn_from_account FOREIGN KEY (from_account_id) REFERENCES account(account_id), CONSTRAINT fk_txn_to_account FOREIGN KEY (to_account_id) REFERENCES account(account_id)) ENGINE=InnoDB;
CREATE TABLE beneficiary (beneficiary_id INT AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT NOT NULL, name VARCHAR(80) NOT NULL, account_number CHAR(10) NOT NULL, ifsc CHAR(11) NOT NULL, added_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT uq_beneficiary_cust_acc UNIQUE (customer_id, account_number), CONSTRAINT fk_beneficiary_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id)) ENGINE=InnoDB;
CREATE TABLE fixed_deposit (fd_id INT AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT NOT NULL, account_id INT NOT NULL, amount DECIMAL(15,2) NOT NULL, rate DECIMAL(4,2) NOT NULL, tenure_months INT NOT NULL, start_date DATE NOT NULL, maturity_date DATE NOT NULL, maturity_amount DECIMAL(15,2) NOT NULL, maturity_instruction ENUM('CREDIT','RENEW') NOT NULL, status ENUM('ACTIVE','MATURED') NOT NULL DEFAULT 'ACTIVE', CONSTRAINT chk_fd_tenure CHECK (tenure_months IN (6,12,24,36,60)), CONSTRAINT chk_fd_amount CHECK (amount >= 1000.00), CONSTRAINT fk_fd_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id), CONSTRAINT fk_fd_account FOREIGN KEY (account_id) REFERENCES account(account_id)) ENGINE=InnoDB;
CREATE TABLE loan (loan_id INT AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT NOT NULL, account_id INT NOT NULL, amount DECIMAL(15,2) NOT NULL, purpose VARCHAR(100) NOT NULL, duration_months INT NOT NULL, rate DECIMAL(4,2) NOT NULL, employment_status ENUM('SALARIED','SELF_EMPLOYED','STUDENT','OTHER') NOT NULL, annual_income DECIMAL(15,2) NOT NULL, status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING', applied_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, decided_by VARCHAR(10) NULL, decided_on DATETIME NULL, CONSTRAINT chk_loan_amount CHECK (amount > 0.00), CONSTRAINT fk_loan_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id), CONSTRAINT fk_loan_account FOREIGN KEY (account_id) REFERENCES account(account_id), CONSTRAINT fk_loan_employee FOREIGN KEY (decided_by) REFERENCES employee(emp_id)) ENGINE=InnoDB;
CREATE TABLE service_request (request_id INT AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT NOT NULL, account_id INT NOT NULL, request_type ENUM('DEBIT_CARD','CHEQUE_BOOK') NOT NULL, name_on_card VARCHAR(60) NULL, network ENUM('VISA','MASTERCARD','RUPAY') NULL, leaves INT NULL, delivery_address VARCHAR(255) NOT NULL, card_number CHAR(16) NULL, card_expiry DATE NULL, status ENUM('REQUESTED','APPROVED','REJECTED') NOT NULL DEFAULT 'REQUESTED', requested_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, decided_by VARCHAR(10) NULL, decided_on DATETIME NULL, CONSTRAINT chk_sr_leaves CHECK (leaves IS NULL OR leaves IN (10,25,50)), CONSTRAINT fk_sr_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id), CONSTRAINT fk_sr_account FOREIGN KEY (account_id) REFERENCES account(account_id), CONSTRAINT fk_sr_employee FOREIGN KEY (decided_by) REFERENCES employee(emp_id)) ENGINE=InnoDB;
CREATE TABLE audit_log (audit_id BIGINT AUTO_INCREMENT PRIMARY KEY, account_id INT NOT NULL, txn_id BIGINT NULL, old_balance DECIMAL(15,2) NOT NULL, new_balance DECIMAL(15,2) NOT NULL, changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_audit_account FOREIGN KEY (account_id) REFERENCES account(account_id)) ENGINE=InnoDB;

-- Indexes
CREATE INDEX idx_account_customer ON account(customer_id);

-- Functions
DELIMITER $$
CREATE FUNCTION get_fd_rate(p INT) RETURNS DECIMAL(4,2) DETERMINISTIC BEGIN IF p<=6 THEN RETURN 6.50; ELSEIF p<=12 THEN RETURN 7.00; ELSEIF p<=24 THEN RETURN 7.50; ELSE RETURN 7.75; END IF; END$$
CREATE FUNCTION get_loan_rate(p INT) RETURNS DECIMAL(4,2) DETERMINISTIC BEGIN IF p<=12 THEN RETURN 10.00; ELSEIF p<=36 THEN RETURN 11.00; ELSE RETURN 12.00; END IF; END$$

-- Triggers
CREATE TRIGGER trg_txn_block_frozen BEFORE INSERT ON txn FOR EACH ROW
BEGIN
  DECLARE v_s ENUM('ACTIVE','FROZEN');
  IF NEW.from_account_id IS NOT NULL THEN SELECT status INTO v_s FROM account WHERE account_id=NEW.from_account_id; IF v_s='FROZEN' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account is frozen'; END IF; END IF;
  IF NEW.to_account_id IS NOT NULL THEN SELECT status INTO v_s FROM account WHERE account_id=NEW.to_account_id; IF v_s='FROZEN' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account is frozen'; END IF; END IF;
END$$

CREATE TRIGGER trg_account_audit AFTER UPDATE ON account FOR EACH ROW
BEGIN
  IF OLD.balance<>NEW.balance THEN INSERT INTO audit_log (account_id,txn_id,old_balance,new_balance) VALUES (NEW.account_id,@current_txn_id,OLD.balance,NEW.balance); END IF;
END$$

-- Procedures
CREATE PROCEDURE sp_register_customer(IN p_name VARCHAR(80),IN p_dob DATE,IN p_email VARCHAR(100),IN p_phone CHAR(10),IN p_pan CHAR(10),IN p_address VARCHAR(255),IN p_password_hash VARCHAR(100),IN p_account_type ENUM('SAVINGS','CURRENT'),IN p_branch_id INT,IN p_opening_amount DECIMAL(15,2),OUT p_customer_id BIGINT,OUT p_account_number CHAR(10)) SQL SECURITY DEFINER
BEGIN
  DECLARE v_aid INT; DECLARE v_tid BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF TIMESTAMPDIFF(YEAR,p_dob,CURDATE())<18 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Customer must be at least 18 years old'; END IF;
  IF p_opening_amount<1000 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Opening deposit must be at least 1000'; END IF;
  START TRANSACTION;
  INSERT INTO customer (full_name,dob,email,phone,pan,address,password_hash) VALUES (p_name,p_dob,p_email,p_phone,p_pan,p_address,p_password_hash);
  SET p_customer_id=LAST_INSERT_ID();
  INSERT INTO account (account_number,customer_id,branch_id,account_type,balance,opened_on) VALUES ('0000000000',p_customer_id,p_branch_id,p_account_type,0.00,CURDATE());
  SET v_aid=LAST_INSERT_ID();
  SET p_account_number=CONCAT('5',LPAD(1000000+v_aid,9,'0'));
  UPDATE account SET account_number=p_account_number WHERE account_id=v_aid;
  INSERT INTO txn (reference_no,from_account_id,to_account_id,amount,mode,txn_type,remarks) VALUES ('TMP',NULL,v_aid,p_opening_amount,'INTERNAL','OPENING_DEPOSIT','Opening deposit');
  SET v_tid=LAST_INSERT_ID();
  UPDATE txn SET reference_no=CONCAT('MF',DATE_FORMAT(NOW(),'%Y%m%d'),LPAD(v_tid,6,'0')) WHERE txn_id=v_tid;
  SET @current_txn_id=v_tid;
  UPDATE account SET balance=p_opening_amount WHERE account_id=v_aid;
  SET @current_txn_id=NULL;
  COMMIT;
END$$

CREATE PROCEDURE sp_transfer(IN p_cid BIGINT,IN p_from INT,IN p_to_acc CHAR(10),IN p_to_ifsc CHAR(11),IN p_rname VARCHAR(80),IN p_amount DECIMAL(15,2),IN p_mode ENUM('IMPS','NEFT','RTGS'),IN p_remarks VARCHAR(100),OUT p_ref VARCHAR(20)) SQL SECURITY DEFINER
BEGIN
  DECLARE v_to INT; DECLARE v_lo INT; DECLARE v_hi INT;
  DECLARE v_fo BIGINT; DECLARE v_fs ENUM('ACTIVE','FROZEN'); DECLARE v_fb DECIMAL(15,2);
  DECLARE v_ts ENUM('ACTIVE','FROZEN'); DECLARE v_tid BIGINT;
  DECLARE v_db DECIMAL(15,2); DECLARE v_ds ENUM('ACTIVE','FROZEN');
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF p_amount<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Amount must be greater than zero'; END IF;
  IF p_mode='IMPS' AND p_amount>500000 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='IMPS allows up to 5,00,000'; END IF;
  IF p_mode='RTGS' AND p_amount<200000 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='RTGS needs at least 2,00,000'; END IF;
  SELECT a.account_id INTO v_to FROM account a JOIN branch b ON a.branch_id=b.branch_id WHERE a.account_number=p_to_acc AND b.ifsc=p_to_ifsc LIMIT 1;
  IF v_to IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Receiver account or IFSC not found'; END IF;
  IF p_from=v_to THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot transfer to the same account'; END IF;
  START TRANSACTION;
  IF p_from<v_to THEN SET v_lo=p_from; SET v_hi=v_to; ELSE SET v_lo=v_to; SET v_hi=p_from; END IF;
  SELECT balance,status INTO v_db,v_ds FROM account WHERE account_id=v_lo FOR UPDATE;
  SELECT balance,status INTO v_db,v_ds FROM account WHERE account_id=v_hi FOR UPDATE;
  SELECT customer_id,status,balance INTO v_fo,v_fs,v_fb FROM account WHERE account_id=p_from;
  IF v_fo<>p_cid THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account does not belong to this customer'; END IF;
  IF v_fs<>'ACTIVE' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Sender account is frozen'; END IF;
  SELECT status INTO v_ts FROM account WHERE account_id=v_to;
  IF v_ts<>'ACTIVE' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Receiver account is frozen'; END IF;
  IF v_fb<p_amount THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient balance'; END IF;
  INSERT INTO txn (reference_no,from_account_id,to_account_id,receiver_name,amount,mode,txn_type,remarks) VALUES ('TMP',p_from,v_to,p_rname,p_amount,p_mode,'TRANSFER',p_remarks);
  SET v_tid=LAST_INSERT_ID();
  UPDATE txn SET reference_no=CONCAT('MF',DATE_FORMAT(NOW(),'%Y%m%d'),LPAD(v_tid,6,'0')) WHERE txn_id=v_tid;
  SET @current_txn_id=v_tid;
  UPDATE account SET balance=balance-p_amount WHERE account_id=p_from;
  UPDATE account SET balance=balance+p_amount WHERE account_id=v_to;
  SET @current_txn_id=NULL;
  SET p_ref=CONCAT('MF',DATE_FORMAT(NOW(),'%Y%m%d'),LPAD(v_tid,6,'0'));
  COMMIT;
END$$

DELIMITER ;

-- Grants for test DB
GRANT SELECT ON mudraflow_test.* TO 'mudraflow_app'@'localhost';
GRANT INSERT ON mudraflow_test.beneficiary TO 'mudraflow_app'@'localhost';
GRANT INSERT ON mudraflow_test.loan TO 'mudraflow_app'@'localhost';
GRANT INSERT ON mudraflow_test.service_request TO 'mudraflow_app'@'localhost';
GRANT UPDATE (failed_attempts, locked_until) ON mudraflow_test.customer TO 'mudraflow_app'@'localhost';
GRANT UPDATE (status) ON mudraflow_test.account TO 'mudraflow_app'@'localhost';
GRANT EXECUTE ON mudraflow_test.* TO 'mudraflow_app'@'localhost';
FLUSH PRIVILEGES;

-- Seed data for access control tests
INSERT INTO branch VALUES (1,'Rohini Sec-9','MUDF0000482','Delhi'),(2,'Dwarka Sec-12','MUDF0000483','Delhi');
CALL sp_register_customer('Riya','2000-05-15','riya@ac.com','9876543210','ABCDE1234F','Delhi','hash','SAVINGS',1,10000.00,@_c,@_a);
CALL sp_register_customer('Priya','1998-03-20','priya@ac.com','8765432109','FGHIJ5678K','Delhi','hash','SAVINGS',2,60000.00,@_c,@_a);

SELECT 'Access control test DB ready' AS status;

