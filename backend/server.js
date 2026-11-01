// =============================================================================
// MudraFlow Backend: Express Server
// File: backend/server.js
// =============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const staffRoutes = require('./routes/staff');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes mounted under /api
app.use('/api', authRoutes);
app.use('/api', staffRoutes);
app.use('/api', customerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, message: 'Endpoint not found' });
});

// Centralized Error Handling Middleware
// - Passes stored procedure / trigger SIGNAL messages through cleanly
// - Suppresses raw SQL errors, stack traces, and internal DB details
app.use((err, req, res, next) => {
  // Check for MySQL 45000 custom SIGNAL error from stored procedures or triggers
  if (err.sqlState === '45000') {
    let cleanMessage = err.message || 'Operation rejected by database rule';
    // Clean mysql2 error prefixes if present
    cleanMessage = cleanMessage.replace(/^ER_SIGNAL_EXCEPTION:\s*/i, '');
    return res.status(400).json({ ok: false, message: cleanMessage });
  }

  // Handle unique constraint violations
  if (err.code === 'ER_DUP_ENTRY') {
    let msg = 'Duplicate entry detected';
    if (err.message && err.message.includes('customer.email')) {
      msg = 'Email already registered';
    } else if (err.message && err.message.includes('customer.pan')) {
      msg = 'PAN already registered';
    } else if (err.message && err.message.includes('uq_beneficiary_cust_acc')) {
      msg = 'Beneficiary already exists for this account';
    }
    return res.status(400).json({ ok: false, message: msg });
  }

  // Handle foreign key constraint failure
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ ok: false, message: 'Invalid reference or related record dependency' });
  }

  // Access denied / permission error from MySQL user
  if (err.code === 'ER_TABLEACCESS_DENIED_ERROR' || err.code === 'ER_COLUMNACCESS_DENIED_ERROR') {
    return res.status(403).json({ ok: false, message: 'Database operation not permitted' });
  }

  // General fallback - never leak raw SQL query or internal stack to client
  console.error('[Unhandled Error]', err);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  return res.status(status).json({ ok: false, message });
});

// Only listen if not imported by test runner
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MudraFlow API server running on port ${PORT}`);
  });
}

module.exports = app;
