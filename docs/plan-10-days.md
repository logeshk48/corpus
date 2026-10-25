# Corpus — 10-day plan (Oct 26 – Nov 4, 2026)

Pace: ~2 sessions/day. Each day ends with: tests pass · you check on phone/laptop · commit · Vercel auto-deploys.

| Day | Build | Done when |
|---|---|---|
| 1 | **Light accounts** — bank/cash/wallet/card balances updated weekly ("verified on 25 Oct"), card dues + bill/due day, Home row back | You can see what you have in each account in 30 sec |
| 2 | **Net worth** — assets (accounts, investments, receivables) − liabilities (loans, cards, borrowed); monthly snapshots; trend + assets-vs-debts chart; "why it changed"; no double counting (jars live inside bank balance) | Net worth number matches your own math |
| 3 | **Investments I** — Invest tab: MF, stocks, gold/silver, crypto, PF/EPF/NPS, FD; invested vs current value (marked *manual*), gains/losses | Your holdings entered with gain % |
| 4 | **Investments II** — allocation chart, long vs short term, SIP contributions, monthly value updates, feeds net worth | Invest tab + net worth agree |
| 5 | **Wealth building** — Wealth Builder Score, savings-rate trend, emergency readiness, debt pressure, idle cash, future net worth projection, what-if (save/invest/prepay more) | Score explained line by line |
| 6 | **Loans & debt extras** — all debts in one list, highest-interest-first payoff plan, debt-free date, EMI ÷ income burden, card dues in Total debt | One clear "pay this first" plan |
| 7 | **Smart detection** — recurring expense → "make it a bill?", duplicate warning, unusual spending, unused subscriptions, business vs personal tag, month-end spend prediction | Corpus spots things before you do |
| 8 | **Notifications centre** — daily Safe-to-Spend, budget/overspend, bills & EMIs, low balance, weekly review; on/off + frequency settings, no duplicates (test in Expo Go) | You control every alert |
| 9 | **Reports** — weekly totals, income vs expense, savings-rate / debt / investment / net worth trends, yearly report | Reports = same numbers as dashboard |
| 10 | **Full check + release** — every screen, refresh persistence, empty/error states, phone layout, data isolation; bug fixes; deploy. Decide AI setup (Firebase Blaze + API key) | Stable build live on Vercel |

After day 10: **AI layer** (monthly/weekly review, Ask Corpus, "can I afford this?", receipt & SMS import) ~3–4 days, then **final UI redesign** ~3–5 days.

Rules: preserve working features · tests for all money math · projections labelled as estimates · manual values labelled manual.
