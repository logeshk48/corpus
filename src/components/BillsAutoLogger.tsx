import { useToast } from '@/context/ToastContext';
import { useBills } from '@/hooks/useBills';
import { logBillForThisMonth } from '@/services/bills';
import type { Bill } from '@/types/bill';
import { isDueToLog, openDue } from '@/utils/bills';
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
    const key = (b: Bill) => `${b.id}_${openDue(b).key}`;
    const due = bills.filter((b) => isDueToLog(b) && !started.current.has(key(b)));
    if (due.length === 0) return;
    due.forEach((b) => started.current.add(key(b)));

    (async () => {
      const logged: Bill[] = [];
      for (const bill of due) {
        try {
          await logBillForThisMonth(bill, bill.amount, new Date(), openDue(bill).date);
          logged.push(bill);
        } catch (e) {
          console.error('Auto-log bill failed:', e);
          started.current.delete(key(bill)); // allow a retry next time
        }
      }
      if (logged.length === 0) return;
      const total = logged.reduce((s, b) => s + b.amount, 0);
      showToast({
        message:
          logged.length === 1
            ? `${logged[0].name} ${formatINR(logged[0].amount)} recorded`
            : `${logged.length} bills recorded, ${formatINR(total)}`,
      });
    })();
  }, [bills, loading, showToast]);

  return null;
}
