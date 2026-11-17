import { Button, Field, Sheet, Toggle } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { saveSettings } from '@/services/settings';
import type { Settings } from '@/types/settings';
import { useEffect, useState } from 'react';

const lakh = (s: string) => { const n = Number(s.replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? Math.round(n * 100000) : undefined; };
const toLakh = (n?: number) => (n ? String(Math.round((n / 100000) * 10) / 10) : '');

// Two quick questions about insurance. The app can't see your policies, so you tell it once.
export default function ProtectionSheet({ open, value, yearlyIncome, onClose }: {
  open: boolean; value: Settings['protection']; yearlyIncome: number; onClose: () => void;
}) {
  const { showToast } = useToast();
  const [health, setHealth] = useState(false);
  const [healthCover, setHealthCover] = useState('');
  const [dependents, setDependents] = useState(false);
  const [term, setTerm] = useState(false);
  const [termCover, setTermCover] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHealth(!!value?.health); setHealthCover(toLakh(value?.healthCover));
    setDependents(!!value?.dependents); setTerm(!!value?.term); setTermCover(toLakh(value?.termCover));
  }, [open, value]);
  if (!open) return null;

  const need = yearlyIncome * 10;
  const save = async () => {
    setBusy(true);
    try {
      await saveSettings({ protection: {
        health, ...(health && lakh(healthCover) ? { healthCover: lakh(healthCover) } : {}),
        dependents, term: dependents && term, ...(dependents && term && lakh(termCover) ? { termCover: lakh(termCover) } : {}),
        answeredAt: new Date().toISOString(),
      } });
      onClose();
      showToast({ message: 'Saved. Your score now includes insurance' });
    } finally { setBusy(false); }
  };

  return (
    <Sheet title="Your insurance" subtitle="The app can't see your policies, so tell it once. You can change this any time." onClose={onClose}
      footer={<Button label="Save answers" icon="checkmark" onPress={save} loading={busy} />}>
      <Toggle icon="medkit" title="I have health insurance" value={health} onChange={setHealth}
        hint="From work or bought yourself. A family floater counts." />
      {health && (
        <Field label="Total cover, in lakh (optional)" value={healthCover} onChangeText={setHealthCover} keyboardType="decimal-pad" placeholder="5"
          hint={lakh(healthCover) ? `₹${(lakh(healthCover)! / 100000).toLocaleString('en-IN')} lakh. ₹5 lakh or more gets full points` : '₹5 lakh or more gets full points'} />
      )}
      <Toggle icon="people" title="Someone depends on my income" value={dependents} onChange={setDependents}
        hint="A partner, children or parents who would struggle without it" />
      {dependents && (
        <>
          <Toggle icon="umbrella" title="I have term life insurance" value={term} onChange={setTerm}
            hint="Pays your family if you die. Not an investment plan or ULIP." />
          {term && (
            <Field label="Term cover, in lakh (optional)" value={termCover} onChangeText={setTermCover} keyboardType="decimal-pad" placeholder="100"
              hint={need > 0 ? `About ₹${Math.round(need / 100000).toLocaleString('en-IN')} lakh (10× your yearly income) gets full points` : '10× your yearly income gets full points'} />
          )}
        </>
      )}
    </Sheet>
  );
}
