import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Field from '../../components/Field';
import Banner from '../../components/Banner';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginCustomer, loading } = useAuth();

  const [customerId, setCustomerId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [countdownText, setCountdownText] = useState('');

  const updateCountdown = (expiresAt) => {
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      setLockExpiresAt(null);
      setCountdownText('');
      setError('');
    } else {
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      setCountdownText(`${mins} min ${secs} s`);
    }
  };

  // Lockout countdown timer
  useEffect(() => {
    if (!lockExpiresAt) return;
    updateCountdown(lockExpiresAt);

    const interval = setInterval(() => {
      const remainingMs = lockExpiresAt - Date.now();
      if (remainingMs <= 0) {
        setLockExpiresAt(null);
        setCountdownText('');
        setError('');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setCountdownText(`${mins} min ${secs} s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockExpiresAt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockExpiresAt && Date.now() < lockExpiresAt) return;

    setError('');
    setRemainingAttempts(null);

    try {
      await loginCustomer(customerId, password);
      // Success: redirect to customer app
      const from = location.state?.from?.pathname || '/app';
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);

      // Check if backend returned lockout info
      if (err.data?.locked_until) {
        const lockTime = new Date(err.data.locked_until).getTime();
        setLockExpiresAt(lockTime);
      } else if (err.data?.remaining_attempts !== undefined) {
        setRemainingAttempts(err.data.remaining_attempts);
      } else if (msg.includes('Account is locked') || msg.includes('locked')) {
        // Fallback default 10 minutes lockout if not exact timestamp
        setLockExpiresAt(Date.now() + 10 * 60 * 1000);
      }
    }
  };

  const isLocked = lockExpiresAt && Date.now() < lockExpiresAt;

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
              THE PASSBOOK PHILOSOPHY
            </div>
            <h2 style={{ fontSize: '32px', lineHeight: '40px', color: '#FFFFFF', marginBottom: '24px' }}>
              Every rupee in and out is written to an immutable ledger.
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '15px', lineHeight: '24px' }}>
              Sign in with your Customer ID to view your balances, review live transfers, download
              transaction receipts, and manage your fixed deposits.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '20px' }}>
            Official Ledger System · Encrypted Session
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
          padding: '40px 24px'
        }}
      >
        <div style={{ maxWidth: '420px', width: '100%' }}>
          {/* Mobile Top Logo */}
          <div className="mf-mobile-only" style={{ marginBottom: '32px', textAlign: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, color: 'var(--ink)' }}>
                MudraFlow
              </span>
            </Link>
          </div>

          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Customer Log In</h2>
          <p className="mf-helper" style={{ marginBottom: '24px' }}>
            Enter your 8-digit Customer ID and password to access your account.
          </p>

          {isLocked ? (
            <Banner variant="error">
              <strong>Account Locked:</strong> Too many attempts. Try again in {countdownText}.
            </Banner>
          ) : error ? (
            <Banner variant="error">
              {error}
              {remainingAttempts !== null && (
                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                  {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} left before 10-minute lockout.
                </div>
              )}
            </Banner>
          ) : null}

          <form onSubmit={handleSubmit}>
            <Field
              label="Customer ID (Mono)"
              mono
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. 10000001"
              helper="8-digit numeric identifier"
              disabled={isLocked || loading}
            />

            <Field
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLocked || loading}
            />

            <Button
              variant="primary"
              full
              type="submit"
              loading={loading}
              disabled={isLocked}
              style={{ marginTop: '8px' }}
            >
              {isLocked ? `Locked (${countdownText})` : 'Log in'}
            </Button>
          </form>

          <div
            style={{
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '14px'
            }}
          >
            <span style={{ color: 'var(--ink-2)' }}>
              New here?{' '}
              <Link to="/register" style={{ fontWeight: 600 }}>
                Open an account
              </Link>
            </span>
            <Link to="/staff/login" style={{ color: 'var(--ink-3)', fontSize: '13px' }}>
              Staff login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

