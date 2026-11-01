import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Button from '../../components/Button';
import Slip from '../../components/Slip';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Public Top Bar */}
      <header
        style={{
          height: 'var(--topbar-h)',
          backgroundColor: 'var(--page)',
          borderBottom: '1px solid var(--line)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: 'var(--ink)' }}>
            MudraFlow
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a href="#how-it-works" style={{ fontSize: '15px', color: 'var(--ink-2)', fontWeight: 500 }}>
            Features
          </a>
          <Link to="/login" style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 600 }}>
            Log in
          </Link>
          <Button variant="primary" style={{ height: '36px', padding: '0 16px', fontSize: '14px' }} onClick={() => navigate('/register')}>
            Open account
          </Button>
        </div>
      </header>

      {/* 2. Hero Section (7 / 5 Columns) */}
      <section style={{ maxWidth: '1200px', margin: '48px auto 64px auto', padding: '0 24px', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          {/* Left Hero (7 cols) */}
          <div>
            <div className="mf-label" style={{ color: 'var(--green-700)', marginBottom: '12px' }}>
              A COLLEGE DBMS PROJECT
            </div>
            <h1 style={{ fontSize: '52px', lineHeight: '58px', color: 'var(--ink)', marginBottom: '20px' }}>
              A bank that keeps its books where you can see them.
            </h1>
            <p style={{ fontSize: '18px', lineHeight: '28px', color: 'var(--ink-2)', marginBottom: '32px' }}>
              Every rupee in and out is written to a ledger you can read, filter and print.
              Balances change only through strict database stored procedures.
            </p>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" arrow onClick={() => navigate('/register')}>
                Open account
              </Button>
              <Button variant="secondary" onClick={() => navigate('/login')}>
                Log in
              </Button>
            </div>
            <div
              className="tabular-nums"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--ink-3)',
                marginTop: '24px'
              }}
            >
              Transfers with receipts · Fixed deposits · Loans
            </div>
          </div>

          {/* Right Hero (5 cols): Sample Statement Slip */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ transform: 'rotate(1.5deg)', maxWidth: '440px', width: '100%' }}>
              <Slip
                title="Statement · Savings ••••0001"
                subtitle="Period: 01 Oct 2026 – 20 Oct 2026"
                stamp={{ text: 'AUDITED', variant: 'green' }}
                rows={[
                  { label: '01 Oct · Opening deposit', value: '+ ₹5,000.00 ↑' },
                  { label: '05 Oct · Transfer from ••••0002', value: '+ ₹25,000.00 ↑' },
                  { label: '12 Oct · Fixed deposit created', value: '− ₹10,000.00 ↓' },
                  { label: '18 Oct · Loan credited · LN-0001', value: '+ ₹4,80,000.00 ↑' },
                  { label: '20 Oct · Transfer to ••••0004', value: '− ₹1,10,000.00 ↓' },
                  { label: 'CLOSING BALANCE', value: '₹3,90,000.00', bold: true }
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works (3-column band divided by hairlines) */}
      <section id="how-it-works" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', backgroundColor: 'var(--paper)', padding: '56px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
          <div style={{ paddingRight: '24px', borderRight: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 600, color: 'var(--green-900)', marginBottom: '8px' }}>
              01
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Open an account</h3>
            <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '22px' }}>
              Register in two minutes with a demo opening deposit. Experience instant verification and account activation.
            </p>
          </div>

          <div style={{ paddingRight: '24px', borderRight: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 600, color: 'var(--green-900)', marginBottom: '8px' }}>
              02
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Move money</h3>
            <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '22px' }}>
              Pay anyone in MudraFlow by IMPS, NEFT or RTGS, with a review step, live amount in words, and a printable receipt.
            </p>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 600, color: 'var(--green-900)', marginBottom: '8px' }}>
              03
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Grow and borrow</h3>
            <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '22px' }}>
              Lock money in a fixed deposit with the exact maturity amount shown up front, or apply for an education or home loan.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Dark Security Band (--green-950) */}
      <section style={{ backgroundColor: 'var(--green-950)', color: '#FFFFFF', padding: '64px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="mf-label" style={{ color: 'var(--gold)', marginBottom: '12px' }}>
            ACID INTEGRITY & STORED PROCEDURES
          </div>
          <h2 style={{ fontSize: '36px', color: '#FFFFFF', marginBottom: '40px', maxWidth: '700px' }}>
            Built so balances cannot be quietly changed.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
            <div style={{ borderLeft: '2px solid var(--gold)', paddingLeft: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.1em' }}>
                ATOMIC
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px', lineHeight: '20px' }}>
                Every transfer is a single all-or-nothing database transaction. Both sides move together.
              </p>
            </div>

            <div style={{ borderLeft: '2px solid var(--gold)', paddingLeft: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.1em' }}>
                LOCKED
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px', lineHeight: '20px' }}>
                Rows are locked in ordered sequence while money moves, preventing race conditions and overspending.
              </p>
            </div>

            <div style={{ borderLeft: '2px solid var(--gold)', paddingLeft: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.1em' }}>
                AUDITED
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px', lineHeight: '20px' }}>
                Every balance change automatically triggers an audit log recording old and new balances with timestamps.
              </p>
            </div>

            <div style={{ borderLeft: '2px solid var(--gold)', paddingLeft: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.1em' }}>
                CONTROLLED
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px', lineHeight: '20px' }}>
                Balances change only through stored procedures. The application user has no direct UPDATE grant on balances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Closing Row */}
      <section style={{ maxWidth: '1200px', margin: '56px auto', padding: '0 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>
          Open your account in two minutes.
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Button variant="primary" onClick={() => navigate('/register')}>
            Open account
          </Button>
          <Button variant="secondary" onClick={() => navigate('/login')}>
            Log in
          </Button>
        </div>
      </section>

      {/* 6. Footer */}
      <footer style={{ marginTop: 'auto', backgroundColor: 'var(--paper-2)', borderTop: '1px solid var(--line)', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
            MudraFlow
          </span>
          <div style={{ fontSize: '13px', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>MudraFlow is a college project. No real money is involved.</span>
            <Link to="/staff/login" style={{ color: 'var(--ink-2)', textDecoration: 'none' }}>
              Staff login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;

