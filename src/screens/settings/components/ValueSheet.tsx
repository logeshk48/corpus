import { Button, Field, Sheet, Stepper } from '@/components/ui';
import { saveSettings } from '@/services/settings';
import type { Settings } from '@/types/settings';
import { formatINR, ordinal as ord } from '@/utils/format';
import { useState } from 'react';

export type ValueKind = 'name' | 'budget' | 'aside' | 'cycle';


// One setting at a time, in its own sheet: type it, save it, done. Nothing waits on a "Save changes" button.
export default function ValueSheet({ kind, settings, onClose }: { kind: ValueKind; settings: Settings; onClose: () => void }) {
  const [text, setText] = useState(() =>
    kind === 'name' ? settings.displayName ?? '' : kind === 'budget' ? (settings.monthlyBudget ? String(settings.monthlyBudget) : '') : kind === 'aside' ? (settings.setAside ? String(settings.setAside) : '') : '');
  const [day, setDay] = useState(settings.cycleStartDay ?? 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const n = Number(text.replace(/[^0-9.]/g, ''));

  const save = async () => {
    if ((kind === 'budget' || kind === 'aside') && text.trim() !== '' && !(n >= 0)) return setErr('Type an amount in rupees');
    setBusy(true);
    setErr('');
    try {
      if (kind === 'name') await saveSettings({ displayName: text.trim() || undefined });
      if (kind === 'budget') await saveSettings({ monthlyBudget: text.trim() && n > 0 ? Math.round(n) : undefined });
      if (kind === 'aside') await saveSettings({ setAside: text.trim() && n > 0 ? Math.round(n) : undefined });
      if (kind === 'cycle') await saveSettings({ cycleStartDay: day > 1 ? day : undefined });
      onClose();
    } catch {
      setErr('Could not save. Check your connection and try again.');
      setBusy(false);
    }
  };

  const meta = {
    name: { title: 'Your name', sub: 'Shown in the greeting on Today' },
    budget: { title: 'Monthly budget', sub: 'The most you want to spend in a month. Budgets and Safe to spend use it.' },
    aside: { title: 'Kept aside', sub: 'Money in your account that is not for spending. Safe to spend leaves it out.' },
    cycle: { title: 'Month starts on', sub: 'Set it to your pay day so each month runs from one pay day to the next.' },
  }[kind];

  return (
    <Sheet title={meta.title} subtitle={meta.sub} onClose={onClose} footer={<Button label="Save" icon="checkmark" onPress={save} loading={busy} />}>
      {kind === 'name' && <Field label="Name" value={text} onChangeText={setText} placeholder="First name" maxLength={30} autoFocus error={err || undefined} onSubmitEditing={save} returnKeyType="done" />}
      {(kind === 'budget' || kind === 'aside') && (
        <Field
          label={kind === 'budget' ? 'Budget a month' : 'Amount'}
          money
          value={text}
          onChangeText={(t) => setText(t.replace(/[^0-9]/g, ''))}
          placeholder={kind === 'budget' ? '25000' : '0'}
          autoFocus
          error={err || undefined}
          hint={n > 0 ? `${formatINR(n)}${kind === 'budget' ? ' a month, about ' + formatINR(Math.round(n / 30)) + ' a day' : ''}` : kind === 'budget' ? 'Leave empty for no budget' : 'Leave empty if everything is for spending'}
          onSubmitEditing={save}
          returnKeyType="done"
        />
      )}
      {kind === 'cycle' && (
        <Stepper
          label="Day of the month"
          value={ord(day)}
          sub={day === 1 ? 'Calendar month' : `Runs ${ord(day)} to ${ord(day - 1)} of the next month`}
          onPrev={() => setDay(Math.max(1, day - 1))}
          onNext={() => setDay(Math.min(28, day + 1))}
          prevDisabled={day <= 1}
          nextDisabled={day >= 28}
          hint={err || 'Days 29 to 31 are left out because not every month has them.'}
        />
      )}
    </Sheet>
  );
}
