import { Button, Field, IconChip, Sheet } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { accountTypeMeta } from '@/types/account';
import { verifiedAgo, type AccountBalance } from '@/utils/accounts';
import { formatINR } from '@/utils/format';
import { useState } from 'react';
import { View } from 'react-native';

// The 30-second weekly check-in: open your bank/card apps, type what they show.
export default function UpdateBalancesSheet({ list, colors, onClose, onSave }: {
  list: AccountBalance[]; colors: Record<string, string>; onClose: () => void;
  onSave: (values: { account: AccountBalance; balance: number }[]) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(list.map((a) => [a.id, String(a.balance)])));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await onSave(list.map((a) => ({ account: a, balance: Number(values[a.id]) || 0 })));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title="Update balances"
      subtitle="Open each app and type what it shows. Ones you don’t change are marked checked too."
      onClose={onClose}
      footer={<Button label="Save balances" icon="checkmark" onPress={save} loading={busy} />}
    >
      {list.map((a) => {
        const v = verifiedAgo(a);
        const d = Math.round((Number(values[a.id]) || 0) - a.balance);
        const good = a.type === 'credit' ? d < 0 : d > 0;
        const hint = d === 0
          ? `Same as before, ${v.label.replace('verified', 'checked')}`
          : `${formatINR(Math.abs(d))} ${d > 0 ? 'more' : 'less'} than your last check (${v.label.replace('verified ', '')})`;
        return (
          <View key={a.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ paddingTop: 30 }}>
              <IconChip icon={accountTypeMeta(a.type).chip} color={colors[a.id]} size={34} />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                money
                label={a.type === 'credit' ? `${a.name}, you owe` : a.name}
                value={values[a.id]}
                onChangeText={(t) => setValues((s) => ({ ...s, [a.id]: t.replace(/[^0-9.-]/g, '') }))}
                selectTextOnFocus
                hint={hint}
                style={d !== 0 ? { color: good ? Corpus.income : Corpus.warning } : undefined}
              />
            </View>
          </View>
        );
      })}
    </Sheet>
  );
}
