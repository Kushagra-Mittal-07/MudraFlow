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

module.exports = router;
