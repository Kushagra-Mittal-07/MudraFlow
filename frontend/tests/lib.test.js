// =============================================================================
// Unit Tests for format.js and amountInWords.js
// Spec: spec/05-ui.md Section 5
// =============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { amountInWords } from '../src/lib/amountInWords.js';
import {
  formatMoney,
  splitMoney,
  formatDate,
  maskAccountNumber,
  accountInLabel,
  maskPan,
  formatTxnRef,
  formatAppRef
} from '../src/lib/format.js';

test('amountInWords - exact spec cases', () => {
  // 1. zero
  assert.equal(amountInWords(0), 'Zero rupees only');
  assert.equal(amountInWords('0'), 'Zero rupees only');

  // 2. 1 paisa
  assert.equal(amountInWords(0.01), 'One paisa only');

  // 3. 99,999
  assert.equal(
    amountInWords(99999),
    'Ninety-nine thousand nine hundred ninety-nine rupees only'
  );

  // 4. 1,00,000
  assert.equal(amountInWords(100000), 'One lakh rupees only');

  // 5. 1,00,00,000
  assert.equal(amountInWords(10000000), 'One crore rupees only');

  // 6. 12,34,56,789.50
  assert.equal(
    amountInWords(123456789.5),
    'Twelve crore thirty-four lakh fifty-six thousand seven hundred eighty-nine rupees and fifty paise'
  );

  // 7. Spec example: 124500.75 gives "One lakh twenty-four thousand five hundred rupees and seventy-five paise"
  assert.equal(
    amountInWords(124500.75),
    'One lakh twenty-four thousand five hundred rupees and seventy-five paise'
  );
});

test('formatMoney - Indian currency formatting', () => {
  assert.equal(formatMoney(0), '₹0.00');
  assert.equal(formatMoney(1000), '₹1,000.00');
  assert.equal(formatMoney(1234567.5), '₹12,34,567.50');
  assert.equal(formatMoney(50000), '₹50,000.00');
});

test('splitMoney - Big balance display', () => {
  const parts = splitMoney(1234567.5);
  assert.equal(parts.rupees, '₹12,34,567');
  assert.equal(parts.paise, '.50');
});

test('maskAccountNumber - masking', () => {
  assert.equal(maskAccountNumber('5001000001'), '•••• •••• 0001');
  assert.equal(accountInLabel('5001000001'), '••••0001');
});

test('maskPan - PAN masking', () => {
  assert.equal(maskPan('ABCDE1234F'), '••••••234F');
  assert.equal(maskPan('TESTP9999Z'), '••••••999Z');
});

test('formatDate - date formatting', () => {
  const d = new Date(2026, 9, 20); // Month 9 is Oct in JS
  assert.equal(formatDate(d), '20 Oct 2026');
});

test('formatTxnRef & formatAppRef', () => {
  const d = new Date(2026, 9, 20);
  assert.equal(formatTxnRef(123, d), 'MF20261020000123');
  assert.equal(formatAppRef('LN', 1), 'LN-0001');
  assert.equal(formatAppRef('CD', 2), 'CD-0002');
  assert.equal(formatAppRef('FD', 15), 'FD-0015');
});
