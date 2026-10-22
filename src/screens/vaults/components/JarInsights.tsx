import { Corpus } from '@/constants/theme';
import type { VaultEntry, VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import {
  formatYearMonth,
  jarKind,
  jarPlan,
  milestoneReached,
  MILESTONES,
  nextAdvanceTax,
  projectedFinish,
} from '@/utils/jarInsights';
import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { InsightContext } from './jarInsightLine';
import { styles } from './JarInsights.styles';

type JarInsightsProps = {
  jar: VaultWithBalance;
  entries: VaultEntry[];
  context: InsightContext;
  onEdit: () => void;
};

export default function JarInsights({ jar, entries, context, onEdit }: JarInsightsProps) {
  const plan = jarPlan(jar);
  const finish = projectedFinish(jar, entries);
  const reached = milestoneReached(jar.balance, jar.goal);
  const kind = jarKind(jar);

  return (
    <>
      {/* ── Plan & projection ── */}
      {jar.goal ? (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="flag-outline" size={15} color={jar.color} />
            <Text style={styles.cardTitle}>Your plan</Text>
          </View>

          {plan ? (
            <>
              {plan.status === 'done' ? (
                <Text style={[styles.big, { color: Corpus.income }]}>Goal reached 🏆</Text>
              ) : plan.status === 'overdue' ? (
                <Text style={styles.line}>
                  Your target month ({formatYearMonth(jar.targetDate!)}) has passed with{' '}
                  <Text style={styles.strong}>{formatINR(plan.shortThisMonth)}</Text> to go. Pick a new
                  month to get a fresh plan.
                </Text>
              ) : (
                <>
                  <Text style={[styles.big, { color: jar.color }]}>{formatINR(plan.perMonth)} / month</Text>
                  <Text style={styles.line}>
                    for {plan.monthsLeft} month{plan.monthsLeft === 1 ? '' : 's'} to reach{' '}
                    <Text style={styles.strong}>{formatINR(jar.goal)}</Text> by{' '}
                    <Text style={styles.strong}>{formatYearMonth(jar.targetDate!)}</Text>
                  </Text>
                  <View
                    style={[
                      styles.status,
                      { backgroundColor: plan.status === 'onTrack' ? Corpus.incomeTint : Corpus.warningTint },
                    ]}
                  >
                    <Ionicons
                      name={plan.status === 'onTrack' ? 'checkmark-circle' : 'time-outline'}
                      size={14}
                      color={plan.status === 'onTrack' ? Corpus.income : Corpus.warning}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: plan.status === 'onTrack' ? Corpus.income : Corpus.warning },
                      ]}
                    >
                      {plan.status === 'onTrack'
                        ? `This month is done — ${formatINR(plan.addedThisMonth)} added`
                        : `${formatINR(plan.shortThisMonth)} more this month keeps you on track`}
                    </Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <Pressable onPress={onEdit}>
              <Text style={styles.line}>
                Pick a <Text style={styles.strong}>"reach it by"</Text> month and Corpus will tell you
                exactly how much to add each month. <Text style={styles.link}>Set a month →</Text>
              </Text>
            </Pressable>
          )}

          {jar.balance < jar.goal && (
            <Text style={styles.line}>
              {finish
                ? `📈 At your recent pace, you'll reach it around ${formatYearMonth(finish)}.`
                : '📈 Add money regularly and Corpus will predict your finish date.'}
            </Text>
          )}

          {/* Milestone track 25 / 50 / 75 / 100 */}
          <View style={styles.milestones}>
            {MILESTONES.map((m, i) => {
              const done = reached >= m;
              return (
                <Fragment key={m}>
                  {i > 0 && (
                    <View style={[styles.mLine, { backgroundColor: done ? jar.color : Corpus.border }]} />
                  )}
                  <View style={styles.mItem}>
                    <View
                      style={[
                        styles.mDot,
                        { borderColor: done ? jar.color : Corpus.border, backgroundColor: done ? `${jar.color}26` : 'transparent' },
                      ]}
                    >
                      <Ionicons
                        name={m === 100 ? 'trophy' : done ? 'checkmark' : 'ellipse-outline'}
                        size={m === 100 || done ? 14 : 8}
                        color={done ? jar.color : Corpus.textFaint}
                      />
                    </View>
                    <Text style={styles.mLabel}>{m}%</Text>
                  </View>
                </Fragment>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* ── Emergency fund guidance ── */}
      {kind === 'emergency' && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="umbrella-outline" size={15} color={jar.color} />
            <Text style={styles.cardTitle}>How safe are you?</Text>
          </View>
          {context.avgExpenses > 0 ? (
            <>
              <Text style={[styles.big, { color: jar.color }]}>
                {(jar.balance / context.avgExpenses).toFixed(1)} months covered
              </Text>
              <Text style={styles.line}>
                You spend about <Text style={styles.strong}>{formatINR(context.avgExpenses)}</Text> a month.
                Aim for <Text style={styles.strong}>{context.recommendedMonths} months</Text> ={' '}
                <Text style={styles.strong}>
                  {formatINR(Math.ceil((context.avgExpenses * context.recommendedMonths) / 1000) * 1000)}
                </Text>
                .
              </Text>
            </>
          ) : (
            <Text style={styles.line}>Log a few expenses and Corpus will show how many months this jar covers.</Text>
          )}
          <Text style={styles.note}>
            Common guidance in India: 3–6 months of expenses for a stable salaried job, 6–12 months for
            freelance or business income. Keep it somewhere instant and safe — a savings account,
            sweep-in FD or liquid fund — not in stocks. Use it only for real emergencies.
          </Text>
        </View>
      )}

      {/* ── Advance tax calendar (India) ── */}
      {kind === 'tax' && (() => {
        const next = nextAdvanceTax();
        const fyStartYear = new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        const schedule = [
          { date: new Date(fyStartYear, 5, 15), pct: 15 },
          { date: new Date(fyStartYear, 8, 15), pct: 45 },
          { date: new Date(fyStartYear, 11, 15), pct: 75 },
          { date: new Date(fyStartYear + 1, 2, 15), pct: 100 },
        ];
        const today = new Date();
        return (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="calendar-outline" size={15} color={jar.color} />
              <Text style={styles.cardTitle}>Advance tax calendar · FY {fyStartYear}-{String(fyStartYear + 1).slice(2)}</Text>
            </View>
            <Text style={[styles.big, { color: jar.color }]}>
              {next.label} · in {next.daysLeft} days
            </Text>
            <Text style={styles.line}>
              By then, <Text style={styles.strong}>{next.percent}%</Text> of your year's estimated tax should be paid.
            </Text>
            <View style={styles.schedule}>
              {schedule.map((s) => {
                const past = s.date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <View key={s.pct} style={styles.scheduleRow}>
                    <Ionicons
                      name={past ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={past ? Corpus.textFaint : jar.color}
                    />
                    <Text style={[styles.scheduleDate, past && { color: Corpus.textFaint }]}>
                      {s.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={styles.schedulePct}>{s.pct}% of the year's tax (cumulative)</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.note}>
              Advance tax applies only if your tax after TDS is ₹10,000 or more — usually because of
              freelance, business, rent or capital-gain income. Salary with TDS is normally covered.
              Late instalments cost 1% interest per month. Check with a CA for your exact amount.
            </Text>
          </View>
        );
      })()}
    </>
  );
}
