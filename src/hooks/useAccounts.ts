import { useAuth } from '@/context/AuthContext';
import { subscribeAccounts } from '@/services/accounts';
import type { Account } from '@/types/account';
import { useEffect, useState } from 'react';

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeAccounts(
      (a) => {
        setAccounts(a);
        setLoading(false);
      },
      (e) => {
        console.error('Accounts listener error:', e);
        setLoading(false);
      }
    );
  }, [user]);
  return { accounts: accounts.filter((a) => !a.archived), all: accounts, loading };
}
