# Corpus v1 — what's in the app

*Earn. Spend. Invest. Grow.* — a personal finance app for India. Web (Vercel) + phone (Expo). No bank login, no SMS reading.

## Every day
- **Safe to spend today** — what you can spend today, after bills, SIPs, jars and "keep aside", on your pay cycle (month starts on pay day).
- **One-tap logging** — your usual spends as one-tap buttons, Undo on everything, catch-up for missed days.
- **Found for you** — repeating payments → bills, double entries, extra-zero typos, a category running high, salary day, small leaks. Each with a one-tap fix.
- **Reminders** (🔔) — every bill, EMI, card due, SIP, money with people, low balance, grouped overdue/today/week/later. Paid / Done / Snooze.
- **Phone notifications** — morning briefing, bills & EMIs with ✓ Paid, SIP "did it go through?", low balance, overspent today, weekly & monthly review. Quiet hours, how often, max 3 a day.

## Money with people & debt
- Lent & borrowed: part payments, interest-only, instalments, chains ("when Ravi pays, repay Arun"), reminders.
- **All debts** in one list (loans, EMIs, cards, people), costliest first; **payoff plan** (highest interest / smallest first), **debt-free date**, interest saved, debt burden (% of income), card minimum-due trap.
- Debt plan on Home: progress since you started, monthly "did you pay the extra?", streak, cleared-debt celebration.

## Investments (live)
- Live NSE/BSE stocks & ETFs (every listed company searchable), mutual-fund NAV (AMFI), NPS, crypto (₹), indices.
- Buy-date price fill, broker paste import, FIFO lots, splits/bonus and dividends automatically.
- **SIPs**: set up, past SIPs from real NAVs, "did it go through?", auto-confirm, step-up, calculator.
- XIRR, mix vs equity target, goals with the SIP needed, monthly check-up for manual values.
- Tax: short/long-term gains, ₹1.25 L LTCG exemption left, booked profit this FY.

## Wealth
- Net worth (accounts, investments, gold at live rate, property, vehicles, debts), monthly history, milestones.
- **Wealth Builder Score** (saving, emergency fund, debt, investing, wealth built) with the biggest fix first.
- Savings-rate trend, idle cash vs live liquid-fund return, where you're heading (5/10/20 yrs, today's money), what-if simulator.

## Reports
- Year report (FY or calendar), month by month, categories, biggest spends, net worth change.
- **Tax summary for ITR** (Income-tax Act 2025: Section 123 = old 80C): capital gains, dividends, FD interest, deductions found, filing checklist.
- CSV export: entries, capital gains for your CA, holdings.
- Monthly report on the 1st; **data health** — how complete your data is, with fixes.

## Safety
- Firestore rules: each user reads/writes only `users/{their-id}`; everything else denied (verified live: 403).
- No secrets in the repo (`.env` git-ignored). Sign-out clears phone notifications.
- Rules deploy: `npx firebase-tools deploy --only firestore:rules`.

## Data sources (free)
Yahoo Finance (stocks, unofficial, may lag minutes) · AMFI via mfapi.in (fund NAV, daily) · npsnav.in (NPS) · CoinGecko (crypto) · gold-api.com (gold) · Upstox / NSE public instrument lists (search). Proxied by `api/market.js` on Vercel (Mumbai region).

## Known limits
- Some SME / gold-bond / small BSE stocks have no free price → add with your own price.
- Phone action buttons need the app (Expo Go / build); web shows the same in Reminders.
- Estimates (returns, tax, projections) are guides, not advice.

## Next
1. AI layer — monthly review, "Ask Corpus", "can I afford this?", receipt & SMS import.
2. Final UI redesign.
