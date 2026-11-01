import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActiveAccountProvider } from './context/ActiveAccountContext';

// Public pages
import Landing from './pages/public/Landing';
import Register from './pages/public/Register';
import Login from './pages/public/Login';
import StaffLogin from './pages/public/StaffLogin';
import Styleguide from './pages/Styleguide';

// Customer pages
import Home from './pages/customer/Home';
import Transfer from './pages/customer/Transfer';
import Payees from './pages/customer/Payees';
import History from './pages/customer/History';
import Receipt from './pages/customer/Receipt';
import AppShell from './components/AppShell';

// Route guard for customer routes
function RequireCustomer({ children }) {
  const { token, role } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role !== 'customer') {
    return <Navigate to="/staff" replace />;
  }

  return children;
}

// Route guard for staff routes
function RequireStaff({ children }) {
  const { token, role } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }
  if (role !== 'staff') {
    return <Navigate to="/app" replace />;
  }

  return children;
}

// Placeholder for staff overview
function StaffOverviewPlaceholder() {
  return (
    <AppShell title="Staff Overview">
      <div className="mf-panel">
        <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Staff Portal Active</h3>
        <p className="mf-helper">Phase 5 will implement full staff oversight screens.</p>
      </div>
    </AppShell>
  );
}

// Placeholder for yet-to-be-built customer subroutes (Phase 4 Part C)
function PlaceholderPage({ title }) {
  return (
    <AppShell title={title}>
      <div className="mf-panel">
        <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>{title}</h3>
        <p className="mf-helper">This screen will be built in the upcoming phase.</p>
      </div>
    </AppShell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/styleguide" element={<Styleguide />} />

      {/* Customer Routes */}
      <Route
        path="/app"
        element={
          <RequireCustomer>
            <Home />
          </RequireCustomer>
        }
      />
      <Route
        path="/app/transfer"
        element={
          <RequireCustomer>
            <Transfer />
          </RequireCustomer>
        }
      />
      <Route
        path="/app/payees"
        element={
          <RequireCustomer>
            <Payees />
          </RequireCustomer>
        }
      />
      <Route
        path="/app/history"
        element={
          <RequireCustomer>
            <History />
          </RequireCustomer>
        }
      />
      <Route
        path="/app/receipt/:reference"
        element={
          <RequireCustomer>
            <Receipt />
          </RequireCustomer>
        }
      />
      <Route
        path="/app/fd"
        element={
          <RequireCustomer>
            <PlaceholderPage title="Fixed Deposits" />
          </RequireCustomer>
        }
      />
      <Route
        path="/app/services"
        element={
          <RequireCustomer>
            <PlaceholderPage title="Services & Applications" />
          </RequireCustomer>
        }
      />
      <Route
        path="/app/profile"
        element={
          <RequireCustomer>
            <PlaceholderPage title="Profile & Account Details" />
          </RequireCustomer>
        }
      />

      {/* Staff Routes */}
      <Route
        path="/staff"
        element={
          <RequireStaff>
            <StaffOverviewPlaceholder />
          </RequireStaff>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ActiveAccountProvider>
        <AppRoutes />
      </ActiveAccountProvider>
    </AuthProvider>
  );
}

export default App;
