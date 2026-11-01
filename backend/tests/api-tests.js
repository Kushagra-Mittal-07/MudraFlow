// =============================================================================
// MudraFlow Backend: Automated API Test Suite
// File: backend/tests/api-tests.js
//
// Covers spec/07-testing.md:
// - E1: Login with right password
// - E2: Login with wrong password 5 times (lockout & refusal during lock)
// - E3: Transfer with wrong password (401, no money moves)
// - E4: Transfer with correct password and OTP 111111 (rejected, no money moves)
// - E5: Transfer with correct password and OTP 123456 (succeeds, receipt)
// - E6: Customer A requests Customer B's account history (403/404)
// - E7: Customer token on a /staff/... route (403)
// - E8: Dashboard response (masked numbers, <= 5 recent transactions)
// - E10 (customer part): Staff approves loan -> Customer balance & history update
// - E11: Registration with wrong OTP (rejected, no customer created)
// - E12: Profile response (PAN masked, no password_hash)
// - E13: History rows balance_after invariant check
// =============================================================================

const http = require('http');
const app = require('../server');
const pool = require('../db');

let server;
let baseUrl;

// Helper to make HTTP requests
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test Runner
const results = [];
function recordResult(testId, description, expected, actual, passed) {
  results.push({ testId, description, expected, actual, passed });
  const mark = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${mark}] ${testId}: ${description}`);
  if (!passed) {
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual:   ${actual}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('MudraFlow Phase 3A: Automated API Tests (E1-E8, E10, E11-E13)');
  console.log('===============================================================\n');

  // Start server on an ephemeral port
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  try {
    // =========================================================================
    // TEST E11: Registration with wrong OTP
    // =========================================================================
    {
      const fakePan = 'TESTP9999Z';
      const fakeEmail = 'test.wrongotp@example.com';
      const regRes = await request('POST', '/api/auth/register', {
        full_name: 'Wrong OTP User',
        dob: '1995-01-01',
        email: fakeEmail,
        phone: '9888888888',
        pan: fakePan,
        address: 'Test Address',
        account_type: 'SAVINGS',
        branch_id: 1,
        opening_amount: 5000.00,
        password: 'Demo@123',
        otp: '999999' // Invalid OTP
      });

      const [[dbCheck]] = await pool.query('SELECT customer_id FROM customer WHERE email = ?', [fakeEmail]);
      const passed = regRes.status === 400 &&
                     regRes.body.ok === false &&
                     regRes.body.message === 'Invalid OTP' &&
                     !dbCheck;

      recordResult(
        'E11',
        'Registration with wrong OTP',
        'HTTP 400, rejected, no customer created in DB',
        `Status ${regRes.status}, message: "${regRes.body.message}", dbCheck: ${dbCheck ? 'FOUND' : 'NULL'}`,
        passed
      );
    }

    // =========================================================================
    // TEST E1: Login with right password
    // (Customer 10000001: Riya Sharma, password Demo@123)
    // =========================================================================
    let customerAToken;
    let customerAId = 10000001;
    {
      const res = await request('POST', '/api/auth/login', {
        customer_id: customerAId,
        password: 'Demo@123'
      });

      const [[dbCust]] = await pool.query('SELECT failed_attempts FROM customer WHERE customer_id = ?', [customerAId]);
      const passed = res.status === 200 &&
                     res.body.ok === true &&
                     Boolean(res.body.data && res.body.data.token) &&
                     dbCust.failed_attempts === 0;

      customerAToken = res.body?.data?.token;

      recordResult(
        'E1',
        'Login with right password',
        'HTTP 200, JWT token returned, failed_attempts reset to 0',
        `Status ${res.status}, token: ${customerAToken ? 'EXISTS' : 'NONE'}, failed_attempts: ${dbCust?.failed_attempts}`,
        passed
      );
    }

    // =========================================================================
    // TEST E2: Login with wrong password 5 times (lockout)
    // (Use a dedicated test customer registered via procedure)
    // =========================================================================
    {
      const rand = Math.floor(Math.random() * 8999 + 1000);
      const lockEmail = `locktest${rand}@example.com`;
      const lockPan = `LCK${rand}A`;
      const lockPhone = `977777${rand}`;

      // Register test user
      const reg = await request('POST', '/api/auth/register', {
        full_name: 'Lockout Test User',
        dob: '1990-05-15',
        email: lockEmail,
        phone: lockPhone,
        pan: lockPan,
        address: 'Lockout Lane',
        account_type: 'SAVINGS',
        branch_id: 1,
        opening_amount: 2000.00,
        password: 'Demo@123',
        otp: '123456'
      });
      const lockCustId = reg.body?.data?.customer_id;

      // Fail 4 times
      let attemptStatus = true;
      for (let i = 1; i <= 4; i++) {
        const fRes = await request('POST', '/api/auth/login', {
          customer_id: lockCustId,
          password: 'WrongPassword'
        });
        if (fRes.status !== 401 || fRes.body.remaining_attempts !== 5 - i) {
          attemptStatus = false;
        }
      }

      // 5th failed attempt -> locks account
      const fifthRes = await request('POST', '/api/auth/login', {
        customer_id: lockCustId,
        password: 'WrongPassword'
      });

      // 6th attempt: using CORRECT password during lock period
      const lockedAttemptRes = await request('POST', '/api/auth/login', {
        customer_id: lockCustId,
        password: 'Demo@123'
      });

      const [[lockedCust]] = await pool.query(
        'SELECT locked_until, failed_attempts FROM customer WHERE customer_id = ?',
        [lockCustId]
      );

      const isLocked = lockedCust.locked_until && new Date(lockedCust.locked_until) > new Date();
      const passed = attemptStatus &&
                     fifthRes.status === 403 &&
                     lockedAttemptRes.status === 403 &&
                     lockedAttemptRes.body.message.includes('Account is locked') &&
                     isLocked;

      recordResult(
        'E2',
        'Login lockout after 5 wrong attempts',
        '5th attempt sets locked_until ~10m ahead; correct password during lock is refused (403)',
        `5th status: ${fifthRes.status}, locked attempt status: ${lockedAttemptRes.status}, locked_until: ${lockedCust?.locked_until}`,
        passed
      );
    }

    // =========================================================================
    // TEST E3: Transfer with wrong password
    // =========================================================================
    {
      const [[balBefore]] = await pool.query('SELECT balance FROM account WHERE account_id = 1');
      const res = await request('POST', '/api/transfers', {
        from_account_id: 1,
        to_account_number: '5001000002',
        ifsc: 'MUDF0000483',
        receiver_name: 'Priya Verma',
        amount: 500.00,
        mode: 'IMPS',
        remarks: 'E3 test',
        password: 'IncorrectPassword',
        otp: '123456'
      }, customerAToken);

      const [[balAfter]] = await pool.query('SELECT balance FROM account WHERE account_id = 1');
      const passed = res.status === 401 &&
                     res.body.ok === false &&
                     res.body.message === 'Invalid password' &&
                     balBefore.balance === balAfter.balance;

      recordResult(
        'E3',
        'Transfer with wrong password',
        'HTTP 401, no money moves, balance unchanged',
        `Status ${res.status}, message: "${res.body.message}", balance before: ${balBefore.balance}, after: ${balAfter.balance}`,
        passed
      );
    }

    // =========================================================================
    // TEST E4: Transfer with correct password and OTP 111111
    // =========================================================================
    {
      const [[balBefore]] = await pool.query('SELECT balance FROM account WHERE account_id = 1');
      const res = await request('POST', '/api/transfers', {
        from_account_id: 1,
        to_account_number: '5001000002',
        ifsc: 'MUDF0000483',
        receiver_name: 'Priya Verma',
        amount: 500.00,
        mode: 'IMPS',
        remarks: 'E4 test',
        password: 'Demo@123',
        otp: '111111' // Wrong OTP
      }, customerAToken);

      const [[balAfter]] = await pool.query('SELECT balance FROM account WHERE account_id = 1');
      const passed = res.status === 400 &&
                     res.body.ok === false &&
                     res.body.message === 'Invalid OTP' &&
                     balBefore.balance === balAfter.balance;

      recordResult(
        'E4',
        'Transfer with wrong OTP 111111',
        'HTTP 400, rejected, no money moves',
        `Status ${res.status}, message: "${res.body.message}", balance before: ${balBefore.balance}, after: ${balAfter.balance}`,
        passed
      );
    }

    // =========================================================================
    // TEST E5: Transfer with correct password and OTP 123456
    // =========================================================================
    let transferRefNo;
    {
      const [[senderBalBefore]] = await pool.query('SELECT balance FROM account WHERE account_id = 1');
      const [[recvBalBefore]] = await pool.query('SELECT balance FROM account WHERE account_id = 2');

      const transferAmount = 1000.00;
      const res = await request('POST', '/api/transfers', {
        from_account_id: 1,
        to_account_number: '5001000002',
        ifsc: 'MUDF0000483',
        receiver_name: 'Priya Verma',
        amount: transferAmount,
        mode: 'IMPS',
        remarks: 'E5 successful transfer',
        password: 'Demo@123',
        otp: '123456'
      }, customerAToken);

      const [[senderBalAfter]] = await pool.query('SELECT balance FROM account WHERE account_id = 1');
      const [[recvBalAfter]] = await pool.query('SELECT balance FROM account WHERE account_id = 2');

      transferRefNo = res.body?.data?.reference_no;

      const passed = res.status === 200 &&
                     res.body.ok === true &&
                     Boolean(transferRefNo && transferRefNo.startsWith('MF')) &&
                     (parseFloat(senderBalBefore.balance) - parseFloat(senderBalAfter.balance) === transferAmount) &&
                     (parseFloat(recvBalAfter.balance) - parseFloat(recvBalBefore.balance) === transferAmount);

      recordResult(
        'E5',
        'Transfer with correct password and OTP 123456',
        'HTTP 200, receipt with reference_no returned, balances debited & credited',
        `Status ${res.status}, ref: ${transferRefNo}, sender delta: -${transferAmount}, recv delta: +${transferAmount}`,
        passed
      );
    }

    // =========================================================================
    // TEST E6: Customer A requests Customer B's account history
    // =========================================================================
    {
      // Customer A owns account 1 and 6, but account 2 belongs to Priya (10000002)
      const res = await request('GET', '/api/transactions?account_id=2', null, customerAToken);
      const passed = (res.status === 403 || res.status === 404) && res.body.ok === false;

      recordResult(
        'E6',
        "Customer A requests Customer B's account history",
        'HTTP 403 or 404 access denied',
        `Status ${res.status}, message: "${res.body.message}"`,
        passed
      );
    }

    // =========================================================================
    // TEST E7: Customer token on a /staff/... route
    // =========================================================================
    {
      const res = await request('POST', '/api/staff/loans/1/decision', { decision: 'APPROVED' }, customerAToken);
      const passed = res.status === 403 &&
                     res.body.ok === false &&
                     res.body.message === 'Access denied';

      recordResult(
        'E7',
        'Customer token on a /staff/... route',
        'HTTP 403 Access denied',
        `Status ${res.status}, message: "${res.body.message}"`,
        passed
      );
    }

    // =========================================================================
    // TEST E8: Dashboard response
    // =========================================================================
    {
      const res = await request('GET', '/api/dashboard?account_id=1', null, customerAToken);
      const data = res.body?.data;

      const accountsMasked = data?.accounts?.every(a =>
        a.account_number_masked && a.account_number_masked.startsWith('•••• •••• ') && a.last4
      );

      const selectedMasked = data?.selected_account?.account_number_masked &&
                            data?.selected_account?.account_number_masked.startsWith('•••• •••• ');

      const txnsCountValid = Array.isArray(data?.recent_transactions) &&
                            data.recent_transactions.length <= 5 &&
                            data.recent_transactions.length > 0;

      const metricsPresent = data?.month_in !== undefined &&
                             data?.month_out !== undefined &&
                             data?.active_fd_count !== undefined &&
                             data?.pending_count !== undefined;

      const passed = res.status === 200 &&
                     res.body.ok === true &&
                     accountsMasked &&
                     selectedMasked &&
                     txnsCountValid &&
                     metricsPresent;

      recordResult(
        'E8',
        'Dashboard response format and masking',
        'Account numbers masked (•••• •••• XXXX), at most 5 recent transactions, metrics present',
        `Status ${res.status}, masked: ${accountsMasked}, txns count: ${data?.recent_transactions?.length}`,
        passed
      );
    }

    // =========================================================================
    // TEST E10 (Customer Part): Staff approves loan -> Customer balance & history update
    // =========================================================================
    {
      // 1. Customer applies for a loan
      const loanAmount = 30000.00;
      const loanRes = await request('POST', '/api/loans', {
        account_id: 1,
        amount: loanAmount,
        purpose: 'E10 Test Loan',
        duration_months: 12,
        employment_status: 'SALARIED',
        annual_income: 800000.00,
        password: 'Demo@123'
      }, customerAToken);

      // Find the created loan id
      const [[loanRow]] = await pool.query(
        'SELECT loan_id FROM loan WHERE customer_id = ? AND purpose = ? ORDER BY loan_id DESC LIMIT 1',
        [customerAId, 'E10 Test Loan']
      );

      const [[balBeforeApproval]] = await pool.query('SELECT balance FROM account WHERE account_id = 1');

      // 2. Staff logs in to approve loan
      const staffLogin = await request('POST', '/api/staff/auth/login', {
        emp_id: 'EMP001',
        password: 'Demo@123'
      });
      const staffToken = staffLogin.body?.data?.token;

      // 3. Staff approves loan
      const approvalRes = await request(
        'POST',
        `/api/staff/loans/${loanRow.loan_id}/decision`,
        { decision: 'APPROVED' },
        staffToken
      );

      // 4. Customer verifies balance and transaction history
      const acctRes = await request('GET', '/api/accounts/1', null, customerAToken);
      const histRes = await request('GET', '/api/transactions?account_id=1', null, customerAToken);

      const newBalance = parseFloat(acctRes.body?.data?.balance);
      const expectedBalance = parseFloat(balBeforeApproval.balance) + loanAmount;

      const latestTxn = histRes.body?.data?.transactions?.[0];
      const hasLoanTxn = latestTxn && latestTxn.txn_type === 'LOAN_CREDIT' && parseFloat(latestTxn.amount) === loanAmount;

      const passed = loanRes.status === 201 &&
                     approvalRes.status === 200 &&
                     newBalance === expectedBalance &&
                     hasLoanTxn;

      recordResult(
        'E10',
        'Staff approves loan -> Customer balance & history update',
        'Account credited with loan amount, LOAN_CREDIT transaction visible in history',
        `Loan app status: ${loanRes.status}, approval status: ${approvalRes.status}, bal delta: +${newBalance - parseFloat(balBeforeApproval.balance)}, latest txn: ${latestTxn?.txn_type}`,
        passed
      );
    }

    // =========================================================================
    // TEST E12: Profile response
    // =========================================================================
    {
      const res = await request('GET', '/api/profile', null, customerAToken);
      const bodyStr = JSON.stringify(res.body);

      const panMasked = res.body?.data?.pan_masked &&
                        res.body.data.pan_masked.startsWith('••••••') &&
                        res.body.data.pan_masked.length === 10;

      const noPasswordHash = !bodyStr.includes('password_hash') && !bodyStr.includes('$2b$');

      const passed = res.status === 200 &&
                     res.body.ok === true &&
                     panMasked &&
                     noPasswordHash;

      recordResult(
        'E12',
        'Profile response (masked PAN, no password_hash)',
        'PAN masked as ••••••XXXX, zero occurrences of password_hash in response',
        `Status ${res.status}, pan_masked: "${res.body?.data?.pan_masked}", contains password_hash: ${!noPasswordHash}`,
        passed
      );
    }

    // =========================================================================
    // TEST E13: History rows balance_after invariant
    // =========================================================================
    {
      const res = await request('GET', '/api/transactions?account_id=1&page=1', null, customerAToken);
      const txns = res.body?.data?.transactions || [];

      const [[currentAcct]] = await pool.query('SELECT balance FROM account WHERE account_id = 1');
      const currentBalance = parseFloat(currentAcct.balance).toFixed(2);

      let mathValid = true;
      let newestMatches = false;
      let oldestMatchesOpening = false;

      if (txns.length > 0) {
        // 1. Newest row's balance_after equals account balance
        newestMatches = parseFloat(txns[0].balance_after).toFixed(2) === currentBalance;

        // 2. Each older row's balance_after equals newer row's balance_after minus newer row's signed amount
        for (let i = 0; i < txns.length - 1; i++) {
          const newer = txns[i];
          const older = txns[i + 1];

          const newerSigned = newer.direction === 'credit'
            ? parseFloat(newer.amount)
            : -parseFloat(newer.amount);

          const expectedOlder = (parseFloat(newer.balance_after) - newerSigned).toFixed(2);
          const actualOlder = parseFloat(older.balance_after).toFixed(2);

          if (Math.abs(parseFloat(expectedOlder) - parseFloat(actualOlder)) > 0.01) {
            mathValid = false;
            console.error(`E13 Math mismatch at index ${i}: newer balance_after ${newer.balance_after} - signed ${newerSigned} = ${expectedOlder}, but older is ${actualOlder}`);
            break;
          }
        }

        // 3. Oldest row's balance_after equals opening deposit (125000.00 for Riya)
        const oldest = txns[txns.length - 1];
        oldestMatchesOpening = oldest.txn_type === 'OPENING_DEPOSIT' &&
                              parseFloat(oldest.balance_after) === 125000.00;
      }

      const passed = res.status === 200 &&
                     txns.length > 0 &&
                     newestMatches &&
                     mathValid &&
                     oldestMatchesOpening;

      recordResult(
        'E13',
        'History rows balance_after window function invariant',
        'Newest balance_after = account balance, consecutive rows match signed delta, oldest = opening deposit',
        `Newest: ${txns[0]?.balance_after} vs ${currentBalance}, math: ${mathValid ? 'VALID' : 'INVALID'}, oldest: ${txns[txns.length - 1]?.balance_after}`,
        passed
      );
    }

  } catch (err) {
    console.error('Fatal error during test execution:', err);
  } finally {
    if (server) {
      server.close();
    }
  }

  // Print Summary Table
  console.log('\n===============================================================');
  console.log('API TEST RESULTS SUMMARY:');
  console.log('===============================================================');
  console.table(results.map(r => ({
    'Test ID': r.testId,
    'Description': r.description,
    'Status': r.passed ? 'PASS' : 'FAIL'
  })));

  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall: ${results.filter(r => r.passed).length}/${results.length} tests passed.\n`);

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
