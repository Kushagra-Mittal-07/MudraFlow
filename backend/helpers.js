// =============================================================================
// MudraFlow Backend: Shared Helpers
// File: backend/helpers.js
//
// Utility functions used across routes: masking, formatting, ownership checks.
// =============================================================================

/**
 * Mask an account number: "5001000004" → "•••• •••• 0004"
 */
function maskAccountNumber(accNum) {
  if (!accNum) return null;
  const s = String(accNum);
  const last4 = s.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Get last 4 digits of an account number.
 */
function last4(accNum) {
  if (!accNum) return null;
  return String(accNum).slice(-4);
}

/**
 * Mask PAN: "ABCPS1234A" → "••••••234A"
 * First 6 chars hidden, last 4 shown.
 */
function maskPan(pan) {
  if (!pan) return null;
  return '••••••' + pan.slice(-4);
}

/**
 * Build a description string for a transaction row.
 * Used by history and dashboard endpoints.
 */
function buildDescription(row) {
  switch (row.txn_type) {
    case 'OPENING_DEPOSIT':
      return 'Opening deposit';
    case 'TRANSFER': {
      // Determine direction relative to the account we are looking at
      // The caller sets row._perspective_account_id to know direction
      const perspectiveId = row._perspective_account_id;
      if (row.from_account_id === perspectiveId) {
        // Debit: sent money
        const toMasked = row.to_account_number
          ? maskAccountNumber(row.to_account_number)
          : '••••';
        const remarksPart = row.remarks ? ` · ${row.remarks}` : '';
        return `Transfer to ${toMasked}${remarksPart}`;
      } else {
        // Credit: received money
        const fromMasked = row.from_account_number
          ? maskAccountNumber(row.from_account_number)
          : '••••';
        const remarksPart = row.remarks ? ` · ${row.remarks}` : '';
        return `Transfer from ${fromMasked}${remarksPart}`;
      }
    }
    case 'FD_CREATE':
      return 'Fixed deposit created';
    case 'FD_MATURITY':
      return 'Fixed deposit matured';
    case 'LOAN_CREDIT':
      return 'Loan credited';
    default:
      return row.txn_type;
  }
}

/**
 * Wrap an async Express route handler to catch errors and forward them
 * to the Express error handler.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  maskAccountNumber,
  last4,
  maskPan,
  buildDescription,
  asyncHandler
};

