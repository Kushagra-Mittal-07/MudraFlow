import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatMoney, maskPan, formatDate } from '../../lib/format';
import Button from '../../components/Button';
import Field from '../../components/Field';
import RadioTiles from '../../components/RadioTiles';
import Slip from '../../components/Slip';
import Chip from '../../components/Chip';
import Banner from '../../components/Banner';

export function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Details, 2: Verify, 3: Receipt
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    dob: '1995-05-15',
    pan: '',
    phone: '',
    email: '',
    address: '',
    account_type: 'SAVINGS',
    branch_id: '1',
    opening_amount: '5000',
    password: 'Demo@123',
    confirm_password: 'Demo@123',
    declaration: true,
    otp: '123456'
  });

  // Success receipt data
  const [receiptData, setReceiptData] = useState(null);

  // Load branches
  useEffect(() => {
    apiRequest('/branches')
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          setBranches(res.data);
          if (res.data.length > 0) {
            setFormData(prev => ({ ...prev, branch_id: String(res.data[0].branch_id) }));
          }
        }
      })
      .catch(err => console.error('Failed to load branches:', err));
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.phone || !formData.pan) {
      setError('Please fill in all required personal details');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (parseFloat(formData.opening_amount) < 1000) {
      setError('Minimum opening deposit is ₹1,000.00');
      return;
    }
    if (!formData.declaration) {
      setError('You must confirm the project declaration');
      return;
    }
    setStep(2);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        full_name: formData.full_name,
        dob: formData.dob,
        pan: formData.pan.toUpperCase(),
        phone: formData.phone,
        email: formData.email,
        address: formData.address || 'Standard Address',
        account_type: formData.account_type,
        branch_id: parseInt(formData.branch_id),
        opening_amount: parseFloat(formData.opening_amount),
        password: formData.password,
        otp: formData.otp
      };

      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: payload
      });

      if (res.ok) {
        setReceiptData(res.data);
        setStep(3);
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(String(text));
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 1500);
      } else {
        setCopiedAcc(true);
        setTimeout(() => setCopiedAcc(false), 1500);
      }
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--page)' }}>
      {/* Left Branding Panel (40% width, hidden on < 900px) */}
      <div
        className="mf-desktop-only"
        style={{
          width: '40%',
          backgroundColor: 'var(--green-950)',
          color: '#FFFFFF',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>
              MudraFlow
            </span>
          </Link>
          <div style={{ marginTop: '48px' }}>
            <div className="mf-label" style={{ color: 'var(--gold)', marginBottom: '12px' }}>
              OFFICIAL LEDGER SYSTEM
            </div>
            <h2 style={{ fontSize: '32px', lineHeight: '40px', color: '#FFFFFF', marginBottom: '24px' }}>
              Direct access to a transparent banking ledger.
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '15px', lineHeight: '24px' }}>
              Register once to receive your personal 8-digit Customer ID. Every deposit, transfer and loan
              is recorded with full cryptographic and transactional consistency.
            </p>
          </div>
        </div>

        {/* Sample Ledger Lines */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--gold)', marginBottom: '8px' }}>
            LIVE TRANSACTION RECORD
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '22px' }}>
            <div>01 OCT · OPENING DEPOSIT · +₹5,000.00 ↑</div>
            <div>05 OCT · NEFT PAYEE TRANSFER · −₹1,200.00 ↓</div>
            <div>12 OCT · ACTIVE FIXED DEPOSIT · LOCKED</div>
          </div>
        </div>
      </div>

      {/* Right Form Panel (60% width) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          overflowY: 'auto'
        }}
      >
        <div style={{ maxWidth: '520px', width: '100%' }}>
          {/* Mobile Top Logo */}
          <div className="mf-mobile-only" style={{ marginBottom: '24px', textAlign: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, color: 'var(--ink)' }}>
                MudraFlow
              </span>
            </Link>
          </div>

          {/* Progress Indicator */}
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <span className="mf-label" style={{ color: 'var(--green-900)' }}>
              {step === 1 && 'Step 1 of 3 · Details'}
              {step === 2 && 'Step 2 of 3 · Verify'}
              {step === 3 && 'Step 3 of 3 · Receipt'}
            </span>
          </div>

          {error && <Banner variant="error">{error}</Banner>}

          {/* ─── STEP 1: DETAILS ────────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit}>
              <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>Open your account</h2>
              <p className="mf-helper" style={{ marginBottom: '24px' }}>
                Enter your details to create an official ledger account.
              </p>

              {/* Section 1: About you */}
              <div style={{ marginBottom: '20px' }}>
                <span className="mf-label" style={{ marginBottom: '8px' }}>About You</span>
                <Field
                  label="Full Name (as on PAN)"
                  required
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Riya Sharma"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field
                    label="Date of Birth"
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                  />
                  <Field
                    label="PAN Number (10 chars)"
                    mono
                    required
                    value={formData.pan}
                    onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              {/* Section 2: Contact */}
              <div style={{ marginBottom: '20px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <span className="mf-label" style={{ marginBottom: '8px' }}>Contact</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field
                    label="Mobile Number (10 digits)"
                    mono
                    required
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="9876543210"
                  />
                  <Field
                    label="Email Address"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="riya.sharma@example.com"
                  />
                </div>
                <Field
                  label="Permanent Address"
                  type="textarea"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Flat 402, Shivalik Apts, Sector 9, Rohini, New Delhi"
                />
              </div>

              {/* Section 3: Your account */}
              <div style={{ marginBottom: '20px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <span className="mf-label" style={{ marginBottom: '8px' }}>Your Account</span>
                <div style={{ marginBottom: '16px' }}>
                  <span className="mf-label" style={{ marginBottom: '6px' }}>Account Classification</span>
                  <RadioTiles
                    value={formData.account_type}
                    onChange={(val) => handleChange('account_type', val)}
                    options={[
                      { value: 'SAVINGS', title: 'Savings', caption: 'Everyday personal banking' },
                      { value: 'CURRENT', title: 'Current', caption: 'For commercial business use' }
                    ]}
                  />
                </div>
                <Field
                  label="Branch"
                  type="select"
                  value={formData.branch_id}
                  onChange={(e) => handleChange('branch_id', e.target.value)}
                  options={branches.map(b => ({
                    value: String(b.branch_id),
                    label: `${b.branch_name} · ${b.ifsc}`
                  }))}
                />
                <Field
                  label="Opening Deposit (Demo money)"
                  type="amount"
                  value={formData.opening_amount}
                  onChange={(e) => handleChange('opening_amount', e.target.value)}
                  helper="Minimum deposit is ₹1,000.00"
                />
              </div>

              {/* Section 4: Security */}
              <div style={{ marginBottom: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <span className="mf-label" style={{ marginBottom: '8px' }}>Security</span>
                <Field
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  helper="At least 8 characters with letters and numbers"
                />
                <Field
                  label="Confirm Password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => handleChange('confirm_password', e.target.value)}
                />

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--ink-2)', cursor: 'pointer', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    checked={formData.declaration}
                    onChange={(e) => handleChange('declaration', e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    I confirm these details are true. This is a college DBMS project and no real money is involved.
                  </span>
                </label>
              </div>

              <Button variant="primary" full type="submit">
                Continue to Verification
              </Button>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--ink-2)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ fontWeight: 600 }}>
                  Log in
                </Link>
              </div>
            </form>
          )}

          {/* ─── STEP 2: VERIFY OTP ─────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleVerifySubmit}>
              <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>Verify your registration</h2>
              <p className="mf-helper" style={{ marginBottom: '24px' }}>
                Enter the demo one-time verification code to complete opening your account.
              </p>

              <Field
                label="Enter 6-digit OTP"
                type="otp"
                value={formData.otp}
                onChange={(e) => handleChange('otp', e.target.value)}
                required
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <Button variant="secondary" onClick={() => setStep(1)} disabled={loading}>
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button variant="primary" full type="submit" loading={loading}>
                  Verify and open account
                </Button>
              </div>
            </form>
          )}

          {/* ─── STEP 3: RECEIPT SLIP ───────────────────────────────────── */}
          {step === 3 && receiptData && (
            <div>
              <Slip
                title={`Welcome, ${formData.full_name}`}
                subtitle="Your account is ready and activated."
                stamp={{ text: 'ACCOUNT OPENED', variant: 'green' }}
                rows={[
                  { label: 'Account number', value: receiptData.account_number },
                  { label: 'Account type', value: receiptData.account_type || formData.account_type },
                  { label: 'Branch', value: receiptData.branch_name || 'Rohini Sec-9' },
                  { label: 'IFSC', value: receiptData.ifsc || 'MUDF0000482' },
                  { label: 'PAN on record', value: maskPan(formData.pan) },
                  { label: 'Opening deposit', value: formatMoney(formData.opening_amount) },
                  { label: 'Date', value: formatDate(new Date()) }
                ]}
              >
                {/* Highlighted Customer ID Box */}
                <div
                  style={{
                    backgroundColor: 'var(--paper-2)',
                    padding: '16px',
                    margin: '20px 0',
                    border: '1px solid var(--line)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mf-label" style={{ marginBottom: 0 }}>CUSTOMER ID</span>
                    <Chip onClick={() => handleCopy(receiptData.customer_id, 'id')}>
                      {copiedId ? <Check size={11} /> : <Copy size={11} />}
                      {copiedId ? 'Copied' : 'Copy'}
                    </Chip>
                  </div>
                  <div
                    className="tabular-nums"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '32px',
                      fontWeight: 700,
                      color: 'var(--green-950)',
                      marginTop: '4px'
                    }}
                  >
                    {receiptData.customer_id}
                  </div>
                  <div className="mf-helper" style={{ marginTop: '4px' }}>
                    Use your Customer ID to log in. Keep it secure.
                  </div>
                </div>

                <Button variant="primary" full onClick={() => navigate('/login')}>
                  Go to login →
                </Button>
              </Slip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Register;

