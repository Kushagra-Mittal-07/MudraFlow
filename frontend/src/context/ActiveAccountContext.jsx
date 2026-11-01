import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../lib/api';

const ActiveAccountContext = createContext(null);

export function ActiveAccountProvider({ children }) {
  const { token, role } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(() => {
    const saved = sessionStorage.getItem('mf_active_account_id');
    return saved ? parseInt(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  // Load accounts when authenticated as customer
  useEffect(() => {
    if (token && role === 'customer') {
      loadAccounts();
    } else {
      setAccounts([]);
      setActiveAccountId(null);
    }
  }, [token, role]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/accounts');
      if (res.ok && Array.isArray(res.data)) {
        setAccounts(res.data);
        // Default to first account or restore from sessionStorage
        if (res.data.length > 0) {
          const saved = sessionStorage.getItem('mf_active_account_id');
          const found = saved ? res.data.find(a => a.account_id === parseInt(saved)) : null;
          const chosen = found ? found.account_id : res.data[0].account_id;
          setActiveAccountId(chosen);
          sessionStorage.setItem('mf_active_account_id', chosen);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchAccount = (id) => {
    const numId = parseInt(id);
    setActiveAccountId(numId);
    sessionStorage.setItem('mf_active_account_id', numId);
  };

  const activeAccount = accounts.find(a => a.account_id === activeAccountId) || accounts[0] || null;

  return (
    <ActiveAccountContext.Provider
      value={{
        accounts,
        activeAccountId,
        activeAccount,
        switchAccount,
        refreshAccounts: loadAccounts,
        loading
      }}
    >
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount() {
  const ctx = useContext(ActiveAccountContext);
  if (!ctx) throw new Error('useActiveAccount must be used within ActiveAccountProvider');
  return ctx;
}

export default ActiveAccountContext;

