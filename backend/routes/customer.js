// =============================================================================
// MudraFlow Backend: Customer Routes
// File: backend/routes/customer.js
//
// All customer-facing API endpoints. Every route requires a JWT with
// role='customer'. Ownership checks ensure a customer can only access
// their own data. Password confirmation [pw] and OTP [otp] are checked
// before calling any stored procedure that moves money.
// =============================================================================

const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const {
  maskAccountNumber, last4, maskPan,
  buildDescription, asyncHandler
} = require('../helpers');

const router = express.Router();

// Customer authentication required for all customer routes
router.use((req, res, next) => {
  if (req.path.startsWith('/staff') || req.path.startsWith('/auth') || req.path.startsWith('/branches') || req.path.startsWith('/health')) {
    return next();
  }
  requireAuth('customer')(req, res, next);
});

// ─── HELPER: verify password for [pw] routes ───────────────────────────────
async function verifyPassword(customerId, password) {
  const [[row]] = await pool.query(
    'SELECT password_hash FROM customer WHERE customer_id = ?', [customerId]
  );
  if (!row) return false;
  return bcrypt.compare(password, row.password_hash);
}

// ─── HELPER: verify ownership of an account ────────────────────────────────
async function verifyAccountOwnership(customerId, accountId) {
  const [[row]] = await pool.query(
    'SELECT account_id FROM account WHERE account_id = ? AND customer_id = ?',
    [accountId, customerId]
  );
  return !!row;
}

// =============================================================================
// GET /dashboard?account_id=
// =============================================================================
router.get('/dashboard', asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const accountId = parseInt(req.query.account_id) || null;

  // 1. All accounts for this customer (masked)
  const [accounts] = await pool.query(
    `SELECT a.account_id, a.account_number, a.account_type, a.balance, a.status,
            b.branch_name, b.ifsc
     FROM account a JOIN branch b ON a.branch_id = b.branch_id
     WHERE a.customer_id = ? ORDER BY a.account_id`,
    [customerId]
  );

  if (accounts.length === 0) {
    return res.status(404).json({ ok: false, message: 'No accounts found' });
  }

  // Find the selected account (default to first)
  const selectedId = accountId || accounts[0].account_id;
  const selectedAccount = accounts.find(a => a.account_id === selectedId);
  if (!selectedAccount) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  // Format accounts list with masking
  const accountsList = accounts.map(a => ({
    account_id: a.account_id,
    account_type: a.account_type,
    account_number_masked: maskAccountNumber(a.account_number),
    last4: last4(a.account_number),
    balance: a.balance,
    status: a.status
  }));

  // 2. Selected account card data
  const selectedCard = {
    account_id: selectedAccount.account_id,
    account_type: selectedAccount.account_type,
    status: selectedAccount.status,
    account_number_masked: maskAccountNumber(selectedAccount.account_number),
    last4: last4(selectedAccount.account_number),
    balance: selectedAccount.balance,
    branch_name: selectedAccount.branch_name,
    ifsc: selectedAccount.ifsc
  };

  // 3. Month in / out for the selected account (this calendar month)
  const [[monthSums]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN to_account_id = ? THEN amount ELSE 0 END), 0) AS month_in,
       COALESCE(SUM(CASE WHEN from_account_id = ? THEN amount ELSE 0 END), 0) AS month_out
     FROM txn
     WHERE (from_account_id = ? OR to_account_id = ?)
       AND YEAR(created_at) = YEAR(CURDATE())
       AND MONTH(created_at) = MONTH(CURDATE())`,
    [selectedId, selectedId, selectedId, selectedId]
  );

  // 4. Active FD count and next FD maturity
  const [[fdStats]] = await pool.query(
    `SELECT COUNT(*) AS active_fd_count,
            MIN(maturity_date) AS next_fd_maturity_date,
            (SELECT maturity_amount FROM fixed_deposit
             WHERE customer_id = ? AND status = 'ACTIVE'
             ORDER BY maturity_date LIMIT 1) AS next_fd_maturity_amount
     FROM fixed_deposit
     WHERE customer_id = ? AND status = 'ACTIVE'`,
    [customerId, customerId]
  );

  // 5. Pending requests count
  const [[pendingStats]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM loan WHERE customer_id = ? AND status = 'PENDING') +
       (SELECT COUNT(*) FROM service_request WHERE customer_id = ? AND status = 'REQUESTED') AS pending_count`,
    [customerId, customerId]
  );

  // 6. Last 5 transactions for the selected account (with description & balance_after via SQL window function)
  const [recentTxns] = await pool.query(
    `SELECT t.txn_id, t.reference_no, t.from_account_id, t.to_account_id,
            t.amount, t.mode, t.txn_type, t.remarks, t.created_at,
            fa.account_number AS from_account_number,
            ta.account_number AS to_account_number,
            ? - COALESCE(
              SUM(
                CASE WHEN t.to_account_id = ? THEN t.amount ELSE 0 END
                - CASE WHEN t.from_account_id = ? THEN t.amount ELSE 0 END
              ) OVER (ORDER BY t.created_at DESC, t.txn_id DESC
                       ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
              0
            ) AS balance_after
     FROM txn t
     LEFT JOIN account fa ON t.from_account_id = fa.account_id
     LEFT JOIN account ta ON t.to_account_id = ta.account_id
     WHERE t.from_account_id = ? OR t.to_account_id = ?
     ORDER BY t.created_at DESC, t.txn_id DESC
     LIMIT 5`,
    [parseFloat(selectedAccount.balance), selectedId, selectedId, selectedId, selectedId]
  );

  const formattedTxns = recentTxns.map(row => {
    row._perspective_account_id = selectedId;
    return {
      txn_id: row.txn_id,
      reference_no: row.reference_no,
      amount: row.amount,
      mode: row.mode,
      txn_type: row.txn_type,
      description: buildDescription(row),
      balance_after: parseFloat(row.balance_after).toFixed(2),
      created_at: row.created_at,
      direction: row.to_account_id === selectedId ? 'credit' : 'debit'
    };
  });

  // 7. Latest 3 applications from v_applications
  const [recentApps] = await pool.query(
    `SELECT application_type, application_id, details, status, applied_on
     FROM v_applications
     WHERE customer_id = ?
     ORDER BY applied_on DESC LIMIT 3`,
    [customerId]
  );

  return res.json({
    ok: true,
    data: {
      accounts: accountsList,
      selected_account: selectedCard,
      month_in: monthSums.month_in,
      month_out: monthSums.month_out,
      active_fd_count: fdStats.active_fd_count,
      next_fd_maturity: fdStats.next_fd_maturity_date ? {
        date: fdStats.next_fd_maturity_date,
        amount: fdStats.next_fd_maturity_amount
      } : null,
      pending_count: pendingStats.pending_count,
      recent_transactions: formattedTxns,
      recent_applications: recentApps
    }
  });
}));

// =============================================================================
// GET /accounts — all accounts (masked)
// =============================================================================
router.get('/accounts', asyncHandler(async (req, res) => {
  const [accounts] = await pool.query(
    `SELECT a.account_id, a.account_number, a.account_type, a.balance, a.status,
            b.branch_name, b.ifsc
     FROM account a JOIN branch b ON a.branch_id = b.branch_id
     WHERE a.customer_id = ? ORDER BY a.account_id`,
    [req.user.id]
  );

  const masked = accounts.map(a => ({
    account_id: a.account_id,
    account_type: a.account_type,
    account_number_masked: maskAccountNumber(a.account_number),
    last4: last4(a.account_number),
    balance: a.balance,
    status: a.status,
    branch_name: a.branch_name,
    ifsc: a.ifsc
  }));

  return res.json({ ok: true, data: masked });
}));

// =============================================================================
// GET /accounts/:id — one account with FULL account number (for VIEW/COPY)
// =============================================================================
router.get('/accounts/:id', asyncHandler(async (req, res) => {
  const accountId = parseInt(req.params.id);
  const [[account]] = await pool.query(
    `SELECT a.account_id, a.account_number, a.account_type, a.balance, a.status,
            a.opened_on, b.branch_name, b.ifsc
     FROM account a JOIN branch b ON a.branch_id = b.branch_id
     WHERE a.account_id = ? AND a.customer_id = ?`,
    [accountId, req.user.id]
  );

  if (!account) {
    return res.status(404).json({ ok: false, message: 'Account not found' });
  }

  return res.json({
    ok: true,
    data: {
      account_id: account.account_id,
      account_number: account.account_number, // FULL number
      account_number_masked: maskAccountNumber(account.account_number),
      last4: last4(account.account_number),
      account_type: account.account_type,
      balance: account.balance,
      status: account.status,
      opened_on: account.opened_on,
      branch_name: account.branch_name,
      ifsc: account.ifsc
    }
  });
}));

// =============================================================================
// POST /accounts — open another account [pw]
// =============================================================================
router.post('/accounts', asyncHandler(async (req, res) => {
  const { account_type, branch_id, from_account_id, amount, password } = req.body;

  // Password confirmation
  if (!password || !(await verifyPassword(req.user.id, password))) {
    return res.status(401).json({ ok: false, message: 'Invalid password' });
  }

  // Ownership check on funding account
  if (!(await verifyAccountOwnership(req.user.id, from_account_id))) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.query(
      `CALL sp_open_account(?, ?, ?, ?, ?, @out_id, @out_acc)`,
      [req.user.id, account_type, branch_id, from_account_id, amount]
    );
    const [[result]] = await conn.query('SELECT @out_id AS account_id, @out_acc AS account_number');

    return res.status(201).json({
      ok: true,
      data: {
        account_id: result.account_id,
        account_number: result.account_number,
        account_number_masked: maskAccountNumber(result.account_number)
      }
    });
  } finally {
    conn.release();
  }
}));

// =============================================================================
// GET /branches — list for dropdowns
// =============================================================================
router.get('/branches', asyncHandler(async (req, res) => {
  const [branches] = await pool.query('SELECT branch_id, branch_name, ifsc, city FROM branch');
  return res.json({ ok: true, data: branches });
}));

// =============================================================================
// POST /transfers/review — validate without moving money
// =============================================================================
router.post('/transfers/review', asyncHandler(async (req, res) => {
  let { from_account_id, to_account_number, ifsc, amount, mode, beneficiary_id } = req.body;

  // If beneficiary_id is provided, look up payee details
  if (beneficiary_id) {
    const [[ben]] = await pool.query(
      'SELECT name, account_number, ifsc FROM beneficiary WHERE beneficiary_id = ? AND customer_id = ?',
      [beneficiary_id, req.user.id]
    );
    if (!ben) {
      return res.status(404).json({ ok: false, message: 'Beneficiary not found' });
    }
    to_account_number = ben.account_number;
    ifsc = ben.ifsc;
  }

  // Ownership check
  if (!(await verifyAccountOwnership(req.user.id, from_account_id))) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  // Validate mode rules
  amount = parseFloat(amount);
  if (amount <= 0) {
    return res.status(400).json({ ok: false, message: 'Amount must be greater than zero' });
  }
  if (mode === 'IMPS' && amount > 500000) {
    return res.status(400).json({ ok: false, message: 'IMPS allows up to 5,00,000' });
  }
  if (mode === 'RTGS' && amount < 200000) {
    return res.status(400).json({ ok: false, message: 'RTGS needs at least 2,00,000' });
  }

  // Validate receiver
  const [[receiver]] = await pool.query(
    `SELECT a.account_id, a.account_number, b.branch_name, b.ifsc
     FROM account a JOIN branch b ON a.branch_id = b.branch_id
     WHERE a.account_number = ? AND b.ifsc = ?`,
    [to_account_number, ifsc]
  );

  if (!receiver) {
    return res.status(404).json({ ok: false, message: 'Receiver account or IFSC not found' });
  }

  // Get sender info
  const [[sender]] = await pool.query(
    `SELECT a.account_number, a.balance, b.branch_name, b.ifsc
     FROM account a JOIN branch b ON a.branch_id = b.branch_id
     WHERE a.account_id = ?`,
    [from_account_id]
  );

  if (parseFloat(sender.balance) < amount) {
    return res.status(400).json({ ok: false, message: 'Insufficient balance' });
  }

  return res.json({
    ok: true,
    data: {
      from: {
        account_number_masked: maskAccountNumber(sender.account_number),
        branch_name: sender.branch_name,
        ifsc: sender.ifsc
      },
      to: {
        account_number_masked: maskAccountNumber(receiver.account_number),
        branch_name: receiver.branch_name,
        ifsc: receiver.ifsc
      },
      amount: amount.toFixed(2),
      mode
    }
  });
}));

// =============================================================================
// POST /transfers  [pw] [otp]
// =============================================================================
router.post('/transfers', asyncHandler(async (req, res) => {
  let {
    from_account_id, to_account_number, ifsc, receiver_name,
    amount, mode, remarks, password, otp, beneficiary_id
  } = req.body;

  // Password confirmation
  if (!password || !(await verifyPassword(req.user.id, password))) {
    return res.status(401).json({ ok: false, message: 'Invalid password' });
  }

  // OTP check
  if (!otp || String(otp) !== '123456') {
    return res.status(400).json({ ok: false, message: 'Invalid OTP' });
  }

  // If beneficiary_id, look up details
  if (beneficiary_id) {
    const [[ben]] = await pool.query(
      'SELECT name, account_number, ifsc FROM beneficiary WHERE beneficiary_id = ? AND customer_id = ?',
      [beneficiary_id, req.user.id]
    );
    if (!ben) {
      return res.status(404).json({ ok: false, message: 'Beneficiary not found' });
    }
    to_account_number = ben.account_number;
    ifsc = ben.ifsc;
    receiver_name = ben.name;
  }

  // Ownership check
  if (!(await verifyAccountOwnership(req.user.id, from_account_id))) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.query(
      `CALL sp_transfer(?, ?, ?, ?, ?, ?, ?, ?, @out_ref)`,
      [req.user.id, from_account_id, to_account_number, ifsc, receiver_name, amount, mode, remarks || null]
    );
    const [[result]] = await conn.query('SELECT @out_ref AS reference_no');

    return res.json({
      ok: true,
      data: { reference_no: result.reference_no }
    });
  } finally {
    conn.release();
  }
}));

// =============================================================================
// GET /transactions/:reference_no — receipt data
// =============================================================================
router.get('/transactions/:reference_no', asyncHandler(async (req, res) => {
  const [[txn]] = await pool.query(
    `SELECT t.txn_id, t.reference_no, t.from_account_id, t.to_account_id,
            t.receiver_name, t.amount, t.mode, t.txn_type, t.remarks, t.created_at,
            fa.account_number AS from_account_number,
            ta.account_number AS to_account_number
     FROM txn t
     LEFT JOIN account fa ON t.from_account_id = fa.account_id
     LEFT JOIN account ta ON t.to_account_id = ta.account_id
     WHERE t.reference_no = ?`,
    [req.params.reference_no]
  );

  if (!txn) {
    return res.status(404).json({ ok: false, message: 'Transaction not found' });
  }

  // Ownership: the customer must own at least one of the accounts
  const [owned] = await pool.query(
    `SELECT account_id FROM account WHERE customer_id = ? AND account_id IN (?, ?)`,
    [req.user.id, txn.from_account_id || 0, txn.to_account_id || 0]
  );
  if (owned.length === 0) {
    return res.status(404).json({ ok: false, message: 'Transaction not found' });
  }

  return res.json({
    ok: true,
    data: {
      reference_no: txn.reference_no,
      from_account_masked: txn.from_account_number ? maskAccountNumber(txn.from_account_number) : null,
      to_account_masked: txn.to_account_number ? maskAccountNumber(txn.to_account_number) : null,
      receiver_name: txn.receiver_name,
      amount: txn.amount,
      mode: txn.mode,
      txn_type: txn.txn_type,
      remarks: txn.remarks,
      created_at: txn.created_at
    }
  });
}));

// =============================================================================
// GET /transactions — history with balance_after, description, summary
// =============================================================================
router.get('/transactions', asyncHandler(async (req, res) => {
  const {
    account_id, from, to, type, min, max, page = 1
  } = req.query;

  if (!account_id) {
    return res.status(400).json({ ok: false, message: 'account_id is required' });
  }

  const accountId = parseInt(account_id);

  // Ownership check
  if (!(await verifyAccountOwnership(req.user.id, accountId))) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  // Get account balance
  const [[acct]] = await pool.query('SELECT balance FROM account WHERE account_id = ?', [accountId]);

  // Build the full ledger query with balance_after using a window function.
  // The window function computes balance_after = current_balance - SUM(signed deltas of newer rows).
  // signed_amount: positive for credits (to_account_id = our account), negative for debits (from_account_id = our account).
  //
  // We compute balance_after over the FULL ledger, then apply filters and paging.
  const ledgerSql = `
    SELECT * FROM (
      SELECT t.txn_id, t.reference_no, t.from_account_id, t.to_account_id,
             t.receiver_name, t.amount, t.mode, t.txn_type, t.remarks, t.created_at,
             fa.account_number AS from_account_number,
             ta.account_number AS to_account_number,
             ? - COALESCE(
               SUM(
                 CASE WHEN t.to_account_id = ? THEN t.amount ELSE 0 END
                 - CASE WHEN t.from_account_id = ? THEN t.amount ELSE 0 END
               ) OVER (ORDER BY t.created_at DESC, t.txn_id DESC
                        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
               0
             ) AS balance_after
      FROM txn t
      LEFT JOIN account fa ON t.from_account_id = fa.account_id
      LEFT JOIN account ta ON t.to_account_id = ta.account_id
      WHERE (t.from_account_id = ? OR t.to_account_id = ?)
    ) ledger
    WHERE 1=1
  `;

  const params = [
    parseFloat(acct.balance), accountId, accountId,
    accountId, accountId
  ];

  // Dynamic filters
  let filterSql = '';
  const filterParams = [];

  if (from) { filterSql += ' AND created_at >= ?'; filterParams.push(from); }
  if (to)   { filterSql += ' AND created_at <= ?'; filterParams.push(to + ' 23:59:59'); }
  if (type) { filterSql += ' AND txn_type = ?'; filterParams.push(type); }
  if (min)  { filterSql += ' AND amount >= ?'; filterParams.push(parseFloat(min)); }
  if (max)  { filterSql += ' AND amount <= ?'; filterParams.push(parseFloat(max)); }

  // Summary query — computed over the filtered set (no paging)
  const summarySql = `
    SELECT COUNT(*) AS count,
           COALESCE(SUM(CASE WHEN to_account_id = ? THEN amount ELSE 0 END), 0) AS money_in,
           COALESCE(SUM(CASE WHEN from_account_id = ? THEN amount ELSE 0 END), 0) AS money_out
    FROM (${ledgerSql}${filterSql}) filtered
  `;
  const summaryParams = [accountId, accountId, ...params, ...filterParams];
  const [[summary]] = await pool.query(summarySql, summaryParams);

  // Paginated result
  const perPage = 20;
  const offset = (parseInt(page) - 1) * perPage;
  const pageSql = `${ledgerSql}${filterSql} ORDER BY created_at DESC, txn_id DESC LIMIT ? OFFSET ?`;
  const pageParams = [...params, ...filterParams, perPage, offset];

  const [rows] = await pool.query(pageSql, pageParams);

  const formattedRows = rows.map(row => {
    row._perspective_account_id = accountId;
    return {
      txn_id: row.txn_id,
      reference_no: row.reference_no,
      amount: row.amount,
      mode: row.mode,
      txn_type: row.txn_type,
      description: buildDescription(row),
      balance_after: parseFloat(row.balance_after).toFixed(2),
      remarks: row.remarks,
      created_at: row.created_at,
      direction: row.to_account_id === accountId ? 'credit' : 'debit'
    };
  });

  return res.json({
    ok: true,
    data: {
      transactions: formattedRows,
      summary: {
        count: summary.count,
        money_in: summary.money_in,
        money_out: summary.money_out
      },
      page: parseInt(page),
      per_page: perPage
    }
  });
}));

// =============================================================================
// GET /beneficiaries
// =============================================================================
router.get('/beneficiaries', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT beneficiary_id, name, account_number, ifsc, added_on FROM beneficiary WHERE customer_id = ?',
    [req.user.id]
  );
  return res.json({ ok: true, data: rows });
}));

// =============================================================================
// POST /beneficiaries/verify
// =============================================================================
router.post('/beneficiaries/verify', asyncHandler(async (req, res) => {
  const { account_number, ifsc } = req.body;
  const [[receiver]] = await pool.query(
    `SELECT a.account_id, a.account_number, b.branch_name, b.ifsc, c.full_name
     FROM account a
     JOIN branch b ON a.branch_id = b.branch_id
     JOIN customer c ON a.customer_id = c.customer_id
     WHERE a.account_number = ? AND b.ifsc = ?`,
    [account_number, ifsc]
  );
  if (!receiver) {
    return res.status(404).json({ ok: false, message: 'Receiver account or IFSC not found' });
  }
  return res.json({
    ok: true,
    data: {
      account_number: receiver.account_number,
      branch_name: receiver.branch_name,
      ifsc: receiver.ifsc,
      full_name: receiver.full_name
    }
  });
}));

// =============================================================================
// POST /beneficiaries  [pw]
// =============================================================================
router.post('/beneficiaries', asyncHandler(async (req, res) => {
  const { name, account_number, ifsc, password } = req.body;

  if (!password || !(await verifyPassword(req.user.id, password))) {
    return res.status(401).json({ ok: false, message: 'Invalid password' });
  }

  // Verify the account/IFSC combination exists
  const [[exists]] = await pool.query(
    `SELECT a.account_id FROM account a JOIN branch b ON a.branch_id = b.branch_id
     WHERE a.account_number = ? AND b.ifsc = ?`,
    [account_number, ifsc]
  );
  if (!exists) {
    return res.status(404).json({ ok: false, message: 'Account or IFSC not found' });
  }

  await pool.query(
    'INSERT INTO beneficiary (customer_id, name, account_number, ifsc) VALUES (?, ?, ?, ?)',
    [req.user.id, name, account_number, ifsc]
  );

  return res.status(201).json({ ok: true, data: { message: 'Beneficiary added' } });
}));

// =============================================================================
// GET /fd/preview?amount=&tenure=
// =============================================================================
router.get('/fd/preview', asyncHandler(async (req, res) => {
  const amount = parseFloat(req.query.amount);
  const tenure = parseInt(req.query.tenure);

  const [[rateRow]] = await pool.query('SELECT get_fd_rate(?) AS rate', [tenure]);
  const rate = parseFloat(rateRow.rate);
  const maturityAmount = (amount * (1 + rate / 100 * tenure / 12)).toFixed(2);

  return res.json({
    ok: true,
    data: { rate, maturity_amount: parseFloat(maturityAmount), tenure_months: tenure }
  });
}));

// =============================================================================
// POST /fd  [pw]
// =============================================================================
router.post('/fd', asyncHandler(async (req, res) => {
  const { account_id, amount, tenure_months, instruction, password } = req.body;

  if (!password || !(await verifyPassword(req.user.id, password))) {
    return res.status(401).json({ ok: false, message: 'Invalid password' });
  }

  if (!(await verifyAccountOwnership(req.user.id, account_id))) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.query(
      'CALL sp_create_fd(?, ?, ?, ?, ?, @out_fd_id)',
      [req.user.id, account_id, amount, tenure_months, instruction]
    );
    const [[result]] = await conn.query('SELECT @out_fd_id AS fd_id');
    return res.status(201).json({ ok: true, data: { fd_id: result.fd_id } });
  } finally {
    conn.release();
  }
}));

// =============================================================================
// GET /fd — customer's FDs
// =============================================================================
router.get('/fd', asyncHandler(async (req, res) => {
  const [fds] = await pool.query(
    `SELECT fd_id, account_id, amount, rate, tenure_months, start_date,
            maturity_date, maturity_amount, maturity_instruction, status
     FROM fixed_deposit WHERE customer_id = ? ORDER BY fd_id DESC`,
    [req.user.id]
  );
  return res.json({ ok: true, data: fds });
}));

// =============================================================================
// GET /loans/rate?duration=
// =============================================================================
router.get('/loans/rate', asyncHandler(async (req, res) => {
  const duration = parseInt(req.query.duration);
  const [[row]] = await pool.query('SELECT get_loan_rate(?) AS rate', [duration]);
  return res.json({ ok: true, data: { rate: parseFloat(row.rate) } });
}));

// =============================================================================
// POST /loans  [pw]
// =============================================================================
router.post('/loans', asyncHandler(async (req, res) => {
  const { account_id, amount, purpose, duration_months, employment_status, annual_income, password } = req.body;

  if (!password || !(await verifyPassword(req.user.id, password))) {
    return res.status(401).json({ ok: false, message: 'Invalid password' });
  }

  if (!(await verifyAccountOwnership(req.user.id, account_id))) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  // Get rate from function
  const [[rateRow]] = await pool.query('SELECT get_loan_rate(?) AS rate', [duration_months]);

  await pool.query(
    `INSERT INTO loan (customer_id, account_id, amount, purpose, duration_months, rate, employment_status, annual_income, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [req.user.id, account_id, amount, purpose, duration_months, rateRow.rate, employment_status, annual_income]
  );

  return res.status(201).json({ ok: true, data: { message: 'Loan application submitted' } });
}));

// =============================================================================
// POST /services/debit-card  [pw]
// =============================================================================
router.post('/services/debit-card', asyncHandler(async (req, res) => {
  const { account_id, name_on_card, network, delivery_address, password } = req.body;

  if (!password || !(await verifyPassword(req.user.id, password))) {
    return res.status(401).json({ ok: false, message: 'Invalid password' });
  }

  if (!(await verifyAccountOwnership(req.user.id, account_id))) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  await pool.query(
    `INSERT INTO service_request (customer_id, account_id, request_type, name_on_card, network, delivery_address, status)
     VALUES (?, ?, 'DEBIT_CARD', ?, ?, ?, 'REQUESTED')`,
    [req.user.id, account_id, name_on_card, network, delivery_address]
  );

  return res.status(201).json({ ok: true, data: { message: 'Debit card request submitted' } });
}));

// =============================================================================
// POST /services/cheque-book  [pw]
// =============================================================================
router.post('/services/cheque-book', asyncHandler(async (req, res) => {
  const { account_id, leaves, delivery_address, password } = req.body;

  if (!password || !(await verifyPassword(req.user.id, password))) {
    return res.status(401).json({ ok: false, message: 'Invalid password' });
  }

  if (!(await verifyAccountOwnership(req.user.id, account_id))) {
    return res.status(403).json({ ok: false, message: 'Account not found or access denied' });
  }

  await pool.query(
    `INSERT INTO service_request (customer_id, account_id, request_type, leaves, delivery_address, status)
     VALUES (?, ?, 'CHEQUE_BOOK', ?, ?, 'REQUESTED')`,
    [req.user.id, account_id, leaves, delivery_address]
  );

  return res.status(201).json({ ok: true, data: { message: 'Cheque book request submitted' } });
}));

// =============================================================================
// GET /applications — from v_applications for this customer
// =============================================================================
router.get('/applications', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT application_type, application_id, details, status, applied_on
     FROM v_applications WHERE customer_id = ?
     ORDER BY applied_on DESC`,
    [req.user.id]
  );
  return res.json({ ok: true, data: rows });
}));

// =============================================================================
// GET /profile — customer details with PAN masked
// =============================================================================
router.get('/profile', asyncHandler(async (req, res) => {
  const [[customer]] = await pool.query(
    `SELECT customer_id, full_name, dob, email, phone, pan, address, created_at
     FROM customer WHERE customer_id = ?`,
    [req.user.id]
  );

  if (!customer) {
    return res.status(404).json({ ok: false, message: 'Customer not found' });
  }

  return res.json({
    ok: true,
    data: {
      customer_id: customer.customer_id,
      full_name: customer.full_name,
      dob: customer.dob,
      email: customer.email,
      phone: customer.phone,
      pan_masked: maskPan(customer.pan),
      address: customer.address,
      created_at: customer.created_at
    }
  });
}));

module.exports = router;

