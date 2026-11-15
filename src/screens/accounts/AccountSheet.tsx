import { Button, Choice, Field, Sheet, Toggle } from '@/components/ui';
import { ACCOUNT_TYPES, accountTypeMeta, type AccountType, type NewAccount } from '@/types/account';
import type { AccountBalance } from '@/utils/accounts';
import { formatINR } from '@/utils/format';
import { useState } from 'react';
import { View } from 'react-native';

type Props = {
  editing?: AccountBalance;
  isDefault: boolean;
  onClose: () => void;
  onSave: (a: NewAccount, makeDefault: boolean, newBalance: number) => Promise<void>;
  onDelete?: () => void;
  initialType?: AccountType;
};

const num = (t: string) => t.replace(/[^0-9.]/g, '');
const day = (t: string) => {
  const n = Number(t.replace(/\D/g, ''));
  return n >= 1 && n <= 31 ? n : undefined;
};
const TYPES = ACCOUNT_TYPES.map((t) => ({ value: t.id, label: t.id === 'credit' ? 'Card' : t.label, icon: t.icon }));

export default function AccountSheet({ editing, isDefault, onClose, onSave, onDelete, initialType }: Props) {
  const [type, setType] = useState<AccountType>(editing?.type ?? initialType ?? 'bank');
  const [name, setName] = useState(editing?.name ?? '');
  // When editing, you type the balance RIGHT NOW; the screen saves the change as a check-in
  const [balance, setBalance] = useState(editing ? String(editing.balance) : '');
  const [limit, setLimit] = useState(editing?.creditLimit ? String(editing.creditLimit) : '');
  const [stmt, setStmt] = useState(editing?.statementDay ? String(editing.statementDay) : '');
  const [due, setDue] = useState(editing?.dueDay ? String(editing.dueDay) : '');
  const [makeDefault, setMakeDefault] = useState(isDefault);
  const [minBal, setMinBal] = useState(editing?.minBalance ? String(editing.minBalance) : '');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const credit = type === 'credit';
  const value = balance === '' || balance === '-' ? 0 : Number(balance);
  const nameError = tried && !name.trim() ? 'Give it a name, like “HDFC Savings”' : undefined;
  const amountError = isNaN(value) ? 'Use numbers only' : undefined;
  const dayError = (t: string) => (t && !day(t) ? 'A day from 1 to 31' : undefined);

  const save = async () => {
    setTried(true);
    if (!name.trim() || isNaN(value) || busy || dayError(stmt) || dayError(due)) return;
    setBusy(true);
    try {
      const opening = editing ? editing.opening : value;
      await onSave(
        {
          name: name.trim(),
          type,
          opening: Math.round(opening * 100) / 100,
          openingDate: editing?.openingDate ?? new Date().toISOString(),
          verifiedAt: editing ? editing.verifiedAt : new Date().toISOString(),
          creditLimit: credit && Number(limit) > 0 ? Number(limit) : undefined,
          statementDay: credit ? day(stmt) : undefined,
          dueDay: credit ? day(due) : undefined,
          minBalance: type === 'bank' && Number(minBal) > 0 ? Number(minBal) : undefined,
        },
        makeDefault,
        value
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={editing ? editing.name : 'New account'}
      subtitle={accountTypeMeta(type).hint}
      onClose={onClose}
      footer={
        <>
          <Button label={editing ? 'Save changes' : balance ? `Add account · ${formatINR(value)}` : 'Add account'} onPress={save} loading={busy} />
          {editing && onDelete && <Button variant="danger" icon="trash-outline" label="Delete account" onPress={onDelete} />}
        </>
      }
    >
      <Choice tiles label="Type" options={TYPES} value={type} onChange={setType} />

      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder={credit ? 'SBI Card' : type === 'cash' ? 'Cash' : type === 'wallet' ? 'Paytm wallet' : 'HDFC Savings'}
        maxLength={30}
        error={nameError}
        autoCapitalize="words"
      />

      <Field
        money
        label={credit ? 'You owe on it right now' : 'Balance right now'}
        value={balance}
        onChangeText={(t) => setBalance(t.replace(/[^0-9.-]/g, ''))}
        placeholder="0"
        error={amountError}
        selectTextOnFocus
        hint={editing ? 'Type what your bank or card app shows today. Saved as a check-in.' : 'Check your bank or card app. After this, Corpus keeps it updated as you add entries.'}
      />

      {credit && (
        <>
          <Field money label="Credit limit" value={limit} onChangeText={(t) => setLimit(num(t))} placeholder="50,000" hint="Optional. Shows how much of the limit you use." />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Bill made on" value={stmt} onChangeText={(t) => setStmt(t.replace(/\D/g, '').slice(0, 2))} placeholder="Day, e.g. 15" keyboardType="number-pad" error={dayError(stmt)} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Pay by" value={due} onChangeText={(t) => setDue(t.replace(/\D/g, '').slice(0, 2))} placeholder="Day, e.g. 5" keyboardType="number-pad" error={dayError(due)} />
            </View>
          </View>
        </>
      )}

      {type === 'bank' && (
        <Field money label="Minimum balance" value={minBal} onChangeText={(t) => setMinBal(num(t))} placeholder="10,000" hint="Optional. Corpus warns you before you go below it." />
      )}

      {!credit && <Toggle title="Use by default" hint="Picked for you when you add an expense or income" value={makeDefault} onChange={setMakeDefault} />}
    </Sheet>
  );
}
