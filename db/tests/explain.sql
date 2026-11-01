-- =============================================================================
-- MudraFlow: Index Performance EXPLAIN Comparison (D4)
-- File: db/tests/explain.sql
--
-- Measures query performance on ~50,000 transaction records before and after
-- the composite index idx_txn_from_created (from_account_id, created_at).
-- =============================================================================

USE mudraflow;

-- 1. Create unindexed table copy
DROP TABLE IF EXISTS txn_copy;
CREATE TABLE txn_copy (
  txn_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(20) NOT NULL,
  from_account_id INT NULL,
  to_account_id INT NULL,
  receiver_name VARCHAR(80) NULL,
  amount DECIMAL(15,2) NOT NULL,
  mode ENUM('IMPS','NEFT','RTGS','INTERNAL') NOT NULL,
  txn_type ENUM('OPENING_DEPOSIT','TRANSFER','FD_CREATE','FD_MATURITY','LOAN_CREDIT') NOT NULL,
  remarks VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- 2. Fast bulk-insert of 50,000 realistic transactions using cross-joined digit generators
INSERT INTO txn_copy (reference_no, from_account_id, to_account_id, receiver_name, amount, mode, txn_type, remarks, created_at)
SELECT
  CONCAT('MF', LPAD(t.n, 10, '0')),
  (t.n % 50) + 1,
  ((t.n + 1) % 50) + 1,
  'Demo Payee',
  100.00 + (t.n % 5000),
  'IMPS',
  'TRANSFER',
  'Performance test record',
  DATE_ADD('2026-01-01 00:00:00', INTERVAL (t.n % 180) DAY)
FROM (
  SELECT a.i + b.i*10 + c.i*100 + d.i*1000 + e.i*10000 AS n
  FROM
    (SELECT 0 i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
    CROSS JOIN (SELECT 0 i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
    CROSS JOIN (SELECT 0 i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
    CROSS JOIN (SELECT 0 i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d
    CROSS JOIN (SELECT 0 i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) e
) t;

SELECT CONCAT('Rows inserted into txn_copy: ', COUNT(*)) AS bulk_status FROM txn_copy;

-- 3. EXPLAIN BEFORE INDEX
SELECT '=== EXPLAIN BEFORE INDEX ===' AS status;
EXPLAIN
SELECT * FROM txn_copy
WHERE from_account_id = 1
  AND created_at BETWEEN '2026-02-01' AND '2026-03-01'
ORDER BY created_at DESC;

-- 4. Create the composite index
SELECT '=== CREATING COMPOSITE INDEX (from_account_id, created_at) ===' AS status;
CREATE INDEX idx_txn_copy_from_created ON txn_copy(from_account_id, created_at);

-- 5. EXPLAIN AFTER INDEX
SELECT '=== EXPLAIN AFTER INDEX ===' AS status;
EXPLAIN
SELECT * FROM txn_copy
WHERE from_account_id = 1
  AND created_at BETWEEN '2026-02-01' AND '2026-03-01'
ORDER BY created_at DESC;

-- 6. Cleanup
DROP TABLE IF EXISTS txn_copy;
