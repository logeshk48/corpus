# Safe-to-Spend engine

Source: `src/utils/safeToSpend.ts` (pure function, no UI, no Firestore).
Shown on Home in the gold hero card; "How is this calculated?" opens the breakdown.

## Formula

```
incomeBased = income this month − spent this month
              − net money moved into jars this month
              − jar plans still due this month (only plans that are "behind")
budgetBased = monthly budget − spent this month          (only if a budget is set)

available   = the LOWER of incomeBased and budgetBased (whichever exist)

startOfToday     = available + spent today
dailyAllowance   = max(startOfToday, 0) ÷ days left (including today)
safeToday        = dailyAllowance − spent today
tomorrow         = max(available, 0) ÷ (days left − 1)
```

- No income **and** no budget → `noData` (the card explains how to unlock it).
- Today's allowance is fixed at the start of the day, so spending today lowers
  "safe today" one-for-one, and spending nothing raises tomorrow's allowance.
- Overdue jar plans are ignored, so a missed goal can't wipe out the month.

## Status

| Status | Rule                                  | Colour |
|--------|---------------------------------------|--------|
| ok     | safe today ≥ 30% of today's allowance | gold   |
| tight  | safe today < 30% of today's allowance | amber  |
| over   | safe today < 0, or available < 0      | red    |

## Verified scenarios (20 Oct 2026, 12 days left)

| Case | Expected |
|------|----------|
| ₹60,000 income, ₹24,000 spent | ₹3,000/day |
| + ₹2,500 spent today | ₹500 left today, tight |
| + ₹3,600 spent today | −₹600, over; tomorrow ₹2,945/day |
| ₹6,000 moved into a jar | ₹2,500/day |
| Trip jar behind its plan by ₹10,667 | ₹1,611/day |
| ₹30,000 monthly budget (stricter) | ₹500/day, capped by budget |
| No income, no budget | noData |
| Budget ₹30,000 only, ₹6,000 spent | ₹2,000/day |
