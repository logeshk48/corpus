import { useAuth } from '@/context/AuthContext';
import { subscribeVaultEntries, subscribeVaults } from '@/services/vaults';
import type { Vault, VaultEntry, VaultWithBalance } from '@/types/vault';
import { getRange, isInRange } from '@/utils/dates';
import { useEffect, useState } from 'react';

export function useVaults() {
  const { user } = useAuth();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [vaultsReady, setVaultsReady] = useState(false);
  const [entriesReady, setEntriesReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setVaults([]);
      setEntries([]);
      setVaultsReady(true);
      setEntriesReady(true);
      return;
    }
    const logError = (e: Error) => console.error('Vaults listener error:', e);
    const stopVaults = subscribeVaults((v) => {
      setVaults(v);
      setVaultsReady(true);
    }, logError);
    const stopEntries = subscribeVaultEntries((e) => {
      setEntries(e);
      setEntriesReady(true);
    }, logError);
    return () => {
      stopVaults();
      stopEntries();
    };
  }, [user]);

  // Balance = everything put in − everything taken out
  const month = getRange('month');
  const withBalances: VaultWithBalance[] = vaults.map((v) => {
    let balance = 0;
    let addedThisMonth = 0;
    let takenThisMonth = 0;
    for (const e of entries) {
      if (e.vaultId !== v.id) continue;
      const sign = e.type === 'in' ? 1 : -1;
      balance += sign * e.amount;
      if (isInRange(e.date, month)) {
        if (e.type === 'in') addedThisMonth += e.amount;
        else takenThisMonth += e.amount;
      }
    }
    return { ...v, balance, addedThisMonth, takenThisMonth };
  });

  const total = withBalances.reduce((sum, v) => sum + v.balance, 0);
  const addedThisMonth = withBalances.reduce((sum, v) => sum + v.addedThisMonth, 0);

  return {
    vaults: withBalances,
    entries,
    total,
    addedThisMonth,
    loading: !vaultsReady || !entriesReady,
  };
}
