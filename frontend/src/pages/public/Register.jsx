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

  // Form state - inputs start empty
  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    pan: '',
    phone: '',
    email: '',
    address: '',
    account_type: 'SAVINGS',
    branch_id: '1',
    opening_amount: '',
    password: '',
    confirm_password: '',
    otp: ''
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
    if (!formData.full_name || !formData.email || !formData.phone || !formData.pan || !formData.dob) {
      setError('Please fill in all required personal details');
      return;
    }

    // Clean phone number (strip leading 0 or +91)
    let cleanPhone = String(formData.phone).replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
    if (cleanPhone.length !== 10) {
      setError('Mobile number must be exactly 10 digits');
      return;
    }

    // Clean PAN
    const cleanPan = String(formData.pan).trim().toUpperCase();
    if (cleanPan.length !== 10) {
      setError('PAN must be exactly 10 characters (e.g. ABCDE1234F)');
      return;
    }

    // Age validation (18 or older)
    const birthDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      setError('You must be at least 18 years old to open an account');
      return;
    }

    if (!formData.opening_amount || parseFloat(formData.opening_amount) < 1000) {
      setError('Minimum opening deposit is ₹1,000.00');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setStep(2);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!formData.otp) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setLoading(true);
    setError('');

    try {
      let cleanPhone = String(formData.phone).replace(/\D/g, '');
      if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
      const cleanPan = String(formData.pan).trim().toUpperCase();

      const payload = {
        full_name: formData.full_name.trim(),
        dob: formData.dob,
        pan: cleanPan,
        phone: cleanPhone,
        email: formData.email.trim(),
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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--page)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--line)',
          backgroundColor: '#FFFFFF',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
            MudraFlow
          </span>
        </Link>
        <div style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: 'var(--green-900)' }}>
            Sign in
          </Link>
        </div>
      </header>

      {/* Centered Form Layout (Single Column) */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '40px 20px 60px'
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            padding: '36px 32px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Progress Indicator */}
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <span className="mf-label" style={{ color: 'var(--green-900)' }}>
              {step === 1 && 'Step 1 of 3 · Personal & Account Details'}
              {step === 2 && 'Step 2 of 3 · Verification'}
              {step === 3 && 'Step 3 of 3 · Official Receipt'}
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
                  placeholder="e.g. Riya Sharma"
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
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                      handleChange('pan', val);
                    }}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
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
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length === 11 && val.startsWith('0')) val = val.slice(1);
                      if (val.length > 10) val = val.slice(0, 10);
                      handleChange('phone', val);
                    }}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                  />
                  <Field
                    label="Email Address"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. riya@example.com"
                  />
                </div>
                <Field
                  label="Permanent Address"
                  type="textarea"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street address, city, state, PIN code"
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
                  label="Opening Deposit"
                  type="amount"
                  value={formData.opening_amount}
                  onChange={(e) => handleChange('opening_amount', e.target.value)}
                  helper="Minimum deposit is ₹1,000.00"
                  placeholder="5000"
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
                  placeholder="Choose a strong password"
                />
                <Field
                  label="Confirm Password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => handleChange('confirm_password', e.target.value)}
                  placeholder="Repeat your password"
                />
              </div>

              <Button variant="primary" full type="submit">
                Continue to Verification
              </Button>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--ink-2)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ fontWeight: 600, color: 'var(--green-900)' }}>
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
                Enter the 6-digit one-time verification code to complete opening your account.
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
      </main>
    </div>
  );
}

export default Register;
