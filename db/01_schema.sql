-- =============================================================================
-- MudraFlow: Database Schema (MySQL 8, InnoDB)
-- File: db/01_schema.sql
-- Phase 1: Database, 10 Tables, Constraints, Indexes, Functions, and User Grants
-- =============================================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS mudraflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mudraflow;

-- Clean drop for re-runs
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS service_request;
DROP TABLE IF EXISTS loan;
DROP TABLE IF EXISTS fixed_deposit;
DROP TABLE IF EXISTS beneficiary;
DROP TABLE IF EXISTS txn;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS customer;
DROP TABLE IF EXISTS employee;
DROP TABLE IF EXISTS branch;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 2. Tables & Constraints (spec/03-database.md §1, §2)
-- =============================================================================

-- Branch Office Information
CREATE TABLE branch (
  branch_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_name VARCHAR(60) NOT NULL,
  ifsc CHAR(11) NOT NULL UNIQUE,
  city VARCHAR(40) NOT NULL
) ENGINE = InnoDB;

-- Bank Staff
CREATE TABLE employee (
  emp_id VARCHAR(10) PRIMARY KEY,
  full_name VARCHAR(80) NOT NULL,
  role ENUM('MANAGER', 'CLERK') NOT NULL,
  branch_id INT NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  CONSTRAINT fk_employee_branch FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
) ENGINE = InnoDB;

-- Customer Profile
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

-- Customer Accounts
CREATE TABLE account (
  account_id INT AUTO_INCREMENT PRIMARY KEY,
  account_number CHAR(10) NOT NULL UNIQUE,
  customer_id BIGINT NOT NULL,
  branch_id INT NOT NULL,
  account_type ENUM('SAVINGS', 'CURRENT') NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
  opened_on DATE NOT NULL,
  CONSTRAINT chk_account_balance CHECK (balance >= 0.00),
  CONSTRAINT fk_account_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_account_branch FOREIGN KEY (branch_id) REFERENCES branch(branch_id)
) ENGINE = InnoDB;

-- Transactions (Ledger)
CREATE TABLE txn (
  txn_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(20) NOT NULL UNIQUE,
  from_account_id INT NULL,
  to_account_id INT NULL,
  receiver_name VARCHAR(80) NULL,
  amount DECIMAL(15,2) NOT NULL,
  mode ENUM('IMPS', 'NEFT', 'RTGS', 'INTERNAL') NOT NULL,
  txn_type ENUM('OPENING_DEPOSIT', 'TRANSFER', 'FD_CREATE', 'FD_MATURITY', 'LOAN_CREDIT') NOT NULL,
  remarks VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_txn_amount CHECK (amount > 0.00),
  CONSTRAINT chk_txn_accounts CHECK (from_account_id IS NOT NULL OR to_account_id IS NOT NULL),
  CONSTRAINT fk_txn_from_account FOREIGN KEY (from_account_id) REFERENCES account(account_id),
  CONSTRAINT fk_txn_to_account FOREIGN KEY (to_account_id) REFERENCES account(account_id)
) ENGINE = InnoDB;

-- Saved Payees (Beneficiaries)
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

-- Fixed Deposits
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
  maturity_instruction ENUM('CREDIT', 'RENEW') NOT NULL,
  status ENUM('ACTIVE', 'MATURED') NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT chk_fd_tenure CHECK (tenure_months IN (6, 12, 24, 36, 60)),
  CONSTRAINT chk_fd_amount CHECK (amount >= 1000.00),
  CONSTRAINT fk_fd_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_fd_account FOREIGN KEY (account_id) REFERENCES account(account_id)
) ENGINE = InnoDB;

-- Loans
CREATE TABLE loan (
  loan_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  account_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  duration_months INT NOT NULL,
  rate DECIMAL(4,2) NOT NULL,
  employment_status ENUM('SALARIED', 'SELF_EMPLOYED', 'STUDENT', 'OTHER') NOT NULL,
  annual_income DECIMAL(15,2) NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  applied_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by VARCHAR(10) NULL,
  decided_on DATETIME NULL,
  CONSTRAINT chk_loan_amount CHECK (amount > 0.00),
  CONSTRAINT fk_loan_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_loan_account FOREIGN KEY (account_id) REFERENCES account(account_id),
  CONSTRAINT fk_loan_employee FOREIGN KEY (decided_by) REFERENCES employee(emp_id)
) ENGINE = InnoDB;

-- Service Requests (Cards & Cheque Books)
CREATE TABLE service_request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  account_id INT NOT NULL,
  request_type ENUM('DEBIT_CARD', 'CHEQUE_BOOK') NOT NULL,
  name_on_card VARCHAR(60) NULL,
  network ENUM('VISA', 'MASTERCARD', 'RUPAY') NULL,
  leaves INT NULL,
  delivery_address VARCHAR(255) NOT NULL,
  card_number CHAR(16) NULL,
  card_expiry DATE NULL,
  status ENUM('REQUESTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
  requested_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by VARCHAR(10) NULL,
  decided_on DATETIME NULL,
  CONSTRAINT chk_sr_leaves CHECK (leaves IS NULL OR leaves IN (10, 25, 50)),
  CONSTRAINT fk_sr_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_sr_account FOREIGN KEY (account_id) REFERENCES account(account_id),
  CONSTRAINT fk_sr_employee FOREIGN KEY (decided_by) REFERENCES employee(emp_id)
) ENGINE = InnoDB;

-- Audit Log for Balance Changes
CREATE TABLE audit_log (
  audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  txn_id BIGINT NULL,
  old_balance DECIMAL(15,2) NOT NULL,
  new_balance DECIMAL(15,2) NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_account FOREIGN KEY (account_id) REFERENCES account(account_id)
) ENGINE = InnoDB;

-- =============================================================================
-- 3. Explicit Indexes (spec/03-database.md §7)
-- =============================================================================

CREATE INDEX idx_account_customer ON account(customer_id);
CREATE INDEX idx_txn_from_created ON txn(from_account_id, created_at);
CREATE INDEX idx_txn_to_created ON txn(to_account_id, created_at);
CREATE INDEX idx_txn_created ON txn(created_at);
CREATE INDEX idx_fd_status_maturity ON fixed_deposit(status, maturity_date);
CREATE INDEX idx_loan_status ON loan(status);
CREATE INDEX idx_service_status ON service_request(status);

-- =============================================================================
-- 4. Stored Functions (spec/03-database.md §3)
-- =============================================================================

DROP FUNCTION IF EXISTS get_fd_rate;
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
DELIMITER ;

DROP FUNCTION IF EXISTS get_loan_rate;
DELIMITER $$
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
DELIMITER ;

-- =============================================================================
-- 5. Database Users and Access Control (spec/03-database.md §9)
-- Passwords use configurable placeholders or session variables.
-- =============================================================================

SET @admin_pwd = COALESCE(@ADMIN_PASSWORD, 'PLACEHOLDER_MUDRAFLOW_ADMIN_PASSWORD');
SET @app_pwd   = COALESCE(@APP_PASSWORD,   'PLACEHOLDER_MUDRAFLOW_APP_PASSWORD');

-- Create administrative user
SET @sql_create_admin = CONCAT("CREATE USER IF NOT EXISTS 'mudraflow_admin'@'localhost' IDENTIFIED BY '", @admin_pwd, "'");
PREPARE stmt_admin FROM @sql_create_admin;
EXECUTE stmt_admin;
DEALLOCATE PREPARE stmt_admin;

GRANT ALL PRIVILEGES ON mudraflow.* TO 'mudraflow_admin'@'localhost' WITH GRANT OPTION;

-- Create application user
SET @sql_create_app = CONCAT("CREATE USER IF NOT EXISTS 'mudraflow_app'@'localhost' IDENTIFIED BY '", @app_pwd, "'");
PREPARE stmt_app FROM @sql_create_app;
EXECUTE stmt_app;
DEALLOCATE PREPARE stmt_app;

-- 1. Read access on all tables
GRANT SELECT ON mudraflow.* TO 'mudraflow_app'@'localhost';

-- 2. Insert access on customer-initiated application tables
GRANT INSERT ON mudraflow.beneficiary TO 'mudraflow_app'@'localhost';
GRANT INSERT ON mudraflow.loan TO 'mudraflow_app'@'localhost';
GRANT INSERT ON mudraflow.service_request TO 'mudraflow_app'@'localhost';

-- 3. Column-level UPDATE privileges
-- Customer login lockout tracking
GRANT UPDATE (failed_attempts, locked_until) ON mudraflow.customer TO 'mudraflow_app'@'localhost';
-- Staff account freeze / unfreeze
GRANT UPDATE (status) ON mudraflow.account TO 'mudraflow_app'@'localhost';

-- 4. Execute stored procedures
GRANT EXECUTE ON mudraflow.* TO 'mudraflow_app'@'localhost';

-- Enforce privilege changes
FLUSH PRIVILEGES;
