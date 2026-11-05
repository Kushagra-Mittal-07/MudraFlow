// =============================================================================
// MudraFlow Backend: MySQL Connection Pool
// File: backend/db.js
//
// Configures connection pool using environment variables for production (Aiven/Vercel)
// and falls back to local defaults for local development.
// Pool is created once and reused across serverless invocations.
// =============================================================================

const mysql = require('mysql2/promise');

/**
 * Parses and formats SSL CA certificate if provided via environment variable.
 * Handles both literal line breaks and escaped "\\n" characters from web dashboards.
 */
function getSslConfig() {
  if (process.env.DB_SSL_CA) {
    const caCert = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
    return {
      ca: caCert,
      rejectUnauthorized: true
    };
  }

  // Fallback for general SSL flag without specific CA
  if (process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true') {
    return {
      rejectUnauthorized: false
    };
  }

  return undefined;
}

const poolConfig = {
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER || process.env.DB_APP_USER || 'mudraflow_app',
  password: process.env.DB_PASSWORD || process.env.DB_APP_PASSWORD || 'App@Mudra123',
  database: process.env.DB_NAME || 'mudraflow',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10),
  queueLimit: 0,
  multipleStatements: false
};

const ssl = getSslConfig();
if (ssl) {
  poolConfig.ssl = ssl;
}

// Reuse connection pool across warm serverless function invocations on Vercel
if (!global._mudraflowPool) {
  global._mudraflowPool = mysql.createPool(poolConfig);
}

const pool = global._mudraflowPool;

module.exports = pool;

