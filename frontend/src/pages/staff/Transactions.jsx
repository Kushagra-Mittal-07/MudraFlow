import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Field from '../../components/Field';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import Pagination from '../../components/Pagination';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { apiRequest } from '../../lib/api';
import { formatMoney, formatDate, formatTxnRef } from '../../lib/format';
import { Filter, RotateCcw, ArrowUpDown } from 'lucide-react';

const TXN_TYPES = [
  { value: 'ALL', label: 'All types' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OPENING_DEPOSIT', label: 'Opening deposit' },
  { value: 'FD_CREATE', label: 'Fixed deposit lock' },
  { value: 'FD_MATURITY', label: 'Fixed deposit payout' },
  { value: 'LOAN_CREDIT', label: 'Loan disbursement' }
];

export function StaffTransactions() {
  // Form filter inputs
  const [accountNumber, setAccountNumber] = useState('');
  const [type, setType] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Applied query filters
  const [appliedFilters, setAppliedFilters] = useState({
    account_number: '',
    type: 'ALL',
    from: '',
    to: '',
    min: '',
    max: '',
    page: 1
  });

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ count: 0, total_amount: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedFilters.account_number) params.append('account_number', appliedFilters.account_number);
      if (appliedFilters.type && appliedFilters.type !== 'ALL') params.append('type', appliedFilters.type);
      if (appliedFilters.from) params.append('from', appliedFilters.from);
      if (appliedFilters.to) params.append('to', appliedFilters.to);
      if (appliedFilters.min) params.append('min', appliedFilters.min);
      if (appliedFilters.max) params.append('max', appliedFilters.max);
      params.append('page', String(appliedFilters.page));

      const res = await apiRequest(`/staff/transactions?${params.toString()}`);
      if (res.ok && res.data) {
        setTransactions(res.data.transactions || []);
        setSummary(res.data.summary || { count: 0, total_amount: 0 });
        setPage(res.data.page || 1);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [appliedFilters]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setAppliedFilters({
      account_number: accountNumber.trim(),
      type,
      from: fromDate,
      to: toDate,
      min: minAmount,
      max: maxAmount,
      page: 1
    });
  };

  const handleResetFilters = () => {
    setAccountNumber('');
    setType('ALL');
    setFromDate('');
    setToDate('');
    setMinAmount('');
    setMaxAmount('');
    setAppliedFilters({
      account_number: '',
      type: 'ALL',
      from: '',
      to: '',
      min: '',
      max: '',
      page: 1
    });
  };

  const handlePageChange = (newPage) => {
    setAppliedFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <AppShell title="Audit Transactions">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ─── FILTER TOOLBAR ────────────────────────────────────────── */}
        <div className="mf-panel" style={{ padding: '20px' }}>
          <form onSubmit={handleApplyFilters}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                alignItems: 'end'
              }}
            >
              <Field
                label="Account Number"
                placeholder="e.g. 5001000001"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />

              <Field
                label="Transaction Type"
                type="select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={TXN_TYPES}
              />

              <Field
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />

              <Field
                label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />

              <Field
                label="Min Amount (₹)"
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />

              <Field
                label="Max Amount (₹)"
                type="number"
                placeholder="1000000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <Button
                type="button"
                variant="secondary"
                icon={<RotateCcw size={14} />}
                onClick={handleResetFilters}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={<Filter size={14} />}
              >
                Apply
              </Button>
            </div>
          </form>
        </div>

        {/* ─── SUMMARY BAND ──────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: 'var(--paper-2)',
            border: '1px solid var(--line)',
            fontSize: '14px'
          }}
        >
          <div>
            <strong>{summary.count}</strong> transactions found
          </div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>
            Total: <strong>{formatMoney(summary.total_amount)}</strong>
          </div>
        </div>

        {/* ─── TRANSACTIONS TABLE ────────────────────────────────────── */}
        <div className="mf-panel" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '24px' }}>
              <Skeleton height="36px" width="100%" count={6} style={{ marginBottom: '8px' }} />
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '48px 24px' }}>
              <EmptyState
                title="No transactions match filters."
                description="Try clearing or broadening your search criteria."
                actionLabel="Reset filters"
                onAction={handleResetFilters}
              />
            </div>
          ) : (
            <div className="mf-table-container">
              <table className="mf-ledger-table mf-ledger-dense">
                <thead>
                  <tr>
                    <th scope="col">REFERENCE</th>
                    <th scope="col">DATE AND TIME</th>
                    <th scope="col">TYPE</th>
                    <th scope="col">FROM</th>
                    <th scope="col">TO</th>
                    <th scope="col">MODE</th>
                    <th scope="col" style={{ textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.txn_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {formatTxnRef(t.reference_no || t.txn_id)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                        {formatDate(t.created_at, true)}
                      </td>
                      <td>
                        <Tag variant="neutral">{t.txn_type}</Tag>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {t.from_display || t.from_account_number || 'Bank'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {t.to_display || t.to_account_number || 'Bank'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {t.mode || 'INTERNAL'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatMoney(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default StaffTransactions;

