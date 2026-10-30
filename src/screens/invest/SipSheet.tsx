import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import type { Investment, Sip } from '@/types/investment';
import { formatINR } from '@/utils/format';
import { sipFuture } from '@/utils/returns';
import { compactINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { m } from './Market.styles';

const DAYS = [1, 5, 7, 10, 15, 20, 25, 28];
const STEPS = [0, 5, 10, 15];

// Set up / change / stop the monthly SIP on a holding
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export type SipHistory = { since: Date; alreadyIncluded: boolean };

export default function SipSheet({ h, canBackfill, onSave, onClose }: {
  h: Investment; canBackfill: boolean; // fund / NPS with a live NAV
  onSave: (sip: Sip | null, history?: SipHistory) => Promise<void>; onClose: () => void;
}) {
  const cur = h.sip;
  const [amount, setAmount] = useState(cur ? String(cur.amount) : '');
  const [day, setDay] = useState(cur?.day ?? 5);
  const [step, setStep] = useState(cur?.stepUpPct ?? 0);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const [past, setPast] = useState(false);
  const [sMonth, setSMonth] = useState(now.getMonth());
  const [sYear, setSYear] = useState(String(now.getFullYear() - 1));
  const [included, setIncluded] = useState(!!h.units && h.units > 0);
  const since = new Date(Number(sYear), sMonth, 1);
  const sinceOk = sYear.length === 4 && since < now && Number(sYear) > 1990;
  const months = sinceOk ? (now.getFullYear() - since.getFullYear()) * 12 + now.getMonth() - since.getMonth() + 1 : 0;
  const amt = Number(amount);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
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
              <Ionicons name="repeat" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{cur ? 'Your SIP' : 'Start tracking a SIP'}</Text>
              <Text style={sheet.subtitle} numberOfLines={1}>{h.name}</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            <View style={sheet.amountRow}>
              <Text style={sheet.rupee}>₹</Text>
              <TextInput style={sheet.amountInput} value={amount} onChangeText={(t) => setAmount(t.replace(/\D/g, ''))} placeholder="0" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" autoFocus={!cur} />
            </View>
            <Text style={[sheet.hint, { textAlign: 'center' }]}>every month</Text>
            <View style={{ gap: 6 }}>
              <Text style={f.label}>DEBIT DATE</Text>
              <View style={sheet.chips}>
                {DAYS.map((d) => (
                  <Pressable key={d} style={[sheet.chip, day === d && sheet.chipSuggested]} onPress={() => setDay(d)}>
                    <Text style={[sheet.chipText, day === d && sheet.chipTextSuggested]}>{d === 1 ? '1st' : `${d}th`}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={m.tiny}>The date your bank auto-debits it. Check your fund app or bank mandate.</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={f.label}>YEARLY STEP-UP</Text>
              <View style={sheet.chips}>
                {STEPS.map((s) => (
                  <Pressable key={s} style={[sheet.chip, step === s && sheet.chipSuggested]} onPress={() => setStep(s)}>
                    <Text style={[sheet.chipText, step === s && sheet.chipTextSuggested]}>{s ? `+${s}% a year` : 'None'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {!cur && (
              <View style={{ gap: 6 }}>
                <Text style={f.label}>WHEN DID IT START?</Text>
                <View style={sheet.chips}>
                  <Pressable style={[sheet.chip, !past && sheet.chipSuggested]} onPress={() => setPast(false)}>
                    <Text style={[sheet.chipText, !past && sheet.chipTextSuggested]}>Starting now</Text>
                  </Pressable>
                  <Pressable style={[sheet.chip, past && sheet.chipSuggested]} onPress={() => setPast(true)}>
                    <Text style={[sheet.chipText, past && sheet.chipTextSuggested]}>Already running</Text>
                  </Pressable>
                </View>
                {past && (
                  <>
                    <View style={sheet.chips}>
                      {MONTHS.map((mo, i) => (
                        <Pressable key={mo} style={[sheet.chip, { paddingHorizontal: 10 }, sMonth === i && sheet.chipSuggested]} onPress={() => setSMonth(i)}>
                          <Text style={[sheet.chipText, sMonth === i && sheet.chipTextSuggested]}>{mo}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput style={f.input} value={sYear} onChangeText={(t) => setSYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="Year" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" />
                    {canBackfill ? (
                      <View style={{ gap: 6 }}>
                        <Pressable style={[sheet.chip, !included && sheet.chipSuggested, { alignSelf: 'stretch' }]} onPress={() => setIncluded(false)}>
                          <Text style={[sheet.chipText, !included && sheet.chipTextSuggested]}>Work out my units from past NAVs ({months} SIPs)</Text>
                        </Pressable>
                        <Pressable style={[sheet.chip, included && sheet.chipSuggested, { alignSelf: 'stretch' }]} onPress={() => setIncluded(true)}>
                          <Text style={[sheet.chipText, included && sheet.chipTextSuggested]}>My units already include them (just record them)</Text>
                        </Pressable>
                        <Text style={m.tiny}>
                          {included
                            ? 'Your current units stay as they are; past SIPs are recorded so returns and streaks are right.'
                            : `Corpus adds each month’s SIP at that day’s real NAV — ${months} purchases since ${MONTHS[sMonth]} ${sYear}. Pick this if you haven’t entered this fund’s units.`}
                        </Text>
                      </View>
                    ) : (
                      <Text style={m.tiny}>Past SIPs can be worked out for mutual funds and NPS with a live NAV. For this one, your current value already includes them.</Text>
                    )}
                  </>
                )}
              </View>
            )}
            {amt > 0 && (
              <View style={[m.position, { gap: 4 }]}>
                <Text style={m.cellLabel}>WHAT IT CAN GROW TO (~12% A YEAR)</Text>
                {[5, 10, 15, 20].map((y) => {
                  const flat = sipFuture(amt, 0, y);
                  const up = step ? sipFuture(amt, step, y) : null;
                  return (
                    <View key={y} style={m.posRow}>
                      <Text style={m.small}>{y} years · put in {compactINR((up ?? flat).put)}</Text>
                      <Text style={[m.small, { color: Corpus.income, fontWeight: '600' }]}>
                        {compactINR((up ?? flat).value)}
                        {up ? <Text style={m.tiny}>  (flat {compactINR(flat.value)})</Text> : null}
                      </Text>
                    </View>
                  );
                })}
                <Text style={m.tiny}>
                  Missing one SIP now costs about {formatINR(Math.round(amt * Math.pow(1.12, 10)))} at year 10.{!step ? ' A 10% yearly step-up roughly doubles the 20-year result.' : ''}
                </Text>
              </View>
            )}
            <Text style={m.tiny}>
              Each month on the debit date Corpus asks “did it go through?”. Tap yes and it adds the units at that day’s NAV. If you don’t answer in {5} days it assumes yes.
            </Text>
            <Button
              label={cur ? 'Save SIP' : past && canBackfill && !included ? `Add ${months} past SIPs & track` : 'Start tracking'}
              loading={busy}
              disabled={!(amt > 0) || (past && !sinceOk)}
              onPress={() =>
                run(() =>
                  onSave(
                    {
                      amount: amt,
                      day,
                      stepUpPct: step || undefined,
                      active: true,
                      // keep the original start when editing; new SIPs count from today
                      start: cur?.start ?? new Date().toISOString(),
                    },
                    !cur && past && sinceOk && canBackfill ? { since, alreadyIncluded: included } : undefined
                  )
                )
              }
            />
            {cur && (
              cur.active ? (
                <Button variant="danger" icon="pause" label="Stop this SIP" onPress={() => run(() => onSave({ ...cur, active: false }))} />
              ) : (
                <Text style={[m.small, { textAlign: 'center' }]}>This SIP is stopped. Save to restart it.</Text>
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
