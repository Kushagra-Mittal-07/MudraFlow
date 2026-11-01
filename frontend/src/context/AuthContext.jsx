import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('mf_token'));
  const [role, setRole] = useState(() => localStorage.getItem('mf_role'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mf_user') || 'null');
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('mf_token', token);
      localStorage.setItem('mf_role', role);
      localStorage.setItem('mf_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('mf_token');
      localStorage.removeItem('mf_role');
      localStorage.removeItem('mf_user');
    }
  }, [token, role, user]);

  const loginCustomer = async (customerId, password) => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { customer_id: parseInt(customerId), password }
      });

      if (res.ok && res.data?.token) {
        setToken(res.data.token);
        setRole('customer');
        setUser({
          id: res.data.customer_id,
          name: res.data.full_name,
          role: 'customer'
        });
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
        setToken(res.data.token);
        setRole('staff');
        setUser({
          id: res.data.emp_id,
          name: res.data.full_name,
          branch_name: res.data.branch_name,
          role: 'staff'
        });
        return res.data;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
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

