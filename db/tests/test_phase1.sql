-- =============================================================================
-- MudraFlow: Phase 1 Gate Verification Tests
-- File: db/tests/test_phase1.sql
-- =============================================================================

USE mudraflow;

-- 1. Verify all 10 tables exist
SELECT '--- TABLE COUNT & NAMES ---' AS test;
SELECT table_name, engine, table_rows
FROM information_schema.tables
WHERE table_schema = 'mudraflow' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Verify get_fd_rate deterministic output (spec: 6.50, 7.00, 7.50, 7.75, 7.75)
SELECT '--- GET_FD_RATE VERIFICATION ---' AS test;
SELECT 
  get_fd_rate(6)  AS rate_6m,
  get_fd_rate(12) AS rate_12m,
  get_fd_rate(24) AS rate_24m,
  get_fd_rate(36) AS rate_36m,
  get_fd_rate(60) AS rate_60m;

-- 3. Verify get_loan_rate deterministic output (spec: 10.00, 11.00, 12.00)
SELECT '--- GET_LOAN_RATE VERIFICATION ---' AS test;
SELECT 
  get_loan_rate(12) AS loan_12m,
  get_loan_rate(24) AS loan_24m,
  get_loan_rate(48) AS loan_48m;

-- 4. Verify explicit indexes
SELECT '--- EXPLICIT INDEXES ---' AS test;
SELECT table_name, index_name, column_name, seq_in_index
FROM information_schema.statistics
WHERE table_schema = 'mudraflow'
  AND index_name NOT IN ('PRIMARY')
ORDER BY table_name, index_name, seq_in_index;

-- 5. Verify users exist
SELECT '--- USERS & GRANTS ---' AS test;
SELECT user, host FROM mysql.user WHERE user IN ('mudraflow_admin', 'mudraflow_app');

