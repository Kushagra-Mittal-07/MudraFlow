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

// =============================================================================
// CORS Configuration
// Allows frontend origin, Vercel preview domains, and local dev environments
// =============================================================================
const allowedOrigins = [
  'https://mudra-flow-84bhol19y-duo-rangers.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim().replace(/\/+$/, ''));
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin requests (e.g., Postman, health checks)
    if (!origin) return callback(null, true);

    // Allow explicitly configured origins or any *.vercel.app deployment preview domain
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false // MudraFlow uses JWT Bearer tokens in headers, not session cookies
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Safeguard middleware for Vercel serverless rewrites:
// When Vercel rewrites requests to '/api' or '/server.js', restore req.url from matched path headers
app.use((req, res, next) => {
  if (req.url === '/server.js' || req.url === '/api' || req.url === '/api/') {
    const original = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri'];
    if (original && original !== '/server.js' && original !== '/api' && original !== '/api/') {
      req.url = original;
    }
  }
  next();
});

// Health check endpoints for deployment verification
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

app.get(['/', '/api'], (req, res) => {
  res.json({ ok: true, message: 'MudraFlow API is running', timestamp: new Date().toISOString() });
});

// Routes mounted under /api
app.use('/api', authRoutes);
app.use('/api', staffRoutes);
app.use('/api', customerRoutes);

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
    } else if (err.message && err.message.includes('customer.phone')) {
      msg = 'Phone number already registered';
    } else if (err.message && err.message.includes('uq_beneficiary_cust_acc')) {
      msg = 'Beneficiary already exists for this account';
    }
    return res.status(400).json({ ok: false, message: msg });
  }

  // Handle data too long for column
  if (err.code === 'ER_DATA_TOO_LONG') {
    let msg = 'Submitted value exceeds allowed column length';
    if (err.message && err.message.includes('phone')) {
      msg = 'Mobile number must be exactly 10 digits';
    } else if (err.message && err.message.includes('pan')) {
      msg = 'PAN must be exactly 10 characters';
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

// Only listen when running directly on localhost (not inside Vercel serverless functions)
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`MudraFlow API server running on port ${PORT}`);
  });
}

module.exports = app;
