import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Field from '../../components/Field';
import Banner from '../../components/Banner';
import Tag from '../../components/Tag';

export function StaffLogin() {
  const navigate = useNavigate();
  const { loginStaff, loading } = useAuth();

  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await loginStaff(empId, password);
      navigate('/staff', { replace: true });
    } catch (err) {
      setError(err.message || 'Staff login failed');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--page)' }}>
      {/* Left Branding Panel (Staff: --green-950) */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>
                MudraFlow
              </span>
            </Link>
            <Tag status="STAFF">STAFF PORTAL</Tag>
          </div>

          <div style={{ marginTop: '48px' }}>
            <div className="mf-label" style={{ color: 'var(--gold)', marginBottom: '12px' }}>
              INTERNAL BANKING CONTROLS
            </div>
            <h2 style={{ fontSize: '32px', lineHeight: '40px', color: '#FFFFFF', marginBottom: '24px' }}>
              Bank management & ledger supervision.
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '15px', lineHeight: '24px' }}>
              MudraFlow staff portal provides real-time audit visibility, loan approval workflows,
              card issuances, and account status management without bypassing database rules.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '24px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '20px' }}>
            Authorized Personnel Only · Audit logging active
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
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
          <div className="mf-mobile-only" style={{ marginBottom: '32px', textAlign: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700, color: 'var(--ink)' }}>
                MudraFlow
              </span>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '28px', margin: 0 }}>Staff Sign In</h2>
            <Tag status="STAFF">STAFF</Tag>
          </div>
          <p className="mf-helper" style={{ marginBottom: '24px' }}>
            Restricted access for bank employees and officers only.
          </p>

          {error && <Banner variant="error">{error}</Banner>}

          <form onSubmit={handleSubmit}>
            <Field
              label="Employee ID (Mono)"
              mono
              required
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="e.g. 1"
              helper="Numeric employee identifier"
            />

            <Field
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />

            <Button
              variant="primary"
              full
              type="submit"
              loading={loading}
              style={{ marginTop: '8px' }}
            >
              Log in to Staff Portal
            </Button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link to="/login" style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
              ← Return to Customer Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffLogin;
