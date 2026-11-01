import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home as HomeIcon,
  ArrowRightLeft,
  Users,
  Clock,
  PiggyBank,
  Briefcase,
  User,
  LogOut,
  Menu,
  X,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useActiveAccount } from '../context/ActiveAccountContext';
import AccountSwitcher from './AccountSwitcher';
import Banner from './Banner';
import Tag from './Tag';

export function AppShell({ title = 'Overview', children }) {
  const { user, role, logout } = useAuth();
  const { activeAccount } = useActiveAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isStaff = role === 'staff';
  const sidebarBg = isStaff ? 'var(--green-950)' : 'var(--green-900)';
  const isFrozen = activeAccount?.status === 'FROZEN';

  const handleLogout = () => {
    logout();
    navigate(isStaff ? '/staff/login' : '/login');
  };

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    height: '42px',
    padding: '0 20px',
    color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)',
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.10)' : 'transparent',
    borderLeft: isActive ? '3px solid #FFFFFF' : '3px solid transparent',
    fontSize: '15px',
    fontFamily: 'var(--font-sans)',
    fontWeight: isActive ? 600 : 400,
    textDecoration: 'none',
    transition: 'all 120ms ease'
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--page)' }}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(18, 21, 18, 0.4)',
            zIndex: 900
          }}
        />
      )}

      {/* Sidebar (Desktop fixed 248px / Mobile off-canvas) */}
      <aside
        style={{
          width: 'var(--sidebar-w)',
          backgroundColor: sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 950,
          transition: 'transform 200ms ease'
        }}
        className={`mf-sidebar ${mobileMenuOpen ? 'mf-sidebar-open' : ''}`}
      >
        {/* Top Logo */}
        <div
          style={{
            height: 'var(--topbar-h)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '24px',
                fontWeight: 700,
                color: '#FFFFFF'
              }}
            >
              MudraFlow
            </span>
            {isStaff && <Tag status="STAFF">STAFF</Tag>}
          </div>

          <button
            type="button"
            className="mf-mobile-only"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#FFFFFF', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }}>
          {!isStaff ? (
            <>
              {/* Customer Nav */}
              <NavLink to="/app" end style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <HomeIcon size={18} strokeWidth={1.5} />
                <span>Home</span>
              </NavLink>

              <div style={{ padding: '16px 20px 6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                MONEY
              </div>
              <NavLink to="/app/transfer" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <ArrowRightLeft size={18} strokeWidth={1.5} />
                <span>Transfer</span>
              </NavLink>
              <NavLink to="/app/payees" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <Users size={18} strokeWidth={1.5} />
                <span>Payees</span>
              </NavLink>
              <NavLink to="/app/history" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <Clock size={18} strokeWidth={1.5} />
                <span>History</span>
              </NavLink>

              <div style={{ padding: '16px 20px 6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                GROW
              </div>
              <NavLink to="/app/fd" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <PiggyBank size={18} strokeWidth={1.5} />
                <span>Fixed dep.</span>
              </NavLink>
              <NavLink to="/app/services" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <Briefcase size={18} strokeWidth={1.5} />
                <span>Services</span>
              </NavLink>

              <div style={{ padding: '16px 20px 6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                ACCOUNT
              </div>
              <NavLink to="/app/profile" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <User size={18} strokeWidth={1.5} />
                <span>Profile</span>
              </NavLink>
            </>
          ) : (
            <>
              {/* Staff Nav */}
              <NavLink to="/staff" end style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <HomeIcon size={18} strokeWidth={1.5} />
                <span>Overview</span>
              </NavLink>
              <NavLink to="/staff/approvals" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <FileCheck size={18} strokeWidth={1.5} />
                <span>Approvals</span>
              </NavLink>
              <NavLink to="/staff/customers" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <Users size={18} strokeWidth={1.5} />
                <span>Customers</span>
              </NavLink>
              <NavLink to="/staff/transactions" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <Clock size={18} strokeWidth={1.5} />
                <span>Transactions</span>
              </NavLink>
              <NavLink to="/staff/fd" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                <PiggyBank size={18} strokeWidth={1.5} />
                <span>FD maturities</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User Block & Logout */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '14px' }}>
            {user?.name || (isStaff ? 'Staff Member' : 'Account Holder')}
          </div>
          <div
            className="tabular-nums"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.65)',
              margin: '2px 0 8px 0'
            }}
          >
            {user?.id ? (isStaff ? `EMP-${user.id}` : user.id) : ''}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'; }}
          >
            <LogOut size={14} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div
        style={{
          flex: 1,
          marginLeft: 'var(--sidebar-w)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: 'calc(100% - var(--sidebar-w))'
        }}
        className="mf-main-wrapper"
      >
        {/* Top bar (64px) */}
        <header
          style={{
            height: 'var(--topbar-h)',
            backgroundColor: 'var(--page)',
            borderBottom: '1px solid var(--line)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 400
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              className="mf-mobile-only"
              onClick={() => setMobileMenuOpen(true)}
              style={{ padding: '6px' }}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--ink)'
              }}
            >
              {title}
            </h1>
          </div>

          <div>
            {!isStaff ? (
              <AccountSwitcher />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
                  {user?.name || 'Staff'}
                </span>
                <span className="tabular-nums" style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
                  {user?.branch_name || 'Branch'}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Frozen Account Alert Banner */}
        {!isStaff && isFrozen && (
          <div style={{ padding: '16px 24px 0 24px', maxWidth: 'var(--content-max)', margin: '0 auto', width: '100%' }}>
            <Banner variant="error">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} />
                <span>
                  <strong>This account is frozen.</strong> Transfers are disabled. Contact your branch.
                </span>
              </div>
            </Banner>
          </div>
        )}

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            padding: '24px',
            maxWidth: 'var(--content-max)',
            margin: '0 auto',
            width: '100%',
            paddingBottom: '80px' // room for bottom tab bar on mobile
          }}
        >
          {children}
        </main>

        {/* Customer Bottom Tab Bar (< 768px) */}
        {!isStaff && (
          <nav
            className="mf-mobile-only"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: '56px',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              zIndex: 800
            }}
          >
            {[
              { to: '/app', label: 'Home', icon: HomeIcon, end: true },
              { to: '/app/transfer', label: 'Transfer', icon: ArrowRightLeft },
              { to: '/app/history', label: 'History', icon: Clock },
              { to: '/app/services', label: 'Services', icon: Briefcase },
              { to: '/app/profile', label: 'Profile', icon: User }
            ].map((tab) => {
              const isActive = tab.end
                ? location.pathname === tab.to
                : location.pathname.startsWith(tab.to);

              const Icon = tab.icon;

              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    color: isActive ? 'var(--green-900)' : 'var(--ink-3)',
                    borderTop: isActive ? '2px solid var(--green-900)' : '2px solid transparent',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 500
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

export default AppShell;

