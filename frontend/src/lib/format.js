// =============================================================================
// MudraFlow: Formatting Rules
// Spec: spec/05-ui.md Section 5
// =============================================================================

import { amountInWords } from './amountInWords.js';

/**
 * Format money in Indian currency format with 2 decimal places and ₹ symbol
 * Example: 1234567.5 -> "₹12,34,567.50"
 */
export function formatMoney(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0.00';
  const num = parseFloat(val);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
  return `₹${formatted}`;
}

/**
 * Splits money into rupees and paise parts for the Big Balance display
 * Example: 1234567.5 -> { rupees: "₹12,34,567", paise: ".50" }
 */
export function splitMoney(val) {
  const formatted = formatMoney(val);
  const parts = formatted.split('.');
  return {
    rupees: parts[0],
    paise: parts[1] ? `.${parts[1]}` : '.00'
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format date: "20 Oct 2026"
 */
export function formatDate(d) {
  if (!d) return '';
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date and time for receipts: "20 Oct 2026, 14:32 IST"
 */
export function formatDateTime(d) {
  if (!d) return '';
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const datePart = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${datePart}, ${hours}:${minutes} IST`;
}

/**
 * Customer ID: 8 digits
 */
export function formatCustomerId(id) {
  if (!id) return '';
  return String(id).padStart(8, '0');
}

/**
 * Account number: 10 digits
 */
export function formatAccountNumber(acc) {
  if (!acc) return '';
  return String(acc).padStart(10, '0');
}

/**
 * Masked account: "•••• •••• 0001"
 */
export function maskAccountNumber(acc) {
  if (!acc) return '•••• •••• ----';
  const str = String(acc);
  const last4 = str.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Account in a label: "••••0001"
 */
export function accountInLabel(acc) {
  if (!acc) return '••••----';
  const str = String(acc);
  const last4 = str.slice(-4);
  return `••••${last4}`;
}

/**
 * Masked PAN: first 6 hidden: "••••••234F"
 */
export function maskPan(pan) {
  if (!pan) return '••••••••••';
  const str = String(pan).toUpperCase();
  if (str.length < 4) return '••••••';
  return `••••••${str.slice(-4)}`;
}

/**
 * IFSC: "MUDF" + 7 digits (e.g. MUDF0000482)
 */
export function formatIfsc(ifsc) {
  return String(ifsc || '').toUpperCase();
}

/**
 * Transaction reference: "MF" + YYYYMMDD + 6-digit id
 */
export function formatTxnRef(id, date = new Date()) {
  const d = (date instanceof Date) ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const idStr = String(id).padStart(6, '0');
  return `MF${yyyy}${mm}${dd}${idStr}`;
}

/**
 * Application references: prefix + 4-digit id (e.g. LN-0001, CD-0001, CB-0001, FD-0001)
 */
export function formatAppRef(prefix, id) {
  return `${prefix}-${String(id).padStart(4, '0')}`;
}

export { amountInWords };

