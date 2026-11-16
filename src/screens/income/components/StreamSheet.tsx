import { Button, Choice, Field, Sheet } from '@/components/ui';
import { STREAM_TYPES, type IncomeStream, type NewIncomeStream, type StreamType } from '@/types/incomeStream';
import { Corpus, Type } from '@/constants/theme';
import { useState } from 'react';
import { Text } from 'react-native';

const TYPES = STREAM_TYPES.map((t) => ({ value: t.id, label: t.label, icon: `${t.icon}-outline` }));
const HINT: Record<StreamType, string> = { salary: 'Salary', client: 'Zenith Studio', business: 'My shop', other: 'Rent from flat' };

// Add or edit one place your money comes from
export default function StreamSheet({ stream, onClose, onSave, onDelete }: {
  stream?: IncomeStream; onClose: () => void; onSave: (s: NewIncomeStream) => Promise<void>; onDelete?: () => void;
}) {
  const [name, setName] = useState(stream?.name ?? '');
  const [type, setType] = useState<StreamType>(stream?.type ?? 'salary');
  const [fixed, setFixed] = useState<'varies' | 'fixed'>(stream?.fixed ? 'fixed' : 'varies');
  const [expected, setExpected] = useState(stream?.expectedMonthly ? String(stream.expectedMonthly) : '');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const n = expected.trim() === '' ? undefined : Number(expected);
  const isFixed = fixed === 'fixed';
  const bad = isFixed ? !(n !== undefined && Number.isFinite(n) && n > 0) && tried : false;

  const save = async () => {
    setTried(true);
    if (!name.trim() || busy) return;
    if (isFixed && !(n !== undefined && Number.isFinite(n) && n > 0)) return;
    setBusy(true);
    try { await onSave({ name: name.trim(), type, fixed: isFixed, expectedMonthly: isFixed ? n : stream?.expectedMonthly }); } finally { setBusy(false); }
  };

  return (
    <Sheet
      title={stream ? stream.name : 'New income source'}
      subtitle="A salary, a client, a business: anywhere money comes from"
      onClose={onClose}
      footer={
        <>
          <Button label={stream ? 'Save changes' : 'Add source'} onPress={save} loading={busy} />
          {stream && onDelete ? <Button variant="quiet" icon="trash-outline" label="Delete source" onPress={onDelete} disabled={busy} /> : null}
        </>
      }
    >
      <Choice tiles label="Type" options={TYPES} value={type} onChange={setType} />
      <Field label="Name" value={name} onChangeText={setName} placeholder={HINT[type]} maxLength={40} autoFocus={!stream} autoCapitalize="words"
        error={tried && !name.trim() ? 'Give it a name' : undefined} />
      <Choice
        label="The amount"
        options={[{ value: 'varies' as const, label: 'Changes every month' }, { value: 'fixed' as const, label: 'Same every month' }]}
        value={fixed}
        onChange={setFixed}
      />
      {isFixed ? (
        <Field money label="Amount a month" value={expected} onChangeText={(t) => setExpected(t.replace(/[^0-9]/g, ''))} placeholder="50,000"
          error={bad ? 'Enter the monthly amount' : undefined} hint="Shows how much is still to come each month." />
      ) : (
        <Text style={{ fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19 }}>
          No need to guess a number. Tap “Got paid” whenever money comes in and Corpus learns your usual range.
        </Text>
      )}
    </Sheet>
  );
}
