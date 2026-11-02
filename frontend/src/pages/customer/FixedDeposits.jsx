import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, CheckCircle2, ArrowRight } from 'lucide-react';
import { useActiveAccount } from '../../context/ActiveAccountContext';
import { apiRequest } from '../../lib/api';
import { formatMoney, maskAccountNumber, formatDate, formatAppRef } from '../../lib/format';
import { amountInWords } from '../../lib/amountInWords';
import AppShell from '../../components/AppShell';
import Button from '../../components/Button';
import Segmented from '../../components/Segmented';
import RadioTiles from '../../components/RadioTiles';
import Field from '../../components/Field';
import Slip from '../../components/Slip';
import Modal from '../../components/Modal';
import Banner from '../../components/Banner';
import Tag from '../../components/Tag';
import Stat from '../../components/Stat';
import Chip from '../../components/Chip';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

const TENURE_OPTIONS = [
  { months: 6, label: '6 months' },
  { months: 12, label: '1 year' },
  { months: 24, label: '2 years' },
  { months: 36, label: '3 years' },
  { months: 60, label: '5 years' }
];

export function FixedDeposits() {
  const { activeAccount, accounts, switchAccount, refreshAccounts } = useActiveAccount();

  const [activeTab, setActiveTab] = useState('deposits'); // 'deposits' | 'new'
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Open New FD Form state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState('20000');
  const [tenure, setTenure] = useState(12);
  const [instruction, setInstruction] = useState('CREDIT'); // 'CREDIT' | 'RENEW'
  const [rates, setRates] = useState({ 6: 6.5, 12: 7.0, 24: 7.25, 36: 7.5, 60: 7.75 });
  const [showBalance, setShowBalance] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Review & Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Fetch FD list
  const loadDeposits = () => {
    setLoading(true);
    apiRequest('/fd')
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          setDeposits(res.data);
        } else {
          setError(res.message || 'Failed to load fixed deposits');
        }
      })
      .catch(err => setError(err.message || 'Network error'))
      .finally(() => setLoading(false));
  };

  // Load preview rates for tenures
  useEffect(() => {
    Promise.all(
      TENURE_OPTIONS.map(opt =>
        apiRequest(`/fd/preview?amount=10000&tenure=${opt.months}`)
          .then(res => ({ months: opt.months, rate: res.data?.rate }))
          .catch(() => null)
      )
    ).then(results => {
      const rateMap = {};
      results.forEach(r => {
        if (r && r.rate) rateMap[r.months] = r.rate;
      });
      if (Object.keys(rateMap).length > 0) {
        setRates(prev => ({ ...prev, ...rateMap }));
      }
    });
  }, []);

  useEffect(() => {
    loadDeposits();
  }, []);

  // Sync selected account
  useEffect(() => {
    if (activeAccount?.account_id) {
      setSelectedAccountId(String(activeAccount.account_id));
    }
  }, [activeAccount]);

  const currentAccount = accounts.find(a => String(a.account_id) === String(selectedAccountId)) || activeAccount;
  const numAmount = parseFloat(amount) || 0;
  const currentRate = rates[tenure] || 7.0;

  // Simple interest calculation: amount * (1 + rate/100 * tenure/12)
  const maturityAmount = numAmount * (1 + (currentRate / 100) * (tenure / 12));

  // Compute maturity date
  const computeMaturityDate = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d;
  };
  const maturityDate = computeMaturityDate(tenure);

  // Stats calculation
  const activeDeposits = deposits.filter(d => d.status === 'ACTIVE');
  const lockedTotal = activeDeposits.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  const earliestMaturity = activeDeposits
    .filter(d => d.maturity_date)
    .sort((a, b) => new Date(a.maturity_date) - new Date(b.maturity_date))[0];

  const handleOpenReview = (e) => {
    e.preventDefault();
    setError('');

    if (numAmount < 1000) {
      setError('Minimum fixed deposit amount is ₹1,000.00');
      return;
    }
    if (currentAccount && numAmount > parseFloat(currentAccount.balance)) {
      setError('Insufficient balance in funding account');
      return;
    }

    setPassword('');
    setModalError('');
    setConfirmModalOpen(true);
  };

  const handleConfirmFD = async () => {
    if (!password) {
      setModalError('Please enter your account password');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const res = await apiRequest('/fd', {
        method: 'POST',
        body: {
          account_id: currentAccount.account_id,
          amount: numAmount,
          tenure_months: tenure,
          instruction,
          password
        }
      });

      if (res.ok) {
        setConfirmModalOpen(false);
        setSuccessBanner(`Fixed deposit created successfully. ₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} locked.`);
        await refreshAccounts();
        loadDeposits();
        setActiveTab('deposits');
      } else {
        setModalError(res.message || 'Failed to create fixed deposit');
      }
    } catch (err) {
      setModalError(err.message || 'Authorization failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Fixed Deposits">
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ─── STAT STRIP ──────────────────────────────────────────────── */}
        <div
          className="mf-panel"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            padding: 0,
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '20px', borderRight: '1px solid var(--line)' }}>
            <Stat
              label="TOTAL LOCKED"
              value={formatMoney(lockedTotal)}
              caption="Principal in active deposits"
            />
          </div>
          <div style={{ padding: '20px', borderRight: '1px solid var(--line)' }}>
            <Stat
              label="ACTIVE DEPOSITS"
              value={String(activeDeposits.length)}
              caption="Simple interest accumulating"
            />
          </div>
          <div style={{ padding: '20px' }}>
            <Stat
              label="NEXT MATURITY"
              value={earliestMaturity ? formatDate(earliestMaturity.maturity_date) : 'None'}
              caption={earliestMaturity ? formatMoney(earliestMaturity.maturity_amount) : 'No pending payouts'}
            />
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <Banner variant="success" onDismiss={() => setSuccessBanner('')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{successBanner}</span>
            </div>
          </Banner>
        )}

        {/* ─── NAVIGATION TABS ─────────────────────────────────────────── */}
        <div style={{ width: 'fit-content' }}>
          <Segmented
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setError('');
            }}
            options={[
              { value: 'deposits', label: `My deposits (${deposits.length})` },
              { value: 'new', label: 'Open new' }
            ]}
          />
        </div>

        {error && <Banner variant="error">{error}</Banner>}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: MY DEPOSITS TABLE                                          */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'deposits' && (
          <div className="mf-panel" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '32px 24px' }}>
                <Skeleton height="36px" width="100%" count={4} style={{ marginBottom: '10px' }} />
              </div>
            ) : deposits.length === 0 ? (
              <div style={{ padding: '48px 24px' }}>
                <EmptyState
                  title="No fixed deposits yet."
                  description="Lock money into high-yield deposits with guaranteed simple interest."
                  actionLabel="Open new deposit"
                  onAction={() => setActiveTab('new')}
                />
              </div>
            ) : (
              <div className="mf-table-container">
                <table className="mf-ledger-table">
                  <thead>
                    <tr>
                      <th scope="col">FD NO</th>
                      <th scope="col">FUNDING ACCOUNT</th>
                      <th scope="col" className="mf-text-right">PRINCIPAL</th>
                      <th scope="col">RATE</th>
                      <th scope="col">TENURE</th>
                      <th scope="col">STARTED</th>
                      <th scope="col">MATURES ON</th>
                      <th scope="col" className="mf-text-right">MATURITY AMOUNT</th>
                      <th scope="col">ON MATURITY</th>
                      <th scope="col" className="mf-text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map(d => (
                      <tr key={d.fd_id}>
                        <td className="mf-mono" style={{ fontWeight: 600 }}>
                          {formatAppRef('FD', d.fd_id)}
                        </td>
                        <td className="mf-mono">
                          {d.account_number ? maskAccountNumber(d.account_number) : '•••• •••• ••••'}
                        </td>
                        <td className="mf-text-right mf-mono" style={{ fontWeight: 600 }}>
                          {formatMoney(d.amount)}
                        </td>
                        <td className="mf-mono">{parseFloat(d.rate).toFixed(2)}%</td>
                        <td>{d.tenure_months} mos</td>
                        <td className="mf-mono">{formatDate(d.start_date)}</td>
                        <td className="mf-mono">{formatDate(d.maturity_date)}</td>
                        <td className="mf-text-right mf-mono" style={{ fontWeight: 700, color: 'var(--green-900)' }}>
                          {formatMoney(d.maturity_amount)}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {d.maturity_instruction === 'RENEW' ? 'Renew' : 'Credit to account'}
                        </td>
                        <td className="mf-text-right">
                          <Tag status={d.status}>{d.status}</Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: OPEN NEW FIXED DEPOSIT                                     */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'new' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '32px',
              alignItems: 'start'
            }}
          >
            {/* Left Column: Form (7 cols) */}
            <div className="mf-transfer-left-col">
              <form onSubmit={handleOpenReview} className="mf-panel" style={{ padding: '28px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Open a Fixed Deposit</h2>
                <p className="mf-helper" style={{ marginBottom: '24px' }}>
                  Lock surplus funds for guaranteed returns. Money is debited atomically from your funding account.
                </p>

                {/* 1. Account */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="mf-label" style={{ marginBottom: 0 }}>FUNDING ACCOUNT</span>
                    {accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setShowAccountSelector(!showAccountSelector)}
                        className="mf-btn-link"
                        style={{ fontSize: '13px' }}
                      >
                        {showAccountSelector ? 'Close' : 'Change account'}
                      </button>
                    )}
                  </div>

                  {showAccountSelector && (
                    <div style={{ marginBottom: '12px', background: 'var(--paper-2)', padding: '12px', border: '1px solid var(--line)' }}>
                      <div className="mf-label" style={{ fontSize: '11px', marginBottom: '6px' }}>SELECT DEBIT ACCOUNT:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {accounts.map(acc => (
                          <div
                            key={acc.account_id}
                            onClick={() => {
                              setSelectedAccountId(String(acc.account_id));
                              switchAccount(acc.account_id);
                              setShowAccountSelector(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: acc.account_id === currentAccount?.account_id ? 'var(--green-100)' : '#FFFFFF',
                              border: '1px solid var(--line)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{acc.account_type} · {acc.account_number_masked}</span>
                            <span className="mf-mono" style={{ fontSize: '13px' }}>{formatMoney(acc.balance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--paper-2)',
                      padding: '12px 16px',
                      border: '1px solid var(--line)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>
                        {currentAccount?.account_type || 'SAVINGS'} ACCOUNT
                      </div>
                      <div className="mf-mono" style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
                        {currentAccount?.account_number_masked || '•••• •••• ••••'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="mf-label" style={{ fontSize: '11px', marginBottom: '2px' }}>AVAILABLE</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mf-mono" style={{ fontWeight: 600 }}>
                          {showBalance ? formatMoney(currentAccount?.balance) : '₹ ••,••,•••.••'}
                        </span>
                        <Chip onClick={() => setShowBalance(!showBalance)}>
                          {showBalance ? 'Hide' : 'Show'}
                        </Chip>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Amount */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
                  <span className="mf-label" style={{ marginBottom: '8px' }}>PRINCIPAL AMOUNT</span>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '12px',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '28px',
                        color: 'var(--ink)',
                        pointerEvents: 'none'
                      }}
                    >
                      ₹
                    </span>
                    <input
                      type="number"
                      step="500"
                      min="1000"
                      className="mf-input mf-mono"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="10000"
                      style={{
                        fontSize: '28px',
                        height: '58px',
                        paddingLeft: '38px',
                        fontWeight: 700
                      }}
                      required
                    />
                  </div>
                  {numAmount > 0 && (
                    <div className="mf-helper" style={{ marginTop: '6px', fontStyle: 'italic', color: 'var(--green-900)' }}>
                      {amountInWords(numAmount)}
                    </div>
                  )}
                  <div className="mf-helper" style={{ marginTop: '4px' }}>
                    Minimum deposit ₹1,000.00
                  </div>
                </div>

                {/* 3. Tenure Tiles */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
                  <span className="mf-label" style={{ marginBottom: '8px' }}>SELECT TENURE</span>
                  <RadioTiles
                    value={tenure}
                    onChange={(val) => setTenure(Number(val))}
                    options={TENURE_OPTIONS.map(opt => ({
                      value: opt.months,
                      title: opt.label,
                      caption: `${(rates[opt.months] || 7.0).toFixed(2)}% p.a.`
                    }))}
                  />
                </div>

                {/* 4. On Maturity */}
                <div style={{ marginBottom: '28px' }}>
                  <span className="mf-label" style={{ marginBottom: '8px' }}>ON MATURITY INSTRUCTION</span>
                  <RadioTiles
                    value={instruction}
                    onChange={setInstruction}
                    options={[
                      {
                        value: 'CREDIT',
                        title: 'Credit to account',
                        caption: 'Principal + interest paid back to funding account'
                      },
                      {
                        value: 'RENEW',
                        title: 'Renew principal + interest',
                        caption: 'Auto-renew into a new term deposit at prevailing rate'
                      }
                    ]}
                  />
                </div>

                <Button variant="primary" full type="submit">
                  Lock fixed deposit →
                </Button>
              </form>
            </div>

            {/* Right Column: Sticky Certificate Slip (5 cols) */}
            <div
              className="mf-transfer-right-col"
              style={{
                position: 'sticky',
                top: '80px'
              }}
            >
              <Slip
                title="Deposit certificate"
                subtitle="Live preview · Official ledger term"
                stamp={{ text: 'PREVIEW', variant: 'gold' }}
                rows={[
                  {
                    label: 'Funding account',
                    value: `${currentAccount?.account_type || 'Savings'} ${currentAccount?.account_number_masked || '••••0001'}`
                  },
                  {
                    label: 'Principal amount',
                    value: numAmount > 0 ? formatMoney(numAmount) : '₹0.00',
                    mono: true
                  },
                  {
                    label: 'Interest rate',
                    value: `${currentRate.toFixed(2)}% p.a.`
                  },
                  {
                    label: 'Tenure',
                    value: `${tenure} months`
                  },
                  {
                    label: 'Start date',
                    value: formatDate(new Date())
                  },
                  {
                    label: 'Maturity date',
                    value: formatDate(maturityDate)
                  },
                  {
                    label: 'Instruction',
                    value: instruction === 'RENEW' ? 'Auto-renew' : 'Credit account'
                  }
                ]}
              >
                {/* Highlighted Maturity Value Callout */}
                <div
                  style={{
                    backgroundColor: 'var(--paper-2)',
                    padding: '16px',
                    margin: '16px 0',
                    border: '1px solid var(--line)',
                    textAlign: 'center'
                  }}
                >
                  <div className="mf-label" style={{ marginBottom: '4px' }}>ESTIMATED MATURITY PAYOUT</div>
                  <div
                    className="tabular-nums"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '28px',
                      fontWeight: 700,
                      color: 'var(--green-950)'
                    }}
                  >
                    {formatMoney(maturityAmount)}
                  </div>
                  <div className="mf-helper" style={{ fontStyle: 'italic', marginTop: '4px' }}>
                    {amountInWords(maturityAmount)}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--ink-2)',
                    lineHeight: '18px',
                    fontStyle: 'italic'
                  }}
                >
                  Simple interest calculated daily. Money is locked until maturity date.
                </div>
              </Slip>
            </div>
          </div>
        )}

      </div>

      {/* ─── CONFIRM FIXED DEPOSIT MODAL ─────────────────────────────── */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm fixed deposit"
        actionLabel={`Confirm & Lock ${numAmount > 0 ? formatMoney(numAmount) : ''}`}
        onAction={handleConfirmFD}
        actionLoading={submitting}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: '22px' }}>
            Lock <strong>{formatMoney(numAmount)}</strong> for <strong>{tenure} months</strong> at <strong>{currentRate.toFixed(2)}%</strong>?{' '}
            <strong>{formatMoney(maturityAmount)}</strong> will be paid on <strong>{formatDate(maturityDate)}</strong>.
          </p>

          {modalError && <Banner variant="error">{modalError}</Banner>}

          <Field
            label="Confirm with your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
      </Modal>
    </AppShell>
  );
}

export default FixedDeposits;
