import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, RotateCcw, Printer, FileText } from 'lucide-react';
import { useActiveAccount } from '../../context/ActiveAccountContext';
import { apiRequest } from '../../lib/api';
import { formatMoney, formatDate, maskAccountNumber } from '../../lib/format';
import AppShell from '../../components/AppShell';
import LedgerTable from '../../components/LedgerTable';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import Pagination from '../../components/Pagination';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

export function History() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeAccount, accounts } = useActiveAccount();

  // Active account fallback ID
  const selectedAccountId = searchParams.get('account_id') || activeAccount?.account_id || '';

  // Filter form states
  const [accountId, setAccountId] = useState(String(selectedAccountId));
  const [fromDate, setFromDate] = useState(searchParams.get('from') || '');
  const [toDate, setToDate] = useState(searchParams.get('to') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [minAmount, setMinAmount] = useState(searchParams.get('min') || '');
  const [maxAmount, setMaxAmount] = useState(searchParams.get('max') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Data states
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ count: 0, money_in: '0.00', money_out: '0.00' });
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sync accountId if activeAccount loads later
  useEffect(() => {
    if (!accountId && activeAccount?.account_id) {
      setAccountId(String(activeAccount.account_id));
    }
  }, [activeAccount, accountId]);

  // Fetch transaction history
  const fetchHistory = (pageToFetch = currentPage) => {
    if (!accountId) return;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    params.set('account_id', accountId);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    if (type) params.set('type', type);
    if (minAmount) params.set('min', minAmount);
    if (maxAmount) params.set('max', maxAmount);
    params.set('page', String(pageToFetch));

    apiRequest(`/transactions?${params.toString()}`)
      .then(res => {
        if (res.ok && res.data) {
          const rows = res.data.transactions || res.data.rows || [];
          setTransactions(rows);
          if (res.data.summary) {
            setSummary(res.data.summary);
            const totalCount = res.data.summary.count || 0;
            setTotalPages(Math.ceil(totalCount / (res.data.per_page || 20)) || 1);
          }
          if (res.data.page) {
            setCurrentPage(res.data.page);
          }
        } else {
          setError(res.message || 'Failed to load transaction history');
        }
      })
      .catch(err => {
        setError(err.message || 'Network error fetching transactions');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (accountId) {
      fetchHistory(currentPage);
    }
  }, [accountId, currentPage]);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchHistory(1);
  };

  const handleResetFilters = () => {
    const defaultAcc = String(activeAccount?.account_id || (accounts[0]?.account_id || ''));
    setAccountId(defaultAcc);
    setFromDate('');
    setToDate('');
    setType('');
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);

    // Re-fetch with clean filters
    setLoading(true);
    apiRequest(`/transactions?account_id=${defaultAcc}&page=1`)
      .then(res => {
        if (res.ok && res.data) {
          const rows = res.data.transactions || res.data.rows || [];
          setTransactions(rows);
          if (res.data.summary) {
            setSummary(res.data.summary);
            const totalCount = res.data.summary.count || 0;
            setTotalPages(Math.ceil(totalCount / (res.data.per_page || 20)) || 1);
          }
          setCurrentPage(1);
        }
      })
      .finally(() => setLoading(false));
  };

  const currentAccountObj = accounts.find(a => String(a.account_id) === String(accountId)) || activeAccount;

  // Format transactions for LedgerTable
  const ledgerEntries = transactions.map(t => {
    const isCredit = t.direction ? t.direction === 'credit' : parseFloat(t.signed_amount) > 0;
    const isDebit = t.direction ? t.direction === 'debit' : parseFloat(t.signed_amount) < 0;
    return {
      id: t.txn_id,
      date: t.created_at,
      description: t.description || t.remarks || t.txn_type,
      debit: isDebit ? Math.abs(parseFloat(t.amount)) : null,
      credit: isCredit ? parseFloat(t.amount) : null,
      balance: parseFloat(t.balance_after),
      receiptLink: `/app/receipt/${t.reference_no}`
    };
  });

  return (
    <AppShell title="Transaction History">
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ─── PRINT STATEMENT HEADER (visible only during print) ─────── */}
        <div className="mf-print-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', margin: 0 }}>MudraFlow Bank Ltd.</h1>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', marginTop: '4px' }}>
                Account Statement · {currentAccountObj?.account_type || 'ACCOUNT'} {currentAccountObj?.account_number_masked || ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <div>Period: {fromDate || 'Beginning'} to {toDate || 'Today'}</div>
              <div>Generated: {formatDate(new Date(), { includeTime: true })}</div>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', borderTop: '1px solid #CCCCCC', paddingTop: '8px' }}>
            Total Entries: <strong>{summary.count}</strong> · Total In: <strong>{formatMoney(summary.money_in)}</strong> · Total Out: <strong>{formatMoney(summary.money_out)}</strong>
          </div>
        </div>

        {/* ─── FILTER TOOLBAR (hidden on print) ────────────────────────── */}
        <div className="mf-panel no-print" style={{ padding: '16px 20px' }}>
          <form
            onSubmit={handleApplyFilters}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'flex-end'
            }}
          >
            {/* Account Selector */}
            <div style={{ minWidth: '180px', flex: 1 }}>
              <label className="mf-label" htmlFor="filter-account" style={{ marginBottom: '4px' }}>ACCOUNT</label>
              <select
                id="filter-account"
                className="mf-input"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map(a => (
                  <option key={a.account_id} value={String(a.account_id)}>
                    {a.account_type} · {a.account_number_masked}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div style={{ width: '135px' }}>
              <label className="mf-label" htmlFor="filter-from" style={{ marginBottom: '4px' }}>FROM</label>
              <input
                id="filter-from"
                type="date"
                className="mf-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* To Date */}
            <div style={{ width: '135px' }}>
              <label className="mf-label" htmlFor="filter-to" style={{ marginBottom: '4px' }}>TO</label>
              <input
                id="filter-to"
                type="date"
                className="mf-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* Type */}
            <div style={{ width: '160px' }}>
              <label className="mf-label" htmlFor="filter-type" style={{ marginBottom: '4px' }}>TYPE</label>
              <select
                id="filter-type"
                className="mf-input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">All Transactions</option>
                <option value="TRANSFER">Transfer</option>
                <option value="OPENING_DEPOSIT">Opening Deposit</option>
                <option value="FD_CREATED">FD Created</option>
                <option value="FD_MATURED">FD Matured</option>
                <option value="LOAN_CREDITED">Loan Credited</option>
              </select>
            </div>

            {/* Min Amount */}
            <div style={{ width: '110px' }}>
              <label className="mf-label" htmlFor="filter-min" style={{ marginBottom: '4px' }}>MIN (₹)</label>
              <input
                id="filter-min"
                type="number"
                placeholder="Min"
                className="mf-input mf-mono"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            {/* Max Amount */}
            <div style={{ width: '110px' }}>
              <label className="mf-label" htmlFor="filter-max" style={{ marginBottom: '4px' }}>MAX (₹)</label>
              <input
                id="filter-max"
                type="number"
                placeholder="Max"
                className="mf-input mf-mono"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="primary" type="submit">
                <Filter size={15} /> Apply
              </Button>
              <Button variant="secondary" type="button" onClick={handleResetFilters}>
                <RotateCcw size={15} /> Reset
              </Button>
            </div>
          </form>
        </div>

        {/* ─── SUMMARY BAND ────────────────────────────────────────────── */}
        <div
          className="mf-panel"
          style={{
            backgroundColor: 'var(--paper-2)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
              {summary.count} ENTRIES
            </span>
            <span style={{ color: 'var(--line-strong)' }}>·</span>
            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
              Money in: <strong style={{ color: 'var(--credit)', fontFamily: 'var(--font-mono)' }}>+{formatMoney(summary.money_in)}</strong>
            </span>
            <span style={{ color: 'var(--line-strong)' }}>·</span>
            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
              Money out: <strong style={{ color: 'var(--debit)', fontFamily: 'var(--font-mono)' }}>−{formatMoney(summary.money_out)}</strong>
            </span>
          </div>

          <div className="no-print">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={15} /> Print statement
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && <Banner variant="error">{error}</Banner>}

        {/* ─── LEDGER TABLE & PAGINATION ──────────────────────────────── */}
        <div className="mf-panel" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '32px 24px' }}>
              <Skeleton height="36px" width="100%" count={6} style={{ marginBottom: '10px' }} />
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '40px 24px' }}>
              <EmptyState
                title="No entries match these filters."
                description="Try clearing or broadening your search criteria."
                actionLabel="Reset filters"
                onAction={handleResetFilters}
              />
            </div>
          ) : (
            <div>
              <LedgerTable
                entries={ledgerEntries}
                footer={
                  totalPages > 1 ? (
                    <div className="no-print" style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(p) => setCurrentPage(p)}
                      />
                    </div>
                  ) : null
                }
              />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default History;
