import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const location = useLocation();
  const isStaffRoute = location.pathname.startsWith('/staff');

  const getInitialToken = (staff) => {
    if (staff) {
      return localStorage.getItem('mf_staff_token') || (localStorage.getItem('mf_role') === 'staff' ? localStorage.getItem('mf_token') : null);
    }
    return localStorage.getItem('mf_customer_token') || (localStorage.getItem('mf_role') === 'customer' ? localStorage.getItem('mf_token') : null);
  };

  const getInitialRole = (staff) => {
    if (staff) {
      return localStorage.getItem('mf_staff_role') || (localStorage.getItem('mf_role') === 'staff' ? 'staff' : null);
    }
    return localStorage.getItem('mf_customer_role') || (localStorage.getItem('mf_role') === 'customer' ? 'customer' : null);
  };

  const getInitialUser = (staff) => {
    try {
      const raw = staff
        ? (localStorage.getItem('mf_staff_user') || (localStorage.getItem('mf_role') === 'staff' ? localStorage.getItem('mf_user') : null))
        : (localStorage.getItem('mf_customer_user') || (localStorage.getItem('mf_role') === 'customer' ? localStorage.getItem('mf_user') : null));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const [token, setToken] = useState(() => getInitialToken(isStaffRoute));
  const [role, setRole] = useState(() => getInitialRole(isStaffRoute));
  const [user, setUser] = useState(() => getInitialUser(isStaffRoute));
  const [loading, setLoading] = useState(false);

  // Synchronize active credentials when switching between /staff and /app
  useEffect(() => {
    const activeIsStaff = location.pathname.startsWith('/staff');
    const expectedToken = getInitialToken(activeIsStaff);
    const expectedRole = getInitialRole(activeIsStaff);
    const expectedUser = getInitialUser(activeIsStaff);

    if (expectedToken !== token || expectedRole !== role) {
      setToken(expectedToken);
      setRole(expectedRole);
      setUser(expectedUser);
    }
  }, [location.pathname]);

  const loginCustomer = async (customerId, password) => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { customer_id: parseInt(customerId), password }
      });

      if (res.ok && res.data?.token) {
        const u = {
          id: res.data.customer_id,
          name: res.data.full_name,
          role: 'customer'
        };
        localStorage.setItem('mf_customer_token', res.data.token);
        localStorage.setItem('mf_customer_role', 'customer');
        localStorage.setItem('mf_customer_user', JSON.stringify(u));
        localStorage.setItem('mf_token', res.data.token);
        localStorage.setItem('mf_role', 'customer');
        localStorage.setItem('mf_user', JSON.stringify(u));

        setToken(res.data.token);
        setRole('customer');
        setUser(u);
        return res.data;
      }
    } finally {
      setLoading(false);
    }
  };

  const loginStaff = async (empId, password) => {
    setLoading(true);
    try {
      const res = await apiRequest('/staff/auth/login', {
        method: 'POST',
        body: { emp_id: empId, password }
      });

      if (res.ok && res.data?.token) {
        const u = {
          id: res.data.emp_id,
          name: res.data.full_name,
          branch_name: res.data.branch_name,
          role: 'staff'
        };
        localStorage.setItem('mf_staff_token', res.data.token);
        localStorage.setItem('mf_staff_role', 'staff');
        localStorage.setItem('mf_staff_user', JSON.stringify(u));
        localStorage.setItem('mf_token', res.data.token);
        localStorage.setItem('mf_role', 'staff');
        localStorage.setItem('mf_user', JSON.stringify(u));

        setToken(res.data.token);
        setRole('staff');
        setUser(u);
        return res.data;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const isStaff = role === 'staff';
    if (isStaff) {
      localStorage.removeItem('mf_staff_token');
      localStorage.removeItem('mf_staff_role');
      localStorage.removeItem('mf_staff_user');
    } else {
      localStorage.removeItem('mf_customer_token');
      localStorage.removeItem('mf_customer_role');
      localStorage.removeItem('mf_customer_user');
    }
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_role');
    localStorage.removeItem('mf_user');
    setToken(null);
    setRole(null);
    setUser(null);
    sessionStorage.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        user,
        isAuthenticated: !!token,
        loading,
        loginCustomer,
        loginStaff,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

