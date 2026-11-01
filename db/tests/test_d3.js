// =============================================================================
// MudraFlow: Opposite Transfers Stress Test (D3)
// File: db/tests/test_d3.js
//
// Test D3 from spec/07-testing.md:
// "Opposite transfers. Account X sends to Y while Y sends to X at the same time,
//  repeated 100 times with a script.
//  Expected: no deadlock errors, ledger check D1 still passes."
// =============================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Kush07',
  database: 'mudraflow_test_d3',
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

  console.log('--- Setting up isolated database for D3 Stress Test ---');
  await rootConn.query(`
    DROP DATABASE IF EXISTS mudraflow_test_d3;
    CREATE DATABASE mudraflow_test_d3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
  await rootConn.end();

  const testConn = await mysql.createConnection(DB_CONFIG);
  await testConn.query('USE mudraflow_test_d3;');

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

    CREATE TRIGGER trg_account_audit
    AFTER UPDATE ON account
    FOR EACH ROW
    BEGIN
      IF OLD.balance <> NEW.balance THEN
        INSERT INTO audit_log (account_id, txn_id, old_balance, new_balance)
        VALUES (NEW.account_id, @current_txn_id, OLD.balance, NEW.balance);
      END IF;
    END;

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
      -- Ascending lock order prevents deadlocks
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
    END;
  `);

  await testConn.query(`INSERT INTO branch (branch_id, branch_name, ifsc, city) VALUES (1, 'Rohini Sec-9', 'MUDF0000482', 'Delhi');`);

  // Customer X (Account 1) with ₹100,000
  await testConn.query(`
    INSERT INTO customer (customer_id, full_name, dob, email, phone, pan, address, password_hash)
    VALUES (10000001, 'Customer X', '1990-01-01', 'x@test.com', '9999999991', 'ABCDE1234F', 'Delhi', 'hash');
    INSERT INTO account (account_id, account_number, customer_id, branch_id, account_type, balance, status, opened_on)
    VALUES (1, '5001000001', 10000001, 1, 'SAVINGS', 100000.00, 'ACTIVE', CURDATE());
    INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
    VALUES ('MF000001', NULL, 1, 100000.00, 'INTERNAL', 'OPENING_DEPOSIT', 'Opening deposit');
  `);

  // Customer Y (Account 2) with ₹100,000
  await testConn.query(`
    INSERT INTO customer (customer_id, full_name, dob, email, phone, pan, address, password_hash)
    VALUES (10000002, 'Customer Y', '1992-02-02', 'y@test.com', '9999999992', 'ABCDE1234G', 'Delhi', 'hash');
    INSERT INTO account (account_id, account_number, customer_id, branch_id, account_type, balance, status, opened_on)
    VALUES (2, '5001000002', 10000002, 1, 'SAVINGS', 100000.00, 'ACTIVE', CURDATE());
    INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
    VALUES ('MF000002', NULL, 2, 100000.00, 'INTERNAL', 'OPENING_DEPOSIT', 'Opening deposit');
  `);

  console.log('Setup complete: Account X (₹100,000), Account Y (₹100,000)');
  await testConn.end();
}

async function runD3StressTest() {
  await setupDatabase();

  console.log('\n--- Executing 100 Simultaneous Opposite Transfers ---');
  console.log('Thread 1: X -> Y (₹50)  |  Thread 2: Y -> X (₹50)');

  const conn1 = await mysql.createConnection(DB_CONFIG);
  const conn2 = await mysql.createConnection(DB_CONFIG);

  let successCount = 0;
  let deadlockCount = 0;
  let otherErrorCount = 0;

  const ITERATIONS = 100;
  const startTime = Date.now();

  for (let i = 1; i <= ITERATIONS; i++) {
    // Both transfers triggered concurrently
    const p1 = conn1.query(`
      CALL sp_transfer(10000001, 1, '5001000002', 'MUDF0000482', 'Customer Y', 50.00, 'IMPS', 'X to Y #${i}', @r1);
    `);
    const p2 = conn2.query(`
      CALL sp_transfer(10000002, 2, '5001000001', 'MUDF0000482', 'Customer X', 50.00, 'IMPS', 'Y to X #${i}', @r2);
    `);

    const [res1, res2] = await Promise.allSettled([p1, p2]);

    [res1, res2].forEach(r => {
      if (r.status === 'fulfilled') {
        successCount++;
      } else {
        if (r.reason.code === 'ER_LOCK_DEADLOCK' || (r.reason.message && r.reason.message.toLowerCase().includes('deadlock'))) {
          deadlockCount++;
        } else {
          otherErrorCount++;
        }
      }
    });

    if (i % 25 === 0) {
      process.stdout.write(`Completed ${i}/${ITERATIONS} pairs (${successCount} total transfers successful)\n`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAll 100 opposite pairs executed in ${elapsed}s`);
  console.log(`Successes: ${successCount}/200`);
  console.log(`Deadlocks: ${deadlockCount}`);
  console.log(`Other errors: ${otherErrorCount}`);

  await conn1.end();
  await conn2.end();

  // Ledger invariant check
  const verifyConn = await mysql.createConnection(DB_CONFIG);
  const [acctRows] = await verifyConn.query('SELECT account_id, balance FROM account ORDER BY account_id;');
  console.log(`\nFinal Balances: Account X = ₹${acctRows[0].balance}, Account Y = ₹${acctRows[1].balance}`);

  const [discrepancies] = await verifyConn.query(`
    SELECT a.account_id, a.balance,
           COALESCE(c.credits,0) - COALESCE(d.debits,0) AS computed
    FROM account a
    LEFT JOIN (SELECT to_account_id id, SUM(amount) credits FROM txn
               WHERE to_account_id IS NOT NULL GROUP BY to_account_id) c ON c.id=a.account_id
    LEFT JOIN (SELECT from_account_id id, SUM(amount) debits FROM txn
               WHERE from_account_id IS NOT NULL GROUP BY from_account_id) d ON d.id=a.account_id
    WHERE a.balance <> COALESCE(c.credits,0) - COALESCE(d.debits,0);
  `);

  console.log(`Ledger check D1 discrepancies: ${discrepancies.length}`);

  // Cleanup
  await verifyConn.query('DROP DATABASE IF EXISTS mudraflow_test_d3;');
  await verifyConn.end();

  if (deadlockCount === 0 && otherErrorCount === 0 && successCount === 200 && discrepancies.length === 0) {
    console.log('\n======================================================');
    console.log('TEST D3 PASSED:');
    console.log('- 100 opposite transfer pairs (200 total) completed');
    console.log('- ZERO deadlocks encountered (ascending row locks verified)');
    console.log('- Ledger invariant D1 holds with 0 discrepancies');
    console.log('======================================================');
    process.exit(0);
  } else {
    console.error('\nTEST D3 FAILED:', { successCount, deadlockCount, otherErrorCount, discrepancies });
    process.exit(1);
  }
}

runD3StressTest();
