import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, ShieldCheck, UserPlus, AlertCircle } from 'lucide-react';
import { useActiveAccount } from '../../context/ActiveAccountContext';
import { apiRequest } from '../../lib/api';
import { formatMoney, maskAccountNumber, formatDate } from '../../lib/format';
import { amountInWords } from '../../lib/amountInWords';
import AppShell from '../../components/AppShell';
import Button from '../../components/Button';
import Segmented from '../../components/Segmented';
import RadioTiles from '../../components/RadioTiles';
import Field from '../../components/Field';
import Slip from '../../components/Slip';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import Banner from '../../components/Banner';
import Chip from '../../components/Chip';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';

export function Transfer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeAccount, accounts, setActiveAccountId } = useActiveAccount();

  // Wizard state: 'details' | 'review'
  const [step, setStep] = useState('details');

  // Pay to mode: 'saved' | 'new'
  const [payToTab, setPayToTab] = useState(searchParams.get('payee') ? 'saved' : 'saved');
  const [payees, setPayees] = useState([]);
  const [loadingPayees, setLoadingPayees] = useState(true);
  const [selectedPayeeId, setSelectedPayeeId] = useState(searchParams.get('payee') || '');

  // New payee fields
  const [newReceiverName, setNewReceiverName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');

  // Transfer fields
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('NEFT');
  const [remarks, setRemarks] = useState('');
  const [showBalance, setShowBalance] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Review & Confirm states
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Modal confirm state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmOtp, setConfirmOtp] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Add Payee Drawer State
  const [addPayeeOpen, setAddPayeeOpen] = useState(false);
  const [drawerName, setDrawerName] = useState('');
  const [drawerAccount, setDrawerAccount] = useState('');
  const [drawerIfsc, setDrawerIfsc] = useState('');
  const [drawerPassword, setDrawerPassword] = useState('');
  const [drawerVerifying, setDrawerVerifying] = useState(false);
  const [drawerVerifiedInfo, setDrawerVerifiedInfo] = useState(null);
  const [drawerVerifyError, setDrawerVerifyError] = useState('');
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerSaveError, setDrawerSaveError] = useState('');

  // Load saved beneficiaries
  const loadPayees = async () => {
    setLoadingPayees(true);
    try {
      const res = await apiRequest('/beneficiaries');
      if (res.ok && Array.isArray(res.data)) {
        setPayees(res.data);
        const urlPayee = searchParams.get('payee');
        if (urlPayee) {
          setSelectedPayeeId(urlPayee);
          setPayToTab('saved');
        } else if (res.data.length > 0 && !selectedPayeeId) {
          setSelectedPayeeId(String(res.data[0].beneficiary_id));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPayees(false);
    }
  };

  useEffect(() => {
    loadPayees();
  }, []);

  // ---------------------------------------------------------------------------
  // Dynamic Mode Rules Based on Amount:
  // - IMPS: up to 5,00,000
  // - NEFT: Any amount
  // - RTGS: minimum 2,00,000
  // ---------------------------------------------------------------------------
  const numAmount = parseFloat(amount) || 0;
  const isImpsDisabled = numAmount > 500000;
  const isRtgsDisabled = numAmount > 0 && numAmount < 200000;

  // If amount changes such that currently selected mode becomes invalid, clear or switch
  useEffect(() => {
    if (mode === 'IMPS' && isImpsDisabled) {
      setMode('NEFT');
    } else if (mode === 'RTGS' && isRtgsDisabled) {
      setMode('NEFT');
    }
  }, [numAmount, isImpsDisabled, isRtgsDisabled, mode]);

  const modeOptions = [
    {
      value: 'IMPS',
      title: 'IMPS',
      caption: isImpsDisabled ? 'Above ₹5,00,000 maximum' : 'Instant · up to ₹5,00,000',
      disabled: isImpsDisabled
    },
    {
      value: 'NEFT',
      title: 'NEFT',
      caption: 'Settlement · Any amount',
      disabled: false
    },
    {
      value: 'RTGS',
      title: 'RTGS',
      caption: isRtgsDisabled ? 'Below ₹2,00,000 minimum' : 'Real-time · Minimum ₹2,00,000',
      disabled: isRtgsDisabled
    }
  ];

  // Resolve target beneficiary info
  const selectedPayeeObj = payees.find(p => String(p.beneficiary_id) === String(selectedPayeeId));
  const targetName = payToTab === 'saved' ? (selectedPayeeObj?.name || '—') : (newReceiverName || '—');
  const targetAccount = payToTab === 'saved'
    ? (selectedPayeeObj ? maskAccountNumber(selectedPayeeObj.account_number) : '—')
    : (newAccountNumber ? maskAccountNumber(newAccountNumber) : '—');
  const targetIfsc = payToTab === 'saved' ? (selectedPayeeObj?.ifsc || '—') : (newIfsc || '—');

  // ---------------------------------------------------------------------------
  // Step 1: Submit Details -> Review
  // ---------------------------------------------------------------------------
  const handleReviewTransfer = async (e) => {
    e.preventDefault();
    setReviewError('');

    if (!activeAccount) {
      setReviewError('No active account selected');
      return;
    }
    if (numAmount <= 0) {
      setReviewError('Please enter a transfer amount greater than zero');
      return;
    }
    if (numAmount > parseFloat(activeAccount.balance)) {
      setReviewError('Insufficient balance in active account');
      return;
    }
    if (mode === 'IMPS' && numAmount > 500000) {
      setReviewError('IMPS allows up to ₹5,00,000.');
      return;
    }
    if (mode === 'RTGS' && numAmount < 200000) {
      setReviewError('RTGS needs at least ₹2,00,000.');
      return;
    }

    if (payToTab === 'saved') {
      if (!selectedPayeeId) {
        setReviewError('Please select a saved payee');
        return;
      }
    } else {
      if (!newReceiverName || !newAccountNumber || !newIfsc) {
        setReviewError('Please fill in all recipient details');
        return;
      }
    }

    setReviewLoading(true);

    try {
      const payload = {
        from_account_id: activeAccount.account_id,
        amount: numAmount,
        mode
      };

      if (payToTab === 'saved') {
        payload.beneficiary_id = parseInt(selectedPayeeId);
      } else {
        payload.to_account_number = newAccountNumber.trim();
        payload.ifsc = newIfsc.trim().toUpperCase();
      }

      const res = await apiRequest('/transfers/review', {
        method: 'POST',
        body: payload
      });

      if (res.ok && res.data) {
        setReviewData(res.data);
        setStep('review');
      } else {
        setReviewError(res.message || 'Transfer review failed');
      }
    } catch (err) {
      setReviewError(err.message || 'Failed to review transfer');
    } finally {
      setReviewLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2: Confirm Modal -> Execute Transfer
  // ---------------------------------------------------------------------------
  const handleOpenConfirmModal = () => {
    setConfirmPassword('');
    setConfirmOtp('');
    setConfirmError('');
    setConfirmModalOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!confirmPassword) {
      setConfirmError('Please enter your account password');
      return;
    }
    if (!confirmOtp) {
      setConfirmError('Please enter the 6-digit OTP');
      return;
    }

    setConfirmLoading(true);
    setConfirmError('');

    try {
      const payload = {
        from_account_id: activeAccount.account_id,
        amount: numAmount,
        mode,
        remarks: remarks.trim() || undefined,
        password: confirmPassword,
        otp: confirmOtp
      };

      if (payToTab === 'saved') {
        payload.beneficiary_id = parseInt(selectedPayeeId);
      } else {
        payload.to_account_number = newAccountNumber.trim();
        payload.ifsc = newIfsc.trim().toUpperCase();
        payload.receiver_name = newReceiverName.trim();
      }

      const res = await apiRequest('/transfers', {
        method: 'POST',
        body: payload
      });

      if (res.ok && res.data?.reference_no) {
        setConfirmModalOpen(false);
        // Navigate to receipt
        navigate(`/app/receipt/${res.data.reference_no}`);
      } else {
        setConfirmError(res.message || 'Transfer failed');
      }
    } catch (err) {
      setConfirmError(err.message || 'Transfer authorization failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  // Add Payee drawer handlers
  const handleOpenAddPayee = () => {
    setDrawerName('');
    setDrawerAccount('');
    setDrawerIfsc('');
    setDrawerPassword('');
    setDrawerVerifiedInfo(null);
    setDrawerVerifyError('');
    setDrawerSaveError('');
    setAddPayeeOpen(true);
  };

  const handleDrawerVerify = async () => {
    if (!drawerAccount || !drawerIfsc) {
      setDrawerVerifyError('Account number and IFSC are required to verify');
      return;
    }
    setDrawerVerifying(true);
    setDrawerVerifyError('');

    try {
      const res = await apiRequest('/beneficiaries/verify', {
        method: 'POST',
        body: { account_number: drawerAccount.trim(), ifsc: drawerIfsc.trim().toUpperCase() }
      });

      if (res.ok && res.data) {
        setDrawerVerifiedInfo(res.data);
        if (!drawerName && res.data.full_name) {
          setDrawerName(res.data.full_name);
        }
      } else {
        setDrawerVerifyError(res.message || 'Receiver account or IFSC not found.');
      }
    } catch (err) {
      setDrawerVerifyError(err.message || 'Receiver account or IFSC not found.');
    } finally {
      setDrawerVerifying(false);
    }
  };

  const handleDrawerSave = async () => {
    if (!drawerName || !drawerAccount || !drawerIfsc || !drawerPassword) {
      setDrawerSaveError('All fields and password are required');
      return;
    }
    setDrawerSaving(true);
    setDrawerSaveError('');

    try {
      const res = await apiRequest('/beneficiaries', {
        method: 'POST',
        body: {
          name: drawerName.trim(),
          account_number: drawerAccount.trim(),
          ifsc: drawerIfsc.trim().toUpperCase(),
          password: drawerPassword
        }
      });

      if (res.ok) {
        setAddPayeeOpen(false);
        await loadPayees();
        setPayToTab('saved');
      } else {
        setDrawerSaveError(res.message || 'Failed to save payee');
      }
    } catch (err) {
      setDrawerSaveError(err.message || 'Failed to save payee');
    } finally {
      setDrawerSaving(false);
    }
  };

  return (
    <AppShell title="Transfer Money">
      <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>

        {/* ─── PROGRESS STEP INDICATOR ─────────────────────────────────── */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="mf-label"
            style={{
              color: step === 'details' ? 'var(--green-900)' : 'var(--ink-2)',
              fontWeight: step === 'details' ? 700 : 500
            }}
          >
            1. Details
          </span>
          <span style={{ color: 'var(--line-strong)' }}>→</span>
          <span
            className="mf-label"
            style={{
              color: step === 'review' ? 'var(--green-900)' : 'var(--ink-2)',
              fontWeight: step === 'review' ? 700 : 500
            }}
          >
            2. Review
          </span>
          <span style={{ color: 'var(--line-strong)' }}>→</span>
          <span className="mf-label" style={{ color: 'var(--ink-2)' }}>
            3. Receipt
          </span>
        </div>

        {/* ─── SINGLE WORKBENCH (Clean centered layout) ──── */}
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <div>
            {reviewError && <Banner variant="error" style={{ marginBottom: '20px' }}>{reviewError}</Banner>}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* STEP 1: DETAILS STATE                                         */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {step === 'details' && (
              <form onSubmit={handleReviewTransfer} className="mf-panel" style={{ padding: '28px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Transfer money</h2>

                {/* 1. PAYING FROM */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="mf-label" style={{ marginBottom: 0 }}>1. PAYING FROM</span>
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
                              setActiveAccountId(acc.account_id);
                              setShowAccountSelector(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: acc.account_id === activeAccount?.account_id ? 'var(--green-100)' : '#FFFFFF',
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
                        {activeAccount?.account_type || 'SAVINGS'} ACCOUNT
                      </div>
                      <div className="mf-mono" style={{ fontSize: '14px', color: 'var(--ink)' }}>
                        {activeAccount?.account_number || activeAccount?.account_number_masked || '•••• •••• ••••'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="mf-label" style={{ fontSize: '11px', marginBottom: '2px' }}>AVAILABLE</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mf-mono" style={{ fontWeight: 600 }}>
                          {showBalance ? formatMoney(activeAccount?.balance) : '₹ ••,••,•••.••'}
                        </span>
                        <Chip onClick={() => setShowBalance(!showBalance)}>
                          {showBalance ? 'HIDE' : 'SHOW'}
                        </Chip>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. PAY TO */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
                  <span className="mf-label" style={{ marginBottom: '8px' }}>2. PAY TO</span>
                  <div style={{ marginBottom: '16px' }}>
                    <Segmented
                      value={payToTab}
                      onChange={setPayToTab}
                      options={[
                        { value: 'saved', label: 'Saved payees' },
                        { value: 'new', label: 'New payee' }
                      ]}
                    />
                  </div>

                  {payToTab === 'saved' ? (
                    <div>
                      {loadingPayees ? (
                        <Skeleton height="36px" count={3} />
                      ) : payees.length === 0 ? (
                        <div style={{ padding: '16px 0' }}>
                          <p className="mf-helper" style={{ marginBottom: '12px' }}>
                            No payees yet. Add one to pay in a tap.
                          </p>
                          <Button variant="secondary" onClick={handleOpenAddPayee}>
                            <UserPlus size={15} /> Add payee
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                          {payees.map(p => {
                            const isSelected = String(p.beneficiary_id) === String(selectedPayeeId);
                            return (
                              <label
                                key={p.beneficiary_id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 14px',
                                  border: `1px solid ${isSelected ? 'var(--green-900)' : 'var(--line)'}`,
                                  backgroundColor: isSelected ? 'var(--green-100)' : '#FFFFFF',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <input
                                    type="radio"
                                    name="payeeSelection"
                                    checked={isSelected}
                                    onChange={() => setSelectedPayeeId(String(p.beneficiary_id))}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</div>
                                    <div className="mf-mono" style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                                      {p.account_number} · {p.ifsc}
                                    </div>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px' }}>
                        <button type="button" onClick={handleOpenAddPayee} className="mf-btn-link">
                          + Add new payee
                        </button>
                        <Link to="/app/payees" className="mf-btn-link">
                          Manage payees →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <Field
                        label="Receiver Name"
                        value={newReceiverName}
                        onChange={(e) => setNewReceiverName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <Field
                          label="Account Number (10 digits)"
                          mono
                          value={newAccountNumber}
                          onChange={(e) => setNewAccountNumber(e.target.value)}
                          placeholder="e.g. 5001000004"
                          required
                        />
                        <Field
                          label="IFSC Code"
                          mono
                          value={newIfsc}
                          onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                          placeholder="e.g. MUDF0000482"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. AMOUNT */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
                  <span className="mf-label" style={{ marginBottom: '8px' }}>3. AMOUNT</span>
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
                      step="0.01"
                      className="mf-input mf-mono"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
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
                </div>

                {/* 4. MODE (Dynamic Tiles) */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
                  <span className="mf-label" style={{ marginBottom: '8px' }}>4. TRANSFER MODE</span>
                  <RadioTiles
                    value={mode}
                    onChange={setMode}
                    options={modeOptions}
                  />
                </div>

                {/* 5. REMARKS */}
                <div style={{ marginBottom: '24px' }}>
                  <Field
                    label="5. Remarks (optional)"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Property advance, invoice settlement"
                    maxLength={100}
                  />
                </div>

                <Button variant="primary" full type="submit" loading={reviewLoading}>
                  Review transfer →
                </Button>
              </form>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* STEP 2: REVIEW STATE                                          */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {step === 'review' && reviewData && (
              <div className="mf-panel" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '24px', margin: 0 }}>Review transfer</h2>
                  <ShieldCheck size={20} color="var(--green-900)" />
                </div>
                <p className="mf-helper" style={{ marginBottom: '24px' }}>
                  Please review the transfer details carefully before authorizing the transaction.
                </p>

                <div
                  style={{
                    border: '1px solid var(--line)',
                    backgroundColor: 'var(--paper-2)',
                    padding: '20px',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mf-label">PAYING FROM</span>
                    <span className="mf-mono">{reviewData.from.account_number_masked}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mf-label">PAYING TO</span>
                    <span style={{ fontWeight: 600 }}>{targetName} ({reviewData.to.account_number_masked})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mf-label">RECEIVER IFSC</span>
                    <span className="mf-mono">{reviewData.to.ifsc} · {reviewData.to.branch_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mf-label">TRANSFER MODE</span>
                    <span style={{ fontWeight: 600 }}>{reviewData.mode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mf-label">REMARKS</span>
                    <span>{remarks || 'None'}</span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mf-label" style={{ fontSize: '13px' }}>AMOUNT TO DEBIT</span>
                      <span className="mf-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--debit)' }}>
                        {formatMoney(reviewData.amount)}
                      </span>
                    </div>
                    <div className="mf-helper" style={{ fontStyle: 'italic', textAlign: 'right', marginTop: '4px' }}>
                      {amountInWords(reviewData.amount)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button variant="secondary" onClick={() => setStep('details')}>
                    <ArrowLeft size={16} /> Edit details
                  </Button>
                  <Button variant="primary" full onClick={handleOpenConfirmModal}>
                    Confirm and pay →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── CONFIRM TRANSFER MODAL ──────────────────────────────────── */}
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Confirm transfer"
          actionLabel={`Pay ${numAmount > 0 ? formatMoney(numAmount) : ''}`}
          onAction={handleConfirmTransfer}
          actionLoading={confirmLoading}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: '22px' }}>
              Pay <strong>{formatMoney(numAmount)}</strong> to <strong>{targetName}</strong> ({targetAccount}) by <strong>{mode}</strong>.
            </p>

            {confirmError && (
              <Banner variant="error">{confirmError}</Banner>
            )}

            <Field
              label="Account Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Field
              label="Enter 6-digit OTP"
              type="otp"
              value={confirmOtp}
              onChange={(e) => setConfirmOtp(e.target.value)}
              required
            />
          </div>
        </Modal>

        {/* ─── ADD PAYEE DRAWER ────────────────────────────────────────── */}
        <Drawer
          isOpen={addPayeeOpen}
          onClose={() => setAddPayeeOpen(false)}
          title="Add new payee"
          primaryLabel={drawerVerifiedInfo ? 'Save payee' : 'Verify details first'}
          onPrimary={drawerVerifiedInfo ? handleDrawerSave : handleDrawerVerify}
          primaryLoading={drawerSaving || drawerVerifying}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p className="mf-helper">
              Every payee is verified against MudraFlow branch records before saving.
            </p>

            {drawerVerifyError && <Banner variant="error">{drawerVerifyError}</Banner>}
            {drawerSaveError && <Banner variant="error">{drawerSaveError}</Banner>}

            {drawerVerifiedInfo && (
              <Banner variant="success">
                Account found at <strong>{drawerVerifiedInfo.branch_name}</strong> ({drawerVerifiedInfo.ifsc}).
              </Banner>
            )}

            <Field
              label="Receiver Name"
              value={drawerName}
              onChange={(e) => setDrawerName(e.target.value)}
              placeholder="e.g. Priya Verma"
              required
            />

            <Field
              label="Account Number (10 digits)"
              mono
              value={drawerAccount}
              onChange={(e) => {
                setDrawerAccount(e.target.value);
                setDrawerVerifiedInfo(null);
              }}
              placeholder="e.g. 5001000002"
              required
            />

            <Field
              label="IFSC Code"
              mono
              value={drawerIfsc}
              onChange={(e) => {
                setDrawerIfsc(e.target.value.toUpperCase());
                setDrawerVerifiedInfo(null);
              }}
              placeholder="e.g. MUDF0000483"
              required
            />

            {!drawerVerifiedInfo && (
              <Button
                variant="secondary"
                onClick={handleDrawerVerify}
                loading={drawerVerifying}
                style={{ marginTop: '8px' }}
              >
                Verify account details
              </Button>
            )}

            {drawerVerifiedInfo && (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <span className="mf-label" style={{ marginBottom: '8px' }}>AUTHORIZATION</span>
                <Field
                  label="Confirm with your password"
                  type="password"
                  value={drawerPassword}
                  onChange={(e) => setDrawerPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            )}
          </div>
        </Drawer>

      </div>
    </AppShell>
  );
}

export default Transfer;
