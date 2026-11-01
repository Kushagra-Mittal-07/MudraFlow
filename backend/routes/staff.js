// =============================================================================
// MudraFlow Backend: Staff Routes
// File: backend/routes/staff.js
// =============================================================================

const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../helpers');

const router = express.Router();

// Staff authentication required for all /staff routes
router.use('/staff', requireAuth('staff'));

// =============================================================================
// POST /staff/loans/:id/decision  (needed for E10 test)
// =============================================================================
router.post('/staff/loans/:id/decision', asyncHandler(async (req, res) => {
  const loanId = parseInt(req.params.id);
  const { decision } = req.body;
  const empId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_approve_loan(?, ?, ?)', [loanId, empId, decision]);
    return res.json({ ok: true, data: { message: `Loan ${decision.toLowerCase()}` } });
  } finally {
    conn.release();
  }
}));

// =============================================================================
// PATCH /staff/accounts/:id/status  (needed for E9 test)
// =============================================================================
router.patch('/staff/accounts/:id/status', asyncHandler(async (req, res) => {
  const accountId = parseInt(req.params.id);
  const { status } = req.body;

  if (!['ACTIVE', 'FROZEN'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'Status must be ACTIVE or FROZEN' });
  }

  await pool.query('UPDATE account SET status = ? WHERE account_id = ?', [status, accountId]);

  return res.json({ ok: true, data: { message: `Account status updated to ${status}` } });
}));

// =============================================================================
// GET /staff/overview – aggregated stats for staff dashboard
// =============================================================================
router.get('/staff/overview', asyncHandler(async (req, res) => {
  // Total customers
  const [[custStats]] = await pool.query('SELECT COUNT(*) AS total_customers FROM customer');
  // Total accounts
  const [[acctStats]] = await pool.query('SELECT COUNT(*) AS total_accounts FROM account');
  // Total balance across all accounts
  const [[balStats]] = await pool.query('SELECT COALESCE(SUM(balance),0) AS total_balance FROM account');
  // Transactions today
  const [[txnStats]] = await pool.query(`SELECT COUNT(*) AS transactions_today FROM txn WHERE DATE(created_at) = CURDATE()`);
  // Pending approvals: pending loans + pending service_requests
  const [[pendStats]] = await pool.query(`SELECT (
    SELECT COUNT(*) FROM loan WHERE status = 'PENDING'
  ) + (
    SELECT COUNT(*) FROM service_request WHERE status = 'REQUESTED'
  ) AS pending_approvals`);

  return res.json({
    ok: true,
    data: {
      total_customers: custStats.total_customers,
      total_accounts: acctStats.total_accounts,
      total_balance: parseFloat(balStats.total_balance).toFixed(2),
      transactions_today: txnStats.transactions_today,
      pending_approvals: pendStats.pending_approvals
    }
  });
}));

// =============================================================================
// GET /staff/loans – list all loans (optional status filter)
// =============================================================================
router.get('/staff/loans', asyncHandler(async (req, res) => {
  const { status } = req.query; // e.g., PENDING, APPROVED, REJECTED
  let sql = `SELECT loan_id, customer_id, amount, interest_rate, tenure_months, status, applied_on FROM loan`;
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  const [loans] = await pool.query(sql, params);
  return res.json({ ok: true, data: loans });
}));

// =============================================================================
// GET /staff/services – list service requests (optional status filter)
// =============================================================================
router.get('/staff/services', asyncHandler(async (req, res) => {
  const { status } = req.query; // REQUESTED, ACTIVE, REJECTED
  let sql = `SELECT service_id, customer_id, service_type, status, applied_on FROM service_request`;
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  const [services] = await pool.query(sql, params);
  return res.json({ ok: true, data: services });
}));

// =============================================================================
// POST /staff/services/:id/decision – approve/reject service request
// =============================================================================
router.post('/staff/services/:id/decision', asyncHandler(async (req, res) => {
  const serviceId = parseInt(req.params.id);
  const { decision, remarks } = req.body; // decision: APPROVED or REJECTED
  const empId = req.user.id;
  // Call stored procedure sp_decide_service_request(service_id, employee_id, decision, remarks)
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_decide_service_request(?, ?, ?, ?)', [serviceId, empId, decision, remarks || null]);
    return res.json({ ok: true, data: { message: `Service request ${decision.toLowerCase()}` } });
  } finally {
    conn.release();
  }
}));

// =============================================================================
// GET /staff/customers – search customers (by id, name, or account number)
// =============================================================================
router.get('/staff/customers', asyncHandler(async (req, res) => {
  const { q } = req.query; // free text search
  let sql = `SELECT c.customer_id, c.full_name, c.email, c.phone, c.pan, c.dob, c.address`
    + ` FROM customer c`;
  const params = [];
  if (q) {
    sql += ` WHERE c.customer_id = ? OR c.full_name LIKE ? OR c.email LIKE ?`;
    params.push(q, `%${q}%`, `%${q}%`);
    // also search by account number (full)
    sql = `SELECT DISTINCT c.customer_id, c.full_name, c.email, c.phone, c.pan, c.dob, c.address`
      + ` FROM customer c LEFT JOIN account a ON c.customer_id = a.customer_id`
      + ` WHERE c.customer_id = ? OR c.full_name LIKE ? OR c.email LIKE ? OR a.account_number = ?`;
    params.push(q);
  }
  const [customers] = await pool.query(sql, params);
  return res.json({ ok: true, data: customers });
}));

// =============================================================================
// GET /staff/customers/:id – full customer detail (including full account numbers)
// =============================================================================
router.get('/staff/customers/:id', asyncHandler(async (req, res) => {
  const custId = parseInt(req.params.id);
  const [[cust]] = await pool.query('SELECT customer_id, full_name, email, phone, pan, dob, address FROM customer WHERE customer_id = ?', [custId]);
  if (!cust) {
    return res.status(404).json({ ok: false, message: 'Customer not found' });
  }
  const [accounts] = await pool.query('SELECT account_id, account_number, account_type, balance, status FROM account WHERE customer_id = ?', [custId]);
  return res.json({ ok: true, data: { ...cust, accounts } });
}));

// =============================================================================
// GET /staff/transactions – list transactions with flexible filters
// =============================================================================
router.get('/staff/transactions', asyncHandler(async (req, res) => {
  const { account_number, type, start_date, end_date, min_amount, max_amount } = req.query;
  let sql = `SELECT t.txn_id, t.reference_no, t.from_account_id, t.to_account_id, t.amount, t.mode, t.txn_type, t.remarks, t.created_at,
    fa.account_number AS from_account_number, ta.account_number AS to_account_number`
    + ` FROM txn t`
    + ` LEFT JOIN account fa ON t.from_account_id = fa.account_id`
    + ` LEFT JOIN account ta ON t.to_account_id = ta.account_id`;
  const conditions = [];
  const params = [];
  if (account_number) {
    conditions.push('(fa.account_number = ? OR ta.account_number = ?)');
    params.push(account_number, account_number);
  }
  if (type) {
    conditions.push('t.txn_type = ?');
    params.push(type);
  }
  if (start_date) {
    conditions.push('t.created_at >= ?');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('t.created_at <= ?');
    params.push(end_date);
  }
  if (min_amount) {
    conditions.push('t.amount >= ?');
    params.push(min_amount);
  }
  if (max_amount) {
    conditions.push('t.amount <= ?');
    params.push(max_amount);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY t.created_at DESC LIMIT 100'; // limit for safety
  const [txns] = await pool.query(sql, params);
  return res.json({ ok: true, data: txns });
}));

// =============================================================================
// GET /staff/fd/due – list active fixed deposits that have matured or will mature today
// =============================================================================
router.get('/staff/fd/due', asyncHandler(async (req, res) => {
  const [fdList] = await pool.query(`SELECT fd_id, customer_id, amount, interest_rate, tenure_months, maturity_date, status
    FROM fixed_deposit WHERE status = 'ACTIVE' AND maturity_date <= CURDATE()`);
  return res.json({ ok: true, data: fdList });
}));

// =============================================================================
// POST /staff/fd/process – process maturities (calls sp_process_maturities)
// =============================================================================
router.post('/staff/fd/process', asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [[result]] = await conn.query('CALL sp_process_maturities()');
    // Assume the procedure returns a result set with processed count
    const processed = result?.processed || result?.[0]?.processed || null;
    return res.json({ ok: true, data: { message: 'Maturities processed', processed } });
  } finally {
    conn.release();
  }
}));

module.exports = router;

module.exports = router;