import { Button, Choice, Field, Sheet } from '@/components/ui';
import { Corpus, Font, Type } from '@/constants/theme';
import { useGoldRate } from '@/hooks/useGoldRate';
import { ASSET_KINDS, assetKindMeta, type AssetKind, type ManualAsset, type NewManualAsset } from '@/types/asset';
import { formatINR } from '@/utils/format';
import { goldValue, vehicleValue } from '@/utils/netWorth';
import { useState } from 'react';
import { Text, View } from 'react-native';

type Props = { editing?: ManualAsset; onClose: () => void; onSave: (a: NewManualAsset) => Promise<void>; onDelete?: () => void };
const digits = (t: string) => t.replace(/[^0-9.]/g, '');
const KINDS = ASSET_KINDS.map((k) => ({ value: k.id, label: k.id === 'home' ? 'Home' : k.id === 'property' ? 'Property' : k.id === 'other' ? 'Other' : k.label, icon: k.icon }));

// Add or edit something you own that isn't money: a home, a vehicle, gold
export default function AssetSheet({ editing, onClose, onSave, onDelete }: Props) {
  const [kind, setKind] = useState<AssetKind>(editing?.kind ?? 'home');
  const [name, setName] = useState(editing?.name ?? '');
  const [value, setValue] = useState(editing?.value ? String(editing.value) : '');
  const [price, setPrice] = useState(editing?.purchasePrice ? String(editing.purchasePrice) : '');
  const [year, setYear] = useState(editing?.purchaseDate ? String(new Date(editing.purchaseDate).getFullYear()) : '');
  const [grams, setGrams] = useState(editing?.grams ? String(editing.grams) : '');
  const [karat, setKarat] = useState<'24' | '22' | '18'>(String(editing?.karat ?? 22) as '24' | '22' | '18');
  const [rate, setRate] = useState(editing?.rate24k ? String(editing.rate24k) : '');
  const gold = useGoldRate();
  // gold uses today's live (or your own) rate; typing one here is only needed offline
  const effectiveRate = gold.rate ?? (Number(rate) || 0);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const purchaseDate = year.length === 4 ? new Date(Number(year), 6, 1).toISOString() : undefined;
  const preview =
    kind === 'vehicle' && Number(price) > 0 && purchaseDate
      ? vehicleValue(Number(price), purchaseDate)
      : kind === 'gold' && Number(grams) > 0 && effectiveRate > 0
        ? goldValue(Number(grams), Number(karat) as 24 | 22 | 18, effectiveRate)
        : Number(value) || 0;
  const valid = name.trim().length > 0 && preview > 0;

  const save = async () => {
    setTried(true);
    if (!valid || busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    try {
      await onSave({
        name: name.trim(),
        kind,
        value: preview,
        addedAt: editing?.addedAt ?? now,
        updatedAt: now,
        purchasePrice: kind === 'vehicle' && Number(price) > 0 ? Number(price) : undefined,
        purchaseDate: kind === 'vehicle' ? purchaseDate : undefined,
        grams: kind === 'gold' && Number(grams) > 0 ? Number(grams) : undefined,
        karat: kind === 'gold' ? (Number(karat) as 24 | 22 | 18) : undefined,
        rate24k: kind === 'gold' && effectiveRate > 0 ? effectiveRate : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={editing ? editing.name : 'Something you own'}
      subtitle={assetKindMeta(kind).hint.replace(' — ', '. ')}
      onClose={onClose}
      footer={
        <>
          <Button label={editing ? 'Save changes' : preview > 0 ? `Add, worth ${formatINR(preview)}` : 'Add'} onPress={save} loading={busy} />
          {editing && onDelete && <Button variant="quiet" icon="trash-outline" label="Remove" onPress={onDelete} />}
        </>
      }
    >
      <Choice label="What is it" options={KINDS} value={kind} onChange={setKind} />
      <Field label="Name" value={name} onChangeText={setName} placeholder={kind === 'vehicle' ? 'Activa, Swift' : kind === 'gold' ? 'Wedding gold' : 'Our flat'} maxLength={30}
        error={tried && !name.trim() ? 'Give it a name' : undefined} />

      {kind === 'vehicle' ? (
        <>
          <Field money label="Price you paid, on-road" value={price} onChangeText={(t) => setPrice(digits(t))} placeholder="95,000" />
          <Field label="Year bought" value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="2023" keyboardType="number-pad"
            hint="The value drops every year the way insurers count it, down to half by year 5." />
        </>
      ) : kind === 'gold' ? (
        <>
          <Field label="Weight in grams" value={grams} onChangeText={(t) => setGrams(digits(t))} placeholder="40" keyboardType="decimal-pad" />
          <Choice label="Purity" options={[{ value: '22' as const, label: '22K jewellery' }, { value: '24' as const, label: '24K' }, { value: '18' as const, label: '18K' }]} value={karat} onChange={setKarat} />
          {gold.rate ? (
            <Text style={{ fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 }}>
              Uses {gold.mode === 'live' ? 'today’s market' : 'your own'} 24K rate of {formatINR(gold.rate)} a gram, and updates by itself. Making charges and GST aren’t counted, since you wouldn’t get them back.
            </Text>
          ) : (
            <Field money label="Today’s 24K rate per gram" value={rate} onChangeText={(t) => setRate(digits(t))} placeholder="Check a jeweller" />
          )}
        </>
      ) : (
        <Field money label="What could you sell it for today" value={value} onChangeText={(t) => setValue(digits(t))} placeholder="A rough figure is fine"
          error={tried && !(preview > 0) ? 'Enter a value' : undefined} />
      )}

      {preview > 0 && kind !== 'home' && kind !== 'property' && kind !== 'other' && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', backgroundColor: Corpus.bg, borderRadius: 16, padding: 14 }}>
          <Text style={{ fontSize: Type.bodyLg, color: Corpus.textMuted }}>Counted as</Text>
          <Text style={{ fontSize: Type.title, fontFamily: Font.display, color: Corpus.text }}>{formatINR(preview)}</Text>
        </View>
      )}
    </Sheet>
  );
}
