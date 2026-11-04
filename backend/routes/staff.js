// =============================================================================
// MudraFlow Backend: Staff Routes
// File: backend/routes/staff.js
//
// Complete staff portal API endpoints for overview, approvals, customer management,
// transactions audit, and FD maturity batch processing.
// Balances change ONLY inside stored procedures. Staff can never edit balances.
// =============================================================================

const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { maskPan, asyncHandler } = require('../helpers');

const router = express.Router();

// Staff authentication required for all /staff routes
router.use('/staff', requireAuth('staff'));

// =============================================================================
// 1. GET /staff/overview
// =============================================================================
router.get('/staff/overview', asyncHandler(async (req, res) => {
  // Stat strip metrics
  const [[custStats]] = await pool.query('SELECT COUNT(*) AS total_customers FROM customer');
  const [[acctStats]] = await pool.query('SELECT COUNT(*) AS total_accounts FROM account');
  const [[balStats]] = await pool.query('SELECT COALESCE(SUM(balance), 0) AS total_balance FROM account');
  const [[txnStats]] = await pool.query('SELECT COUNT(*) AS transactions_today FROM txn WHERE DATE(created_at) = CURDATE()');

  // Work queue counts
  const [[loanStats]] = await pool.query("SELECT COUNT(*) AS count FROM loan WHERE status = 'PENDING'");
  const [[servStats]] = await pool.query("SELECT COUNT(*) AS count FROM service_request WHERE status = 'REQUESTED'");
  const [[fdDueStats]] = await pool.query("SELECT COUNT(*) AS count FROM fixed_deposit WHERE status = 'ACTIVE' AND maturity_date <= CURDATE()");

  const pendingApprovals = (loanStats.count || 0) + (servStats.count || 0);

  // Money per branch query
  const [branchRows] = await pool.query(`
    SELECT b.branch_id, b.branch_name, b.ifsc,
           COUNT(a.account_id) AS accounts,
           COALESCE(SUM(a.balance), 0) AS total_balance
    FROM branch b
    LEFT JOIN account a ON b.branch_id = a.branch_id
    GROUP BY b.branch_id, b.branch_name, b.ifsc
    ORDER BY total_balance DESC
  `);

  const totalBankBal = parseFloat(balStats.total_balance) || 1;
  const moneyPerBranch = branchRows.map(b => ({
    branch_id: b.branch_id,
    branch_name: b.branch_name,
    ifsc: b.ifsc,
    accounts: b.accounts,
    total_balance: parseFloat(b.total_balance).toFixed(2),
    share: Math.max(0, Math.min(100, Math.round((parseFloat(b.total_balance) / totalBankBal) * 100)))
  }));

  // 8 latest transactions
  const [latestTxns] = await pool.query(`
    SELECT t.txn_id, t.reference_no, t.amount, t.mode, t.txn_type, t.remarks, t.created_at,
           fa.account_number AS from_account_number,
           ta.account_number AS to_account_number
    FROM txn t
    LEFT JOIN account fa ON t.from_account_id = fa.account_id
    LEFT JOIN account ta ON t.to_account_id = ta.account_id
    ORDER BY t.created_at DESC, t.txn_id DESC
    LIMIT 8
  `);

  return res.json({
    ok: true,
    data: {
      total_customers: custStats.total_customers,
      total_accounts: acctStats.total_accounts,
      total_balance: parseFloat(balStats.total_balance).toFixed(2),
      transactions_today: txnStats.transactions_today,
      pending_approvals: pendingApprovals,
      pending_loans: loanStats.count || 0,
      pending_services: servStats.count || 0,
      fd_due_count: fdDueStats.count || 0,
      money_per_branch: moneyPerBranch,
      latest_transactions: latestTxns
    }
  });
}));

// =============================================================================
// 2. GET /staff/loans – list loans (optional ?status=)
// =============================================================================
router.get('/staff/loans', asyncHandler(async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT l.loan_id, l.customer_id, l.account_id, l.amount, l.purpose,
           l.duration_months, l.rate, l.employment_status, l.annual_income,
           l.status, l.applied_on, l.decided_by, l.decided_on,
           c.full_name AS customer_name,
           a.account_number
    FROM loan l
    JOIN customer c ON l.customer_id = c.customer_id
    JOIN account a ON l.account_id = a.account_id
  `;
  const params = [];
  if (status && status !== 'ALL') {
    sql += ' WHERE l.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY l.applied_on DESC, l.loan_id DESC';

  const [loans] = await pool.query(sql, params);
  return res.json({ ok: true, data: loans });
}));

// =============================================================================
// 3. POST /staff/loans/:id/decision – decide loan via sp_approve_loan
// =============================================================================
router.post('/staff/loans/:id/decision', asyncHandler(async (req, res) => {
  const loanId = parseInt(req.params.id);
  const { decision } = req.body;
  const empId = req.user.id;

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ ok: false, message: 'Decision must be APPROVED or REJECTED' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_approve_loan(?, ?, ?)', [loanId, empId, decision]);
    return res.json({
      ok: true,
      data: {
        message: `Loan application ${decision.toLowerCase()}`
      }
    });
  } finally {
    conn.release();
  }
}));

// =============================================================================
// 4. GET /staff/services – list cards & cheque book requests
// =============================================================================
router.get('/staff/services', asyncHandler(async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT sr.request_id, sr.customer_id, sr.account_id, sr.request_type,
           sr.name_on_card, sr.network, sr.leaves, sr.delivery_address,
           sr.card_number, sr.card_expiry, sr.status, sr.requested_on,
           sr.decided_by, sr.decided_on,
           c.full_name AS customer_name,
           a.account_number
    FROM service_request sr
    JOIN customer c ON sr.customer_id = c.customer_id
    JOIN account a ON sr.account_id = a.account_id
  `;
  const params = [];
  if (status && status !== 'ALL') {
    sql += ' WHERE sr.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY sr.requested_on DESC, sr.request_id DESC';

  const [services] = await pool.query(sql, params);
  return res.json({ ok: true, data: services });
}));

// =============================================================================
// 5. POST /staff/services/:id/decision – decide service request via sp_decide_service_request
// =============================================================================
router.post('/staff/services/:id/decision', asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { decision } = req.body;
  const empId = req.user.id;

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ ok: false, message: 'Decision must be APPROVED or REJECTED' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_decide_service_request(?, ?, ?)', [requestId, empId, decision]);

    // If approved debit card, fetch generated card details to report to user
    const [[updated]] = await conn.query(
      'SELECT card_number, card_expiry, request_type FROM service_request WHERE request_id = ?',
      [requestId]
    );

    return res.json({
      ok: true,
      data: {
        message: `Request ${decision.toLowerCase()}`,
        card_number: updated?.card_number || null,
        card_expiry: updated?.card_expiry || null
      }
    });
  } finally {
    conn.release();
  }
}));

// =============================================================================
// 6. GET /staff/customers – search customers (?q=)
// =============================================================================
router.get('/staff/customers', asyncHandler(async (req, res) => {
  const { q } = req.query;
  let sql = `
    SELECT c.customer_id, c.full_name, c.email, c.phone, c.pan, c.dob, c.address, c.created_at,
           COUNT(a.account_id) AS account_count
    FROM customer c
    LEFT JOIN account a ON c.customer_id = a.customer_id
  `;
  const params = [];
  if (q && q.trim()) {
    const cleanQ = q.trim();
    sql += `
      WHERE c.customer_id = ?
         OR c.full_name LIKE ?
         OR c.email LIKE ?
         OR a.account_number = ?
    `;
    params.push(cleanQ, `%${cleanQ}%`, `%${cleanQ}%`, cleanQ);
  }
  sql += ' GROUP BY c.customer_id ORDER BY c.customer_id ASC';

  const [customers] = await pool.query(sql, params);
  return res.json({
    ok: true,
    data: customers.map(c => ({
      ...c,
      pan_masked: maskPan(c.pan)
    }))
  });
}));

// =============================================================================
// 7. GET /staff/customers/:id – customer detail & their full accounts
// =============================================================================
router.get('/staff/customers/:id', asyncHandler(async (req, res) => {
  const custId = parseInt(req.params.id);
  const [[cust]] = await pool.query(
    'SELECT customer_id, full_name, email, phone, pan, dob, address, created_at FROM customer WHERE customer_id = ?',
    [custId]
  );

  if (!cust) {
    return res.status(404).json({ ok: false, message: 'Customer not found' });
  }

  const [accounts] = await pool.query(`
    SELECT a.account_id, a.account_number, a.account_type, a.balance, a.status, a.opened_on,
           b.branch_name, b.ifsc
    FROM account a
    JOIN branch b ON a.branch_id = b.branch_id
    WHERE a.customer_id = ?
    ORDER BY a.account_id ASC
  `, [custId]);

  return res.json({
    ok: true,
    data: {
      ...cust,
      pan_masked: maskPan(cust.pan),
      accounts: accounts.map(a => ({
        account_id: a.account_id,
        account_number: a.account_number, // Full account number for staff
        account_type: a.account_type,
        branch_name: a.branch_name,
        ifsc: a.ifsc,
        balance: parseFloat(a.balance).toFixed(2),
        status: a.status,
        opened_on: a.opened_on
      }))
    }
  });
}));

// =============================================================================
// 8. PATCH /staff/accounts/:id/status – freeze or unfreeze account
// =============================================================================
router.patch('/staff/accounts/:id/status', asyncHandler(async (req, res) => {
  const accountId = parseInt(req.params.id);
  const { status } = req.body;

  if (!['ACTIVE', 'FROZEN'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'Status must be ACTIVE or FROZEN' });
  }

  // Update account status only (NEVER touch balance)
  await pool.query('UPDATE account SET status = ? WHERE account_id = ?', [status, accountId]);

  return res.json({
    ok: true,
    data: {
      account_id: accountId,
      status,
      message: `Account status updated to ${status}`
    }
  });
}));

// =============================================================================
// 9. GET /staff/transactions – audit transactions with filters & summary
// =============================================================================
router.get('/staff/transactions', asyncHandler(async (req, res) => {
  const {
    account_number, type, from, to, min, max, page = 1
  } = req.query;

  let whereClauses = [];
  let params = [];

  if (account_number && account_number.trim()) {
    whereClauses.push('(fa.account_number = ? OR ta.account_number = ?)');
    params.push(account_number.trim(), account_number.trim());
  }

  if (type && type !== 'ALL') {
    whereClauses.push('t.txn_type = ?');
    params.push(type);
  }

  if (from) {
    whereClauses.push('t.created_at >= ?');
    params.push(`${from} 00:00:00`);
  }

  if (to) {
    whereClauses.push('t.created_at <= ?');
    params.push(`${to} 23:59:59`);
  }

  if (min && !isNaN(parseFloat(min))) {
    whereClauses.push('t.amount >= ?');
    params.push(parseFloat(min));
  }

  if (max && !isNaN(parseFloat(max))) {
    whereClauses.push('t.amount <= ?');
    params.push(parseFloat(max));
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Summary aggregation
  const summarySql = `
    SELECT COUNT(*) AS total_count, COALESCE(SUM(t.amount), 0) AS total_amount
    FROM txn t
    LEFT JOIN account fa ON t.from_account_id = fa.account_id
    LEFT JOIN account ta ON t.to_account_id = ta.account_id
    ${whereSql}
  `;
  const [[summary]] = await pool.query(summarySql, params);

  // Pagination (20 rows per page per spec 8.4)
  const perPage = 20;
  const currentPage = Math.max(1, parseInt(page) || 1);
  const offset = (currentPage - 1) * perPage;

  const dataSql = `
    SELECT t.txn_id, t.reference_no, t.from_account_id, t.to_account_id,
           t.amount, t.mode, t.txn_type, t.remarks, t.created_at,
           fa.account_number AS from_account_number,
           ta.account_number AS to_account_number
    FROM txn t
    LEFT JOIN account fa ON t.from_account_id = fa.account_id
    LEFT JOIN account ta ON t.to_account_id = ta.account_id
    ${whereSql}
    ORDER BY t.created_at DESC, t.txn_id DESC
    LIMIT ? OFFSET ?
  `;

  const [transactions] = await pool.query(dataSql, [...params, perPage, offset]);

  return res.json({
    ok: true,
    data: {
      transactions: transactions.map(t => ({
        ...t,
        amount: parseFloat(t.amount).toFixed(2),
        from_display: t.from_account_number || (t.txn_type === 'FD_MATURITY' ? 'FD Principal & Interest' : 'Bank'),
        to_display: t.to_account_number || (t.txn_type === 'FD_CREATE' ? 'Locked in FD' : 'Bank')
      })),
      summary: {
        count: summary.total_count,
        total_amount: parseFloat(summary.total_amount).toFixed(2)
      },
      page: currentPage,
      per_page: perPage,
      total_pages: Math.ceil((summary.total_count || 0) / perPage) || 1
    }
  });
}));

// =============================================================================
// 10. GET /staff/fd/due – active fixed deposits due for maturity
// =============================================================================
router.get('/staff/fd/due', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT fd.fd_id, fd.customer_id, fd.account_id, fd.amount, fd.rate,
           fd.tenure_months, fd.maturity_date, fd.maturity_amount,
           fd.maturity_instruction, fd.status, fd.start_date,
           c.full_name AS customer_name,
           a.account_number
    FROM fixed_deposit fd
    JOIN customer c ON fd.customer_id = c.customer_id
    JOIN account a ON fd.account_id = a.account_id
    WHERE fd.status = 'ACTIVE' AND fd.maturity_date <= CURDATE()
    ORDER BY fd.maturity_date ASC, fd.fd_id ASC
  `);

  const totalPayout = rows
    .filter(r => r.maturity_instruction === 'CREDIT')
    .reduce((sum, r) => sum + parseFloat(r.maturity_amount || 0), 0);

  return res.json({
    ok: true,
    data: {
      fds: rows,
      due_count: rows.length,
      total_payout: totalPayout.toFixed(2)
    }
  });
}));

// =============================================================================
// 11. POST /staff/fd/process-maturities – execute sp_process_maturities
// =============================================================================
async function handleProcessMaturities(req, res) {
  const empId = req.user.id;
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_process_maturities(?, @out_processed)', [empId]);
    const [[result]] = await conn.query('SELECT @out_processed AS processed_count');
    const processed = result?.processed_count || 0;

    return res.json({
      ok: true,
      data: {
        message: `Processed ${processed} fixed deposit maturities`,
        processed_count: processed
      }
    });
  } finally {
    conn.release();
  }
}

router.post('/staff/fd/process-maturities', asyncHandler(handleProcessMaturities));
router.post('/staff/fd/process', asyncHandler(handleProcessMaturities));

module.exports = router;
