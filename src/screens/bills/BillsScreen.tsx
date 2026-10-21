import { findCategory } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useBills } from '@/hooks/useBills';
import { addBill, deleteBill, updateBill } from '@/services/bills';
import type { Bill, NewBill } from '@/types/bill';
import { isPaidThisMonth, monthlyBillsTotal, nextDue, ordinal, unpaidThisMonth, yearMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BillSheet, { BILL_TEMPLATES, type BillSheetMode } from './components/BillSheet';
import { styles } from './BillsScreen.styles';

function billStatus(bill: Bill): { text: string; color: string } {
  if (!bill.active) return { text: 'Paused', color: Corpus.textFaint };
  if (bill.startMonth > yearMonth(new Date())) {
    return { text: `Starts ${nextDue(bill).date.toLocaleDateString('en-IN', { month: 'short' })} · due ${ordinal(bill.dayOfMonth)}`, color: Corpus.textMuted };
  }
  if (isPaidThisMonth(bill)) return { text: `✓ Logged this month · next ${nextDue(bill).date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, color: Corpus.income };
  const { daysAway } = nextDue(bill);
  if (daysAway < 0) return { text: `Due ${ordinal(bill.dayOfMonth)} · logging now…`, color: Corpus.warning };
  if (daysAway === 0) return { text: 'Due today', color: Corpus.warning };
  if (daysAway === 1) return { text: 'Due tomorrow', color: Corpus.warning };
  return { text: `Due ${ordinal(bill.dayOfMonth)} · in ${daysAway} days`, color: Corpus.textMuted };
}

export default function BillsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { bills, loading } = useBills();
  const [mode, setMode] = useState<BillSheetMode>(null);

  const total = monthlyBillsTotal(bills);
  const unpaid = unpaidThisMonth(bills);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const save = async (bill: NewBill, paidThisMonth: boolean) => {
    try {
      if (mode?.kind === 'edit') {
        await updateBill(mode.bill.id, bill);
        showToast({ message: `${bill.name} updated` });
      } else {
        await addBill(paidThisMonth ? { ...bill, lastLoggedMonth: yearMonth(new Date()) } : bill);
        showToast({ message: `${bill.name} added · ${formatINR(bill.amount)} on the ${ordinal(bill.dayOfMonth)}` });
      }
      setMode(null);
    } catch (e) {
      console.error('Save bill failed:', e);
      showToast({ message: 'Could not save the bill. Try again.' });
    }
  };

  const remove = async (bill: Bill) => {
    try {
      await deleteBill(bill.id);
      setMode(null);
      showToast({ message: `${bill.name} deleted` });
    } catch (e) {
      console.error('Delete bill failed:', e);
      showToast({ message: 'Could not delete. Try again.' });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={styles.heading}>Recurring bills</Text>
          {bills.length > 0 && (
            <Pressable style={styles.addButton} onPress={() => setMode({ kind: 'new' })}>
              <Ionicons name="add" size={14} color="#0F1115" />
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>Never type your rent again</Text>
            <Text style={styles.welcomeText}>
              Add the costs that repeat every month. Corpus logs each one on its due day, and keeps
              the money aside in Safe-to-Spend until then.
            </Text>
            <View style={styles.templates}>
              {BILL_TEMPLATES.map((t) => (
                <Pressable key={t.name} style={styles.template} onPress={() => setMode({ kind: 'new', template: t })}>
                  <Ionicons name={t.icon as any} size={13} color={Corpus.gold} />
                  <Text style={styles.templateText}>{t.name}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.template} onPress={() => setMode({ kind: 'new' })}>
                <Ionicons name="add" size={13} color={Corpus.gold} />
                <Text style={styles.templateText}>Other</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>FIXED COSTS PER MONTH</Text>
              <Text style={styles.heroAmount}>{formatINR(total)}</Text>
              <View style={styles.heroSplit}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Paid this month</Text>
                  <Text style={[styles.heroStatValue, { color: Corpus.income }]}>{formatINR(total - unpaid)}</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Still to pay</Text>
                  <Text style={[styles.heroStatValue, { color: Corpus.gold }]}>{formatINR(unpaid)}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionLabel}>YOUR BILLS · TAP TO EDIT</Text>
            <View style={styles.group}>
              {bills.map((bill, i) => {
                const status = billStatus(bill);
                const cat = findCategory('expense', bill.category);
                return (
                  <Pressable
                    key={bill.id}
                    onPress={() => setMode({ kind: 'edit', bill })}
                    style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name={(cat?.icon ?? 'receipt') as any} size={16} color={bill.active ? Corpus.textMuted : Corpus.textFaint} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowName, !bill.active && { color: Corpus.textFaint }]}>{bill.name}</Text>
                      <Text style={[styles.rowMeta, { color: status.color }]}>{status.text}</Text>
                    </View>
                    <Text style={[styles.rowAmount, !bill.active && { color: Corpus.textFaint }]}>
                      {formatINR(bill.amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.note}>
              Each bill is recorded as an expense on its due day (the next time you open Corpus). Until
              then, its amount is kept aside in your Safe-to-Spend, so the daily number stays honest.
            </Text>
          </>
        )}
      </ScrollView>

      <BillSheet mode={mode} onClose={() => setMode(null)} onSave={save} onDelete={remove} />
    </SafeAreaView>
  );
}
