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

const poolConfig = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false
};

// Support both individual environment variables and standard connection URIs (DATABASE_URL)
if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
  const uri = process.env.DATABASE_URL || process.env.MYSQL_URL;
  Object.assign(poolConfig, { uri });
} else {
  Object.assign(poolConfig, {
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_APP_USER || process.env.DB_USER || 'mudraflow_app',
    password: process.env.DB_APP_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mudraflow'
  });
}

// Support SSL connections for managed cloud databases (Aiven, PlanetScale, AWS RDS, TiDB, Railway)
if (process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = poolConfig.uri ? mysql.createPool(poolConfig.uri) : mysql.createPool(poolConfig);

module.exports = pool;

