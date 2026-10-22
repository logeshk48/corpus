import { Corpus } from '@/constants/theme';
import { streamTypeMeta } from '@/types/incomeStream';
import { WORK_MODES, type SetupPlan } from '@/utils/onboarding';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { styles } from './Step.styles';
import type { StepProps } from './types';

type Props = StepProps & { plan: SetupPlan };

export default function ReviewStep({ answers, plan }: Props) {
  const modes = WORK_MODES.filter((m) => answers.modes.includes(m.id));
  const name = answers.name.trim();

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>ALL SET</Text>
      <Text style={styles.title}>{name ? `Here’s your Corpus, ${name}` : 'Here’s your Corpus'}</Text>
      <Text style={styles.sub}>This is what will be created. Go back to change anything.</Text>

      {modes.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>HOW YOU EARN</Text>
          <View style={styles.chips}>
            {modes.map((m) => (
              <View key={m.id} style={styles.chip}>
                <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={13} color={Corpus.gold} />
                <Text style={styles.chipText}>{m.title}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {plan.streams.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>INCOME STREAMS</Text>
          <View style={styles.card}>
            {plan.streams.map((s, i) => (
              <Fragment key={s.name}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.reviewRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name={streamTypeMeta(s.type).icon as keyof typeof Ionicons.glyphMap} size={15} color={Corpus.income} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewText}>{s.name}</Text>
                    <Text style={styles.reviewSub}>{streamTypeMeta(s.type).label}</Text>
                  </View>
                  <Text style={styles.reviewValue}>{s.expectedMonthly ? `${formatINR(s.expectedMonthly)}/mo` : '—'}</Text>
                </View>
              </Fragment>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>MONTHLY BUDGET</Text>
      <View style={styles.card}>
        <View style={styles.reviewRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="wallet" size={15} color={Corpus.gold} />
          </View>
          <Text style={styles.reviewText}>{plan.settings.monthlyBudget ? 'Spending limit' : 'Not set'}</Text>
          <Text style={styles.reviewValue}>
            {plan.settings.monthlyBudget ? formatINR(plan.settings.monthlyBudget) : 'Set later in Settings'}
          </Text>
        </View>
      </View>

      {plan.vaults.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>JARS</Text>
          <View style={styles.card}>
            {plan.vaults.map((v, i) => (
              <Fragment key={v.name}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.reviewRow}>
                  <View style={[styles.cardIcon, { backgroundColor: v.color + '22' }]}>
                    <Ionicons name={v.icon as keyof typeof Ionicons.glyphMap} size={15} color={v.color} />
                  </View>
                  <Text style={styles.reviewText}>{v.name}</Text>
                  <Text style={styles.reviewSub}>{v.goal ? `Goal ${formatINR(v.goal)}` : 'No goal yet'}</Text>
                </View>
              </Fragment>
            ))}
          </View>
        </>
      )}

      {plan.skipped.length > 0 && (
        <View style={{ gap: 4 }}>
          {plan.skipped.map((s) => (
            <Text key={s} style={styles.muted}>✓ {s}, so it won’t be duplicated</Text>
          ))}
        </View>
      )}

      <View style={styles.note}>
        <Ionicons name="bulb" size={16} color={Corpus.gold} style={{ marginTop: 1 }} />
        <Text style={styles.noteText}>
          Next up: add your rent, EMIs and subscriptions under Bills so Safe-to-Spend can set money aside for them.
        </Text>
      </View>
    </View>
  );
}
