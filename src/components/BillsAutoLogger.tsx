import { useToast } from '@/context/ToastContext';
import { useBills } from '@/hooks/useBills';
import { logBillForThisMonth } from '@/services/bills';
import type { Bill } from '@/types/bill';
import { isDueToLog, yearMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { useEffect, useRef } from 'react';

// Invisible helper: when a bill's due day arrives, record it as an expense — once.
// Mounted inside the signed-in tabs, so it runs every time the app is opened.
export default function BillsAutoLogger() {
  const { bills, loading } = useBills();
  const { showToast } = useToast();
  const started = useRef(new Set<string>()); // bill+month keys already being logged this session

  useEffect(() => {
    if (loading) return;
    const ym = yearMonth(new Date());
    const due = bills.filter((b) => isDueToLog(b) && !started.current.has(`${b.id}_${ym}`));
    if (due.length === 0) return;
    due.forEach((b) => started.current.add(`${b.id}_${ym}`));

    (async () => {
      const logged: Bill[] = [];
      for (const bill of due) {
        try {
          await logBillForThisMonth(bill);
          logged.push(bill);
        } catch (e) {
          console.error('Auto-log bill failed:', e);
          started.current.delete(`${bill.id}_${ym}`); // allow a retry next time
        }
      }
      if (logged.length === 0) return;
      const month = new Date().toLocaleDateString('en-IN', { month: 'long' });
      const total = logged.reduce((s, b) => s + b.amount, 0);
      showToast({
        message:
          logged.length === 1
            ? `🔁 ${logged[0].name} ${formatINR(logged[0].amount)} logged for ${month}`
            : `🔁 ${logged.length} bills logged for ${month} · ${formatINR(total)}`,
      });
    })();
  }, [bills, loading, showToast]);

  return null;
}
