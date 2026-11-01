// =============================================================================
// MudraFlow Backend: MySQL Connection Pool
// File: backend/db.js
//
// WHY: We use a connection pool (not a single connection) so multiple API
//      requests can run concurrently. Each request gets its own connection
//      from the pool and releases it when done. The pool connects as
//      mudraflow_app, which has column-level grants — it can never directly
//      UPDATE account.balance (only stored procedures running as DEFINER can).
// =============================================================================

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_APP_USER || 'mudraflow_app',
  password: process.env.DB_APP_PASSWORD,
  database: process.env.DB_NAME || 'mudraflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // WHY: Stored procedures return result-set arrays; this keeps the API simple.
  multipleStatements: false
});

module.exports = pool;

