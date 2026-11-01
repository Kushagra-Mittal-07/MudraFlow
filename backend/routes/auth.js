// =============================================================================
// MudraFlow Backend: Auth Routes
// File: backend/routes/auth.js
//
// POST /api/auth/register  — Register a new customer [otp]
// POST /api/auth/login     — Customer login with lockout
// POST /api/staff/auth/login — Staff login
// =============================================================================

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { asyncHandler, maskAccountNumber } = require('../helpers');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mudraflow_demo_jwt_secret_change_in_prod';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h';

// =============================================================================
// POST /auth/register  [otp]
// =============================================================================
router.post('/auth/register', asyncHandler(async (req, res) => {
  const {
    full_name, dob, email, phone, pan, address,
    account_type, branch_id, opening_amount, password, otp
  } = req.body;

  // OTP check — demo OTP is always 123456
  if (!otp || String(otp) !== '123456') {
    return res.status(400).json({ ok: false, message: 'Invalid OTP' });
  }

  // Hash the password with bcrypt
  const passwordHash = await bcrypt.hash(password, 10);

  // Call the stored procedure
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `CALL sp_register_customer(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @out_cid, @out_acc)`,
      [full_name, dob, email, phone, pan, address, passwordHash, account_type, branch_id, opening_amount]
    );
    const [[result]] = await conn.query('SELECT @out_cid AS customer_id, @out_acc AS account_number');

    // Look up branch info for the receipt
    const [[branchInfo]] = await conn.query(
      `SELECT b.branch_name, b.ifsc FROM account a JOIN branch b ON a.branch_id = b.branch_id
       WHERE a.account_number = ?`,
      [result.account_number]
    );

    return res.status(201).json({
      ok: true,
      data: {
        customer_id: result.customer_id,
        account_number: result.account_number, // Full number on registration receipt only
        branch_name: branchInfo.branch_name,
        ifsc: branchInfo.ifsc,
        opening_balance: parseFloat(opening_amount).toFixed(2)
      }
    });
  } finally {
    conn.release();
  }
}));

// =============================================================================
// POST /auth/login
// Lockout logic: 5 wrong attempts → locked_until = NOW()+10min, counter reset
// =============================================================================
router.post('/auth/login', asyncHandler(async (req, res) => {
  const { customer_id, password } = req.body;

  if (!customer_id || !password) {
    return res.status(400).json({ ok: false, message: 'customer_id and password are required' });
  }

  // Fetch customer row
  const [[customer]] = await pool.query(
    `SELECT customer_id, full_name, password_hash, failed_attempts, locked_until FROM customer WHERE customer_id = ?`,
    [customer_id]
  );

  if (!customer) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  // Check if currently locked
  if (customer.locked_until && new Date(customer.locked_until) > new Date()) {
    const remaining = Math.ceil((new Date(customer.locked_until) - new Date()) / 1000);
    const mins = Math.ceil(remaining / 60);
    return res.status(403).json({
      ok: false,
      message: `Account is locked. Try again in ${mins} minute(s).`,
      locked_until: customer.locked_until,
      remaining_seconds: remaining
    });
  }

  // If lock expired, clear it
  if (customer.locked_until && new Date(customer.locked_until) <= new Date()) {
    await pool.query(
      `UPDATE customer SET locked_until = NULL, failed_attempts = 0 WHERE customer_id = ?`,
      [customer_id]
    );
    customer.failed_attempts = 0;
    customer.locked_until = null;
  }

  // Compare passwords
  const match = await bcrypt.compare(password, customer.password_hash);

  if (!match) {
    // Increment failed_attempts
    let newAttempts = customer.failed_attempts + 1;

    if (newAttempts >= 5) {
      // Lock for 10 minutes, reset counter
      await pool.query(
        `UPDATE customer SET failed_attempts = 0, locked_until = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
         WHERE customer_id = ?`,
        [customer_id]
      );
      return res.status(403).json({
        ok: false,
        message: 'Account locked for 10 minutes due to too many failed attempts.',
        remaining_attempts: 0
      });
    } else {
      await pool.query(
        `UPDATE customer SET failed_attempts = ? WHERE customer_id = ?`,
        [newAttempts, customer_id]
      );
      return res.status(401).json({
        ok: false,
        message: 'Invalid credentials',
        remaining_attempts: 5 - newAttempts
      });
    }
  }

  // Successful login: reset failed_attempts and clear lock
  await pool.query(
    `UPDATE customer SET failed_attempts = 0, locked_until = NULL WHERE customer_id = ?`,
    [customer_id]
  );

  const token = jwt.sign(
    { id: customer.customer_id, role: 'customer' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  return res.json({
    ok: true,
    data: {
      token,
      customer_id: customer.customer_id,
      full_name: customer.full_name
    }
  });
}));

// =============================================================================
// POST /staff/auth/login
// =============================================================================
router.post('/staff/auth/login', asyncHandler(async (req, res) => {
  const { emp_id, password } = req.body;

  if (!emp_id || !password) {
    return res.status(400).json({ ok: false, message: 'emp_id and password are required' });
  }

  const [[employee]] = await pool.query(
    `SELECT emp_id, password_hash, role, branch_id FROM employee WHERE emp_id = ?`,
    [emp_id]
  );

  if (!employee) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, employee.password_hash);
  if (!match) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: employee.emp_id, role: 'staff', emp_role: employee.role, branch_id: employee.branch_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  return res.json({
    ok: true,
    data: { token, emp_id: employee.emp_id, role: employee.role }
  });
}));

module.exports = router;

