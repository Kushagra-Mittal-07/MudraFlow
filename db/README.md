# MudraFlow Database Setup & Schema Management

This directory contains the database definition files for MudraFlow (MySQL 8 with InnoDB).

## Files
- `01_schema.sql`: Database `mudraflow`, all 10 tables, constraints, explicit indexes, stored functions (`get_fd_rate`, `get_loan_rate`), and database users (`mudraflow_admin`, `mudraflow_app`) with column-level grants.
- `tests/test_phase1.sql`: Verification queries testing table existence, constraints, rate functions, and user privileges.

---

## 1. Initial Setup: Create the Database

Passwords for `mudraflow_admin` and `mudraflow_app` use placeholders (`PLACEHOLDER_MUDRAFLOW_ADMIN_PASSWORD` and `PLACEHOLDER_MUDRAFLOW_APP_PASSWORD`). You can pass custom passwords dynamically using session variables or replace the placeholders before running.

### On Windows (PowerShell)

```powershell
# Set your desired credentials for the application and admin users
$ADMIN_PWD = "YourSecureAdminPassword123"
$APP_PWD   = "YourSecureAppPassword123"

# Run schema script passing password variables (replace 'your_root_password' with your MySQL root password)
Get-Content db\01_schema.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "SET @ADMIN_PASSWORD='$ADMIN_PWD'; SET @APP_PASSWORD='$APP_PWD'; source db/01_schema.sql;"
```

Or run interactively inside the MySQL client:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```
```sql
SET @ADMIN_PASSWORD = 'YourSecureAdminPassword123';
SET @APP_PASSWORD   = 'YourSecureAppPassword123';
SOURCE db/01_schema.sql;
```

### On macOS / Linux (Terminal)

```bash
ADMIN_PWD="YourSecureAdminPassword123"
APP_PWD="YourSecureAppPassword123"

mysql -u root -p -e "SET @ADMIN_PASSWORD='$ADMIN_PWD'; SET @APP_PASSWORD='$APP_PWD'; source db/01_schema.sql;"
```

Or interactively inside the MySQL client:
```bash
mysql -u root -p
```
```sql
SET @ADMIN_PASSWORD = 'YourSecureAdminPassword123';
SET @APP_PASSWORD   = 'YourSecureAppPassword123';
SOURCE db/01_schema.sql;
```

---

## 2. Drop and Recreate the Database

`db/01_schema.sql` is fully idempotent: it drops tables in reverse foreign-key order using `SET FOREIGN_KEY_CHECKS = 0;` before recreating them.

To completely reset the database from scratch:

### On Windows (PowerShell)
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "DROP DATABASE IF EXISTS mudraflow;"
Get-Content db\01_schema.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

### On macOS / Linux
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS mudraflow;"
mysql -u root -p < db/01_schema.sql
```

---

## 3. Verify Phase 1 Gates

Log in as `mudraflow_admin` or `root`:

```bash
# Windows
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p mudraflow

# macOS
mysql -u root -p mudraflow
```

### (a) Verify Tables Exist
```sql
SHOW TABLES;
SHOW CREATE TABLE account\G
SHOW CREATE TABLE txn\G
SHOW CREATE TABLE fixed_deposit\G
```

### (b) Verify Rate Functions
```sql
SELECT 
  get_fd_rate(6)  AS rate_6m,
  get_fd_rate(12) AS rate_12m,
  get_fd_rate(24) AS rate_24m,
  get_fd_rate(36) AS rate_36m,
  get_fd_rate(60) AS rate_60m;
-- Expected: 6.50 | 7.00 | 7.50 | 7.75 | 7.75

SELECT 
  get_loan_rate(12) AS loan_12m,
  get_loan_rate(24) AS loan_24m,
  get_loan_rate(48) AS loan_48m;
-- Expected: 10.00 | 11.00 | 12.00
```

### (c) Verify Balance CHECK Constraint Rejects Negative Balance
```sql
-- Step 1: Insert temporary customer and branch for test
INSERT INTO branch (branch_id, branch_name, ifsc, city) VALUES (999, 'Test Branch', 'MUDF0000999', 'Test City');
INSERT INTO customer (customer_id, full_name, dob, email, phone, pan, address, password_hash)
VALUES (99999999, 'Test User', '2000-01-01', 'test@mudraflow.com', '9876543210', 'ABCDE1234F', 'Test Address', 'hash');

-- Step 2: Attempt to insert account with negative balance (MUST FAIL)
INSERT INTO account (account_number, customer_id, branch_id, account_type, balance, opened_on)
VALUES ('5009999999', 99999999, 999, 'SAVINGS', -500.00, CURDATE());
-- Result: Error Code: 3819. Check constraint 'chk_account_balance' is violated.

-- Step 3: Cleanup test data
DELETE FROM customer WHERE customer_id = 99999999;
DELETE FROM branch WHERE branch_id = 999;
```

