import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import { ASSET_KINDS, assetKindMeta, type AssetKind, type ManualAsset, type NewManualAsset } from '@/types/asset';
import { formatINR } from '@/utils/format';
import { goldValue, vehicleValue } from '@/utils/netWorth';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type Props = { editing?: ManualAsset; onClose: () => void; onSave: (a: NewManualAsset) => Promise<void>; onDelete?: () => void };
const digits = (t: string) => t.replace(/[^0-9.]/g, '');

export default function AssetSheet({ editing, onClose, onSave, onDelete }: Props) {
  const [kind, setKind] = useState<AssetKind>(editing?.kind ?? 'home');
  const [name, setName] = useState(editing?.name ?? '');
  const [value, setValue] = useState(editing?.value ? String(editing.value) : '');
  const [price, setPrice] = useState(editing?.purchasePrice ? String(editing.purchasePrice) : '');
  const [year, setYear] = useState(editing?.purchaseDate ? String(new Date(editing.purchaseDate).getFullYear()) : '');
  const [grams, setGrams] = useState(editing?.grams ? String(editing.grams) : '');
  const [karat, setKarat] = useState<24 | 22 | 18>(editing?.karat ?? 22);
  const [rate, setRate] = useState(editing?.rate24k ? String(editing.rate24k) : '');
  const [busy, setBusy] = useState(false);

  const purchaseDate = year.length === 4 ? new Date(Number(year), 6, 1).toISOString() : undefined;
  const preview =
    kind === 'vehicle' && Number(price) > 0 && purchaseDate
      ? vehicleValue(Number(price), purchaseDate)
      : kind === 'gold' && Number(grams) > 0 && Number(rate) > 0
        ? goldValue(Number(grams), karat, Number(rate))
        : Number(value) || 0;
  const valid = name.trim().length > 0 && preview > 0;

  const save = async () => {
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
        karat: kind === 'gold' ? karat : undefined,
        rate24k: kind === 'gold' && Number(rate) > 0 ? Number(rate) : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={[sheet.iconCircle, { backgroundColor: Corpus.goldTint }]}>
              <Ionicons name={assetKindMeta(kind).icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{editing ? `Edit ${editing.name}` : 'Add something you own'}</Text>
              <Text style={sheet.subtitle}>{assetKindMeta(kind).hint}</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            <View style={sheet.chips}>
              {ASSET_KINDS.map((k) => (
                <Pressable key={k.id} style={[sheet.chip, kind === k.id && sheet.chipSuggested]} onPress={() => setKind(k.id)}>
                  <Text style={[sheet.chipText, kind === k.id && sheet.chipTextSuggested]}>{k.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={f.field}>
              <Text style={f.label}>NAME</Text>
              <TextInput style={f.input} value={name} onChangeText={setName} placeholder={kind === 'vehicle' ? 'e.g. Activa, Swift' : kind === 'gold' ? 'e.g. Wedding gold' : 'e.g. Our flat'} placeholderTextColor={Corpus.textFaint} maxLength={30} />
            </View>

            {kind === 'vehicle' ? (
              <>
                <View style={f.field}>
                  <Text style={f.label}>PRICE YOU PAID (ON-ROAD)</Text>
                  <TextInput style={f.input} value={price} onChangeText={(t) => setPrice(digits(t))} placeholder="e.g. 95000" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
                </View>
                <View style={f.field}>
                  <Text style={f.label}>YEAR BOUGHT</Text>
                  <TextInput style={f.input} value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 2023" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" />
                </View>
                <Text style={sheet.hint}>Corpus lowers the value every year like insurance does (5% → 15% → 20%… → 50% by year 5).</Text>
              </>
            ) : kind === 'gold' ? (
              <>
                <View style={f.field}>
                  <Text style={f.label}>WEIGHT (GRAMS)</Text>
                  <TextInput style={f.input} value={grams} onChangeText={(t) => setGrams(digits(t))} placeholder="e.g. 40" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
                </View>
                <View style={sheet.chips}>
                  {([24, 22, 18] as const).map((k) => (
                    <Pressable key={k} style={[sheet.chip, karat === k && sheet.chipSuggested]} onPress={() => setKarat(k)}>
                      <Text style={[sheet.chipText, karat === k && sheet.chipTextSuggested]}>{k}K{k === 22 ? ' · jewellery' : ''}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={f.field}>
                  <Text style={f.label}>TODAY'S 24K RATE PER GRAM</Text>
                  <TextInput style={f.input} value={rate} onChangeText={(t) => setRate(digits(t))} placeholder="Check a jeweller or news site" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
                </View>
                <Text style={sheet.hint}>Valued without making charges or GST, which you wouldn't get back if you sold.</Text>
              </>
            ) : (
              <View style={f.field}>
                <Text style={f.label}>WHAT COULD YOU SELL IT FOR TODAY?</Text>
                <TextInput style={f.input} value={value} onChangeText={(t) => setValue(digits(t))} placeholder="A rough estimate is fine" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
              </View>
            )}

            {preview > 0 && <Text style={[sheet.hint, { color: Corpus.gold }]}>Counted as {formatINR(preview)}</Text>}
            <Button label={editing ? 'Save changes' : 'Add'} onPress={save} loading={busy} disabled={!valid} />
            {editing && onDelete && <Button variant="danger" icon="trash-outline" label="Delete" onPress={onDelete} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
