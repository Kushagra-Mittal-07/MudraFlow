import React, { useState, useEffect } from 'react';
import { CreditCard, BookOpen, Landmark, Copy, Check, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useActiveAccount } from '../../context/ActiveAccountContext';
import { apiRequest } from '../../lib/api';
import { formatMoney, maskAccountNumber, formatDate, formatAppRef } from '../../lib/format';
import { amountInWords } from '../../lib/amountInWords';
import AppShell from '../../components/AppShell';
import Button from '../../components/Button';
import Drawer from '../../components/Drawer';
import Field from '../../components/Field';
import RadioTiles from '../../components/RadioTiles';
import Tag from '../../components/Tag';
import Chip from '../../components/Chip';
import Banner from '../../components/Banner';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

const LOAN_PURPOSES = ['Education', 'Home', 'Vehicle', 'Personal', 'Business', 'Other'];
const LOAN_DURATIONS = [6, 12, 24, 36, 48, 60];
const EMPLOYMENT_STATUSES = ['Salaried', 'Self-Employed', 'Business', 'Student', 'Other'];

export function Services() {
  const { activeAccount, accounts } = useActiveAccount();

  const [applications, setApplications] = useState([]);
  const [approvedCards, setApprovedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'LOAN' | 'DEBIT_CARD' | 'CHEQUE_BOOK'
  const [successBanner, setSuccessBanner] = useState('');
  const [error, setError] = useState('');

  // ─── DEBIT CARD DRAWER STATE ──────────────────────────────────────────
  const [cardDrawerOpen, setCardDrawerOpen] = useState(false);
  const [cardAccountId, setCardAccountId] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [network, setNetwork] = useState('Visa');
  const [cardAddress, setCardAddress] = useState('');
  const [cardPassword, setCardPassword] = useState('');
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState('');

  // ─── CHEQUE BOOK DRAWER STATE ─────────────────────────────────────────
  const [chequeDrawerOpen, setChequeDrawerOpen] = useState(false);
  const [chequeAccountId, setChequeAccountId] = useState('');
  const [leaves, setLeaves] = useState(25);
  const [chequeAddress, setChequeAddress] = useState('');
  const [chequePassword, setChequePassword] = useState('');
  const [chequeLoading, setChequeLoading] = useState(false);
  const [chequeError, setChequeError] = useState('');

  // ─── LOAN DRAWER STATE ────────────────────────────────────────────────
  const [loanDrawerOpen, setLoanDrawerOpen] = useState(false);
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanAmount, setLoanAmount] = useState('50000');
  const [loanPurpose, setLoanPurpose] = useState('Education');
  const [loanDuration, setLoanDuration] = useState(12);
  const [loanRate, setLoanRate] = useState(11.0);
  const [employmentStatus, setEmploymentStatus] = useState('Salaried');
  const [annualIncome, setAnnualIncome] = useState('600000');
  const [loanPassword, setLoanPassword] = useState('');
  const [loanLoading, setLoanLoading] = useState(false);
  const [loanError, setLoanError] = useState('');

  // Card view reveal states
  const [revealedCards, setRevealedCards] = useState({});
  const [copiedCards, setCopiedCards] = useState({});

  // Load applications and approved cards
  const loadData = async () => {
    setLoading(true);
    try {
      const [appsRes, cardsRes] = await Promise.all([
        apiRequest('/applications'),
        apiRequest('/services/cards')
      ]);

      if (appsRes.ok && Array.isArray(appsRes.data)) {
        setApplications(appsRes.data);
      }
      if (cardsRes.ok && Array.isArray(cardsRes.data)) {
        setApprovedCards(cardsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load services data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update default account IDs for drawers when activeAccount changes
  useEffect(() => {
    if (activeAccount?.account_id) {
      setCardAccountId(String(activeAccount.account_id));
      setChequeAccountId(String(activeAccount.account_id));
      setLoanAccountId(String(activeAccount.account_id));
    }
  }, [activeAccount]);

  // Update loan interest rate when duration changes
  useEffect(() => {
    apiRequest(`/loans/rate?duration=${loanDuration}`)
      .then(res => {
        if (res.ok && res.data?.rate) {
          setLoanRate(res.data.rate);
        }
      })
      .catch(console.error);
  }, [loanDuration]);

  // Card view toggle
  const toggleCardReveal = (id) => {
    setRevealedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCard = (id, text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(String(text));
      setCopiedCards(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCopiedCards(prev => ({ ...prev, [id]: false })), 1500);
    }
  };

  // Format card number with spaces: "4111222233334444" -> "4111 2222 3333 4444"
  const formatCardNumber = (num, revealed) => {
    if (!num) return '•••• •••• •••• ••••';
    const clean = String(num).replace(/\s/g, '');
    if (!revealed) {
      return `•••• •••• •••• ${clean.slice(-4)}`;
    }
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
  };

  // ─── SUBMISSIONS ───────────────────────────────────────────────────────
  const handleCardSubmit = async () => {
    if (!nameOnCard.trim()) {
      setCardError('Name on card is required');
      return;
    }
    if (!cardAddress.trim()) {
      setCardError('Delivery address is required');
      return;
    }
    if (!cardPassword) {
      setCardError('Please confirm with your password');
      return;
    }

    setCardLoading(true);
    setCardError('');

    try {
      const res = await apiRequest('/services/debit-card', {
        method: 'POST',
        body: {
          account_id: parseInt(cardAccountId),
          name_on_card: nameOnCard.trim().toUpperCase(),
          network,
          delivery_address: cardAddress.trim(),
          password: cardPassword
        }
      });

      if (res.ok) {
        setCardDrawerOpen(false);
        setSuccessBanner('Debit card request submitted. Staff will review and issue your card.');
        loadData();
      } else {
        setCardError(res.message || 'Request failed');
      }
    } catch (err) {
      setCardError(err.message || 'Request failed');
    } finally {
      setCardLoading(false);
    }
  };

  const handleChequeSubmit = async () => {
    if (!chequeAddress.trim()) {
      setChequeError('Delivery address is required');
      return;
    }
    if (!chequePassword) {
      setChequeError('Please confirm with your password');
      return;
    }

    setChequeLoading(true);
    setChequeError('');

    try {
      const res = await apiRequest('/services/cheque-book', {
        method: 'POST',
        body: {
          account_id: parseInt(chequeAccountId),
          leaves: parseInt(leaves),
          delivery_address: chequeAddress.trim(),
          password: chequePassword
        }
      });

      if (res.ok) {
        setChequeDrawerOpen(false);
        setSuccessBanner('Cheque book request submitted. Staff will dispatch your booklet.');
        loadData();
      } else {
        setChequeError(res.message || 'Request failed');
      }
    } catch (err) {
      setChequeError(err.message || 'Request failed');
    } finally {
      setChequeLoading(false);
    }
  };

  const handleLoanSubmit = async () => {
    const numLoanAmt = parseFloat(loanAmount);
    if (!numLoanAmt || numLoanAmt < 5000) {
      setLoanError('Minimum loan amount is ₹5,000.00');
      return;
    }
    if (!annualIncome || parseFloat(annualIncome) <= 0) {
      setLoanError('Please specify valid annual income');
      return;
    }
    if (!loanPassword) {
      setLoanError('Please confirm with your password');
      return;
    }

    setLoanLoading(true);
    setLoanError('');

    try {
      const res = await apiRequest('/loans', {
        method: 'POST',
        body: {
          account_id: parseInt(loanAccountId),
          amount: numLoanAmt,
          purpose: loanPurpose,
          duration_months: parseInt(loanDuration),
          employment_status: employmentStatus,
          annual_income: parseFloat(annualIncome),
          password: loanPassword
        }
      });

      if (res.ok) {
        setLoanDrawerOpen(false);
        setSuccessBanner('Application submitted. Status: Pending. Staff will review it.');
        loadData();
      } else {
        setLoanError(res.message || 'Loan application failed');
      }
    } catch (err) {
      setLoanError(err.message || 'Application failed');
    } finally {
      setLoanLoading(false);
    }
  };

  // Status summaries for the 3 top panels
  const cardReqCount = applications.filter(a => a.application_type === 'DEBIT_CARD' && (a.status === 'REQUESTED' || a.status === 'PENDING')).length;
  const chequeReqCount = applications.filter(a => a.application_type === 'CHEQUE_BOOK' && (a.status === 'REQUESTED' || a.status === 'PENDING')).length;
  const loanReqCount = applications.filter(a => a.application_type === 'LOAN' && a.status === 'PENDING').length;

  const cardSummaryText = approvedCards.length > 0
    ? `${approvedCards.length} active debit card`
    : cardReqCount > 0
      ? `${cardReqCount} request pending`
      : 'No active card';

  const chequeSummaryText = chequeReqCount > 0
    ? `${chequeReqCount} request pending`
    : 'No active requests';

  const loanSummaryText = loanReqCount > 0
    ? `${loanReqCount} loan application pending`
    : 'No loans pending';

  // Filtered applications
  const filteredApps = applications.filter(a => {
    if (filterType === 'ALL') return true;
    if (filterType === 'LOAN') return a.application_type === 'LOAN';
    if (filterType === 'DEBIT_CARD') return a.application_type === 'DEBIT_CARD';
    if (filterType === 'CHEQUE_BOOK') return a.application_type === 'CHEQUE_BOOK';
    return true;
  });

  return (
    <AppShell title="Services & Applications">
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Success Banner */}
        {successBanner && (
          <Banner variant="success" onDismiss={() => setSuccessBanner('')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{successBanner}</span>
            </div>
          </Banner>
        )}

        {error && <Banner variant="error">{error}</Banner>}

        {/* ─── THREE REQUEST PANELS ────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}
        >
          {/* Panel 1: Debit Card */}
          <div className="mf-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <CreditCard size={20} color="var(--green-900)" />
                <h3 style={{ fontSize: '20px', margin: 0 }}>Debit Card</h3>
              </div>
              <p className="mf-helper" style={{ margin: '4px 0 16px' }}>
                {cardSummaryText}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setCardError('');
                setCardPassword('');
                setNameOnCard(activeAccount?.customer_name || '');
                setCardDrawerOpen(true);
              }}
            >
              Request card
            </Button>
          </div>

          {/* Panel 2: Cheque Book */}
          <div className="mf-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <BookOpen size={20} color="var(--green-900)" />
                <h3 style={{ fontSize: '20px', margin: 0 }}>Cheque Book</h3>
              </div>
              <p className="mf-helper" style={{ margin: '4px 0 16px' }}>
                {chequeSummaryText}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setChequeError('');
                setChequePassword('');
                setChequeDrawerOpen(true);
              }}
            >
              Request cheque book
            </Button>
          </div>

          {/* Panel 3: Loan */}
          <div className="mf-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Landmark size={20} color="var(--green-900)" />
                <h3 style={{ fontSize: '20px', margin: 0 }}>Personal & Term Loan</h3>
              </div>
              <p className="mf-helper" style={{ margin: '4px 0 16px' }}>
                {loanSummaryText}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setLoanError('');
                setLoanPassword('');
                setLoanDrawerOpen(true);
              }}
            >
              Apply for loan
            </Button>
          </div>
        </div>

        {/* ─── APPROVED CARD PANEL (4px green accent left) ─────────────── */}
        {approvedCards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {approvedCards.map(c => {
              const isRevealed = revealedCards[c.request_id];
              const isCopied = copiedCards[c.request_id];
              return (
                <div
                  key={c.request_id}
                  className="mf-panel mf-panel-accent-left"
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="mf-label" style={{ marginBottom: 0, color: 'var(--green-900)', fontWeight: 700 }}>
                        OFFICIAL DEBIT CARD
                      </span>
                      <Tag status="ACTIVE">ACTIVE</Tag>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-2)' }}>
                      Linked to {c.account_number ? maskAccountNumber(c.account_number) : 'Account'}
                    </span>
                  </div>

                  {/* Card Number Line with VIEW & COPY Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div
                      className="tabular-nums"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '24px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--green-950)'
                      }}
                    >
                      {formatCardNumber(c.card_number, isRevealed)}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Chip onClick={() => toggleCardReveal(c.request_id)}>
                        {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                        {isRevealed ? 'Hide' : 'View'}
                      </Chip>
                      <Chip onClick={() => handleCopyCard(c.request_id, c.card_number)}>
                        {isCopied ? <Check size={11} /> : <Copy size={11} />}
                        {isCopied ? 'Copied' : 'Copy'}
                      </Chip>
                    </div>
                  </div>

                  {/* Card Details: Name, Expiry, Network */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '32px',
                      borderTop: '1px solid var(--line)',
                      paddingTop: '12px',
                      fontSize: '13px'
                    }}
                  >
                    <div>
                      <div className="mf-label" style={{ fontSize: '11px', marginBottom: '2px' }}>CARDHOLDER</div>
                      <div style={{ fontWeight: 600 }}>{c.name_on_card}</div>
                    </div>
                    <div>
                      <div className="mf-label" style={{ fontSize: '11px', marginBottom: '2px' }}>EXPIRES</div>
                      <div className="mf-mono" style={{ fontWeight: 600 }}>{c.expiry_date}</div>
                    </div>
                    <div>
                      <div className="mf-label" style={{ fontSize: '11px', marginBottom: '2px' }}>NETWORK</div>
                      <div style={{ fontWeight: 600 }}>{c.network}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── ALL APPLICATIONS TRACKING SECTION ───────────────────────── */}
        <div className="mf-panel" style={{ padding: 0 }}>
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <h2 style={{ fontSize: '20px', margin: 0 }}>All applications</h2>
              <p className="mf-helper" style={{ margin: '4px 0 0' }}>
                Track the status of loan requests, debit card issuances, and cheque books.
              </p>
            </div>

            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Chip selected={filterType === 'ALL'} onClick={() => setFilterType('ALL')}>
                All
              </Chip>
              <Chip selected={filterType === 'LOAN'} onClick={() => setFilterType('LOAN')}>
                Loans
              </Chip>
              <Chip selected={filterType === 'DEBIT_CARD'} onClick={() => setFilterType('DEBIT_CARD')}>
                Debit cards
              </Chip>
              <Chip selected={filterType === 'CHEQUE_BOOK'} onClick={() => setFilterType('CHEQUE_BOOK')}>
                Cheque books
              </Chip>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '32px 24px' }}>
              <Skeleton height="36px" width="100%" count={5} style={{ marginBottom: '10px' }} />
            </div>
          ) : filteredApps.length === 0 ? (
            <div style={{ padding: '48px 24px' }}>
              <EmptyState
                title="You haven't applied for anything yet."
                description="Use the buttons above to request a card, cheque book, or loan."
              />
            </div>
          ) : (
            <div className="mf-table-container">
              <table className="mf-ledger-table">
                <thead>
                  <tr>
                    <th scope="col">REF</th>
                    <th scope="col">TYPE</th>
                    <th scope="col">ACCOUNT</th>
                    <th scope="col">DETAILS</th>
                    <th scope="col">APPLIED ON</th>
                    <th scope="col" className="mf-text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map(app => (
                    <tr key={`${app.application_type}-${app.application_id}`}>
                      <td className="mf-mono" style={{ fontWeight: 600 }}>
                        {formatAppRef(app.application_type === 'LOAN' ? 'LN' : 'SR', app.application_id)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {app.application_type === 'LOAN'
                          ? 'Loan'
                          : app.application_type === 'DEBIT_CARD'
                            ? 'Debit Card'
                            : 'Cheque Book'}
                      </td>
                      <td className="mf-mono">
                        {app.account_number ? maskAccountNumber(app.account_number) : '•••• •••• ••••'}
                      </td>
                      <td>{app.details}</td>
                      <td className="mf-mono">{formatDate(app.applied_on)}</td>
                      <td className="mf-text-right">
                        <Tag status={app.status}>{app.status}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ─── DRAWER 1: REQUEST DEBIT CARD ────────────────────────────── */}
      <Drawer
        isOpen={cardDrawerOpen}
        onClose={() => setCardDrawerOpen(false)}
        title="Request Debit Card"
        primaryLabel="Request card"
        onPrimary={handleCardSubmit}
        primaryLoading={cardLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cardError && <Banner variant="error">{cardError}</Banner>}

          <Field
            label="Linked Account"
            type="select"
            value={cardAccountId}
            onChange={(e) => setCardAccountId(e.target.value)}
            options={accounts.map(a => ({
              value: String(a.account_id),
              label: `${a.account_type} (${a.account_number_masked}) — Bal: ${formatMoney(a.balance)}`
            }))}
          />

          <Field
            label="Name on Card (Uppercase)"
            value={nameOnCard}
            onChange={(e) => setNameOnCard(e.target.value.toUpperCase().slice(0, 26))}
            placeholder="e.g. RIYA SHARMA"
            maxLength={26}
            required
            helper="Maximum 26 characters as printed on physical card"
          />

          <div>
            <span className="mf-label" style={{ marginBottom: '6px' }}>Card Network</span>
            <RadioTiles
              value={network}
              onChange={setNetwork}
              options={[
                { value: 'Visa', title: 'Visa', caption: 'Global acceptance' },
                { value: 'Mastercard', title: 'Mastercard', caption: 'Worldwide network' },
                { value: 'RuPay', title: 'RuPay', caption: 'Domestic & UPI linkage' }
              ]}
            />
          </div>

          <Field
            label="Delivery Address"
            type="textarea"
            rows={2}
            value={cardAddress}
            onChange={(e) => setCardAddress(e.target.value)}
            placeholder="Street address, City, PIN code"
            required
          />

          <Field
            label="Confirm with your password"
            type="password"
            value={cardPassword}
            onChange={(e) => setCardPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
      </Drawer>

      {/* ─── DRAWER 2: REQUEST CHEQUE BOOK ───────────────────────────── */}
      <Drawer
        isOpen={chequeDrawerOpen}
        onClose={() => setChequeDrawerOpen(false)}
        title="Request Cheque Book"
        primaryLabel="Request cheque book"
        onPrimary={handleChequeSubmit}
        primaryLoading={chequeLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {chequeError && <Banner variant="error">{chequeError}</Banner>}

          <Field
            label="Linked Account"
            type="select"
            value={chequeAccountId}
            onChange={(e) => setChequeAccountId(e.target.value)}
            options={accounts.map(a => ({
              value: String(a.account_id),
              label: `${a.account_type} (${a.account_number_masked}) — Bal: ${formatMoney(a.balance)}`
            }))}
          />

          <div>
            <span className="mf-label" style={{ marginBottom: '6px' }}>Number of Leaves</span>
            <RadioTiles
              value={leaves}
              onChange={(val) => setLeaves(Number(val))}
              options={[
                { value: 10, title: '10 leaves', caption: 'Light personal use' },
                { value: 25, title: '25 leaves', caption: 'Standard personal book' },
                { value: 50, title: '50 leaves', caption: 'Business & frequent use' }
              ]}
            />
          </div>

          <Field
            label="Delivery Address"
            type="textarea"
            rows={2}
            value={chequeAddress}
            onChange={(e) => setChequeAddress(e.target.value)}
            placeholder="Street address, City, PIN code"
            required
          />

          <Field
            label="Confirm with your password"
            type="password"
            value={chequePassword}
            onChange={(e) => setChequePassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
      </Drawer>

      {/* ─── DRAWER 3: APPLY FOR LOAN ────────────────────────────────── */}
      <Drawer
        isOpen={loanDrawerOpen}
        onClose={() => setLoanDrawerOpen(false)}
        title="Apply for a Loan"
        primaryLabel="Submit application"
        onPrimary={handleLoanSubmit}
        primaryLoading={loanLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loanError && <Banner variant="error">{loanError}</Banner>}

          <Field
            label="Account to Credit on Approval"
            type="select"
            value={loanAccountId}
            onChange={(e) => setLoanAccountId(e.target.value)}
            options={accounts.map(a => ({
              value: String(a.account_id),
              label: `${a.account_type} (${a.account_number_masked})`
            }))}
          />

          <div>
            <Field
              label="Loan Amount"
              type="number"
              mono
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="50000"
              required
            />
            {parseFloat(loanAmount) > 0 && (
              <div className="mf-helper" style={{ fontStyle: 'italic', marginTop: '4px', color: 'var(--green-900)' }}>
                {amountInWords(parseFloat(loanAmount))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field
              label="Purpose"
              type="select"
              value={loanPurpose}
              onChange={(e) => setLoanPurpose(e.target.value)}
              options={LOAN_PURPOSES.map(p => ({ value: p, label: p }))}
            />
            <Field
              label="Duration"
              type="select"
              value={String(loanDuration)}
              onChange={(e) => setLoanDuration(Number(e.target.value))}
              options={LOAN_DURATIONS.map(d => ({ value: String(d), label: `${d} months` }))}
            />
          </div>

          <div
            style={{
              backgroundColor: 'var(--paper-2)',
              border: '1px solid var(--line)',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span className="mf-label" style={{ marginBottom: 0 }}>APPLICABLE RATE</span>
            <span className="mf-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green-900)' }}>
              {loanRate.toFixed(2)}% p.a.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field
              label="Employment Status"
              type="select"
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              options={EMPLOYMENT_STATUSES.map(s => ({ value: s, label: s }))}
            />
            <Field
              label="Annual Income (₹)"
              type="number"
              mono
              value={annualIncome}
              onChange={(e) => setAnnualIncome(e.target.value)}
              placeholder="600000"
              required
            />
          </div>

          <Field
            label="Confirm with your password"
            type="password"
            value={loanPassword}
            onChange={(e) => setLoanPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
      </Drawer>
    </AppShell>
  );
}

export default Services;
