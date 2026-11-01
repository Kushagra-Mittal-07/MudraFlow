-- =============================================================================
-- MudraFlow: Access Control Tests (A1-A4) from spec/07-testing.md
-- File: db/tests/test_access_control.sql
--
-- These tests must run as mudraflow_app against mudraflow_test.
-- The test_phase2a.sql script should have been run first to set up the database.
-- We re-create the test DB here for isolation.
--
-- Run as root first to set up, then as mudraflow_app for the actual tests:
--   mysql -u root -pKush07 < db/tests/test_access_setup.sql
--   mysql -u mudraflow_app -pApp@Mudra123 mudraflow_test < db/tests/test_access_control.sql
-- =============================================================================

-- =============================================================================
-- TEST A1: mudraflow_app cannot UPDATE account.balance
-- Expected: permission denied
-- =============================================================================
SELECT '=== A1: UPDATE balance (expect permission denied) ===' AS test;
UPDATE account SET balance = 999999 WHERE account_id = 1;

-- =============================================================================
-- TEST A2: mudraflow_app CAN UPDATE account.status
-- Expected: allowed
-- =============================================================================
SELECT '=== A2: UPDATE status (expect allowed) ===' AS test;
UPDATE account SET status = 'FROZEN' WHERE account_id = 1;
SELECT account_id, status FROM account WHERE account_id = 1;
-- Restore
UPDATE account SET status = 'ACTIVE' WHERE account_id = 1;

-- =============================================================================
-- TEST A3: mudraflow_app can CALL sp_transfer (runs as DEFINER)
-- Expected: works
-- =============================================================================
SELECT '=== A3: CALL sp_transfer as mudraflow_app ===' AS test;
CALL sp_transfer(
  (SELECT customer_id FROM account WHERE account_id = 1),
  1,
  (SELECT account_number FROM account WHERE account_id = 2),
  (SELECT b.ifsc FROM account a JOIN branch b ON a.branch_id=b.branch_id WHERE a.account_id = 2),
  'Test', 100.00, 'NEFT', 'A3 test', @ref
);
SELECT @ref AS reference_no;
SELECT 'A3 PASSED' AS result;

-- =============================================================================
-- TEST A4: mudraflow_app cannot DELETE FROM txn
-- Expected: permission denied
-- =============================================================================
SELECT '=== A4: DELETE FROM txn (expect permission denied) ===' AS test;
DELETE FROM txn;

