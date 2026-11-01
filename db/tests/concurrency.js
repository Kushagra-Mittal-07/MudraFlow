// =============================================================================
// MudraFlow: Concurrency Test (D2)
// File: db/tests/concurrency.js
//
// Test D2 from spec/07-testing.md:
// "Two simultaneous transfers on the same account. Account X has ₹10,000.
//  Open two MySQL sessions. In both, call sp_transfer for ₹8,000 from X at the
//  same moment. Expected: one succeeds, the other waits for the lock and then
//  fails with 'Insufficient balance'. Final balance of X is ₹2,000, never negative."
// =============================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Kush07',
  database: 'mudraflow_test_concurrency',
  multipleStatements: true
};

async function setupDatabase() {
  const rootConn = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    multipleStatements: true
  });

  console.log('--- Setting up isolated database for D2 Concurrency Test ---');
  await rootConn.query(`
    DROP DATABASE IF EXISTS mudraflow_test_concurrency;
    CREATE DATABASE mudraflow_test_concurrency CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
  await rootConn.end();

  // Create tables and procedures in the new test database
  const fs = require('fs');
  const path = require('path');
  const schemaSql = fs.readFileSync(path.join(__dirname, '..', '01_schema.sql'), 'utf8');
  const programsSql = fs.readFileSync(path.join(__dirname, '..', '02_programs.sql'), 'utf8');

  const testConn = await mysql.createConnection(DB_CONFIG);
  // Remove CREATE DATABASE / USE mudraflow if present in schema file, or execute with current DB
  // Since 01_schema and 02_programs have "USE mudraflow;", we switch back
  await testConn.query('USE mudraflow_test_concurrency;');

  // Inline table creation for isolation
  await testConn.query(`
    CREATE TABLE branch (
      branch_id INT AUTO_INCREMENT PRIMARY KEY,
      branch_name VARCHAR(60) NOT NULL,
      ifsc CHAR(11) NOT NULL UNIQUE,
      city VARCHAR(40) NOT NULL
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

    CREATE TABLE audit_log (
      audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      account_id INT NOT NULL,
      txn_id BIGINT NULL,
      old_balance DECIMAL(15,2) NOT NULL,
      new_balance DECIMAL(15,2) NOT NULL,
      changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_audit_account FOREIGN KEY (account_id) REFERENCES account(account_id)
    ) ENGINE = InnoDB;
  `);

  // Triggers
  await testConn.query(`
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
    END;
  `);

  await testConn.query(`
    CREATE TRIGGER trg_account_audit
    AFTER UPDATE ON account
    FOR EACH ROW
    BEGIN
      IF OLD.balance <> NEW.balance THEN
        INSERT INTO audit_log (account_id, txn_id, old_balance, new_balance)
        VALUES (NEW.account_id, @current_txn_id, OLD.balance, NEW.balance);
      END IF;
    END;
  `);

  // Stored procedure sp_transfer
  await testConn.query(`
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

      -- Small sleep (0.2s) in test environment to guarantee lock contention
      DO SLEEP(0.2);

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
    END;
  `);

  // Insert seed branch
  await testConn.query(`INSERT INTO branch (branch_id, branch_name, ifsc, city) VALUES (1, 'Rohini Sec-9', 'MUDF0000482', 'Delhi');`);

  // Insert Customer X (Sender) with starting balance ₹10,000
  await testConn.query(`
    INSERT INTO customer (customer_id, full_name, dob, email, phone, pan, address, password_hash)
    VALUES (10000001, 'Sender X', '1990-01-01', 'x@test.com', '9999999991', 'ABCDE1234F', 'Delhi', 'hash');
    INSERT INTO account (account_id, account_number, customer_id, branch_id, account_type, balance, status, opened_on)
    VALUES (1, '5001000001', 10000001, 1, 'SAVINGS', 10000.00, 'ACTIVE', CURDATE());
    INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
    VALUES ('MF000001', NULL, 1, 10000.00, 'INTERNAL', 'OPENING_DEPOSIT', 'Opening deposit');
  `);

  // Insert Customer Y (Receiver)
  await testConn.query(`
    INSERT INTO customer (customer_id, full_name, dob, email, phone, pan, address, password_hash)
    VALUES (10000002, 'Receiver Y', '1992-02-02', 'y@test.com', '9999999992', 'ABCDE1234G', 'Delhi', 'hash');
    INSERT INTO account (account_id, account_number, customer_id, branch_id, account_type, balance, status, opened_on)
    VALUES (2, '5001000002', 10000002, 1, 'SAVINGS', 0.00, 'ACTIVE', CURDATE());
  `);

  console.log('Setup complete: Account X has ₹10,000.00, Account Y has ₹0.00');
  await testConn.end();
}

async function runConcurrencyTest() {
  await setupDatabase();

  console.log('\n--- Opening TWO simultaneous MySQL connections ---');
  const conn1 = await mysql.createConnection(DB_CONFIG);
  const conn2 = await mysql.createConnection(DB_CONFIG);

  console.log('Both sessions calling sp_transfer for ₹8,000 from Account X simultaneously...');

  const transferTask = (conn, sessionLabel) => {
    return conn.query(`
      CALL sp_transfer(10000001, 1, '5001000002', 'MUDF0000482', 'Receiver Y', 8000.00, 'NEFT', '${sessionLabel} simultaneous transfer', @ref);
    `).then(() => {
      return { session: sessionLabel, status: 'SUCCESS' };
    }).catch(err => {
      return { session: sessionLabel, status: 'FAILED', error: err.message };
    });
  };

  // Launch both simultaneously
  const results = await Promise.all([
    transferTask(conn1, 'Session 1'),
    transferTask(conn2, 'Session 2')
  ]);

  console.log('\nExecution Results:');
  console.log('Session 1 result:', results[0]);
  console.log('Session 2 result:', results[1]);

  await conn1.end();
  await conn2.end();

  // Verify database state
  const verifyConn = await mysql.createConnection(DB_CONFIG);
  const [acctRows] = await verifyConn.query('SELECT account_id, balance FROM account ORDER BY account_id;');
  const balanceX = parseFloat(acctRows[0].balance);
  const balanceY = parseFloat(acctRows[1].balance);

  console.log(`\nFinal Balances: Account X = ₹${balanceX.toFixed(2)}, Account Y = ₹${balanceY.toFixed(2)}`);

  const successes = results.filter(r => r.status === 'SUCCESS');
  const failures = results.filter(r => r.status === 'FAILED');

  const oneSucceeded = successes.length === 1;
  const oneFailedWithInsufficient = failures.length === 1 && failures[0].error.includes('Insufficient balance');
  const balanceIs2000 = balanceX === 2000.00 && balanceY === 8000.00;

  // Cleanup test database
  await verifyConn.query('DROP DATABASE IF EXISTS mudraflow_test_concurrency;');
  await verifyConn.end();

  if (oneSucceeded && oneFailedWithInsufficient && balanceIs2000) {
    console.log('\n======================================================');
    console.log('TEST D2 PASSED:');
    console.log('- Exactly one transfer succeeded');
    console.log('- Exactly one transfer failed with "Insufficient balance"');
    console.log('- Final balance of Account X is exactly ₹2,000.00 (never negative)');
    console.log('======================================================');
    process.exit(0);
  } else {
    console.error('\nTEST D2 FAILED:', { oneSucceeded, oneFailedWithInsufficient, balanceIs2000 });
    process.exit(1);
  }
}

runConcurrencyTest();
