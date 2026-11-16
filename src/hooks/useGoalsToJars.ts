import { updateInvestment } from '@/services/investments';
import { saveSettings } from '@/services/settings';
import { addVault } from '@/services/vaults';
import type { Investment } from '@/types/investment';
import type { InvestGoal } from '@/types/settings';
import { VAULT_COLORS } from '@/types/vault';
import { useEffect } from 'react';

let running = false; // one move at a time, even if two screens mount together

// Goals used to live in Invest. Now one goal = one jar (cash + linked investments).
// Moves any old Invest goals into jars once, keeping their linked holdings.
export function useGoalsToJars(goals: InvestGoal[] | undefined, investments: Investment[], ready: boolean) {
  useEffect(() => {
    if (!ready || !goals?.length || running) return;
    running = true;
    (async () => {
      for (const g of goals) {
        const by = new Date(g.by);
        const id = await addVault({
          name: g.name,
          icon: 'flag',
          color: VAULT_COLORS[2],
          goal: g.target,
          targetDate: `${by.getFullYear()}-${String(by.getMonth() + 1).padStart(2, '0')}`,
          kind: 'goal',
        });
        await Promise.all(investments.filter((h) => h.goalId === g.id).map((h) => updateInvestment(h.id, { goalId: id })));
      }
      await saveSettings({ investGoals: undefined });
    })()
      .catch((e) => console.error('Moving goals to jars failed:', e))
      .finally(() => { running = false; });
  }, [ready, goals, investments]);
}
