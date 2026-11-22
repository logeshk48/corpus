# Corpus design system — MASTER

The source of truth for every screen. Checked against the ui-ux-pro-max skill (kept in `.claude/skills/ui-ux-pro-max`,
run with `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>`).
Page-specific rules go in `pages/<page>.md` and override this file.

## Direction
Apple iOS 26 style ("Liquid Glass"): large titles, inset grouped lists, white cards on soft grey, coloured icon squares,
floating glass tab bar with a separate round Ask button. Light and dark themes; "Automatic" follows the phone.
Skill match: product type **Personal Finance Tracker** → Glassmorphism + Dark mode, minimal secondary — kept.

## Colour — Graphite + green (v2, picked with ui-ux-pro-max)
Black-and-white premium surfaces; **green / amber / red only ever mean money status** (never decoration),
so a button is never confused with good news. Tokens in `src/constants/theme.ts`, never hex in screens.
| Role | Light | Dark (pure black) |
|---|---|---|
| Background | #F4F4F1 (no pure white) | #000000 |
| Card / grouped row | #FFFFFF | #1C1C1E |
| Nested / input | #EDEDE9 | #2C2C2E |
| Separator | #E4E4DF | #38383A |
| Brand (`gold` token) | graphite #111111 | near-white #F5F5F0 |
| Text / secondary / tertiary | #111 / #5F5F5B / #6E6E69 | #FFF / #A1A1A8 / #8E8E93 |
| On track · tight · over | #0F7A45 · #A85A00 · #C8322B | #32D27A · #FFB340 · #FF6961 |
Icon squares (`Chip`) keep their colours: they identify kinds of things, not status.

## Living background (Corpus signature)
`AmbientGlow` behind Today: the glow colour IS the money status — green on track, amber tight, red over,
grey before data (`assets/images/bg/glow-*.png`). Fades as you scroll. Strength token `Corpus.glow`.

## Gen Z layer (on top of the premium base)
- **Bento tiles in pastels** (`Pastel.lilac/peach/sky/butter/mint/rose`, light + dark sets, text ≥ 4.5:1) wherever a
  set of areas is scanned at a glance — Money on Today, summaries on sub-screens. Big Inter amounts, small words.
- **Pills**: primary buttons and chips fully rounded (999); tiles 26 radius.
- **Streaks**: logging streak (`utils/streak.ts`) as a peach flame pill next to the large title (≥ 2 days).
- **Copy**: short, friendly, second person — "Money in", "Spent", "Nothing spent yet this week". No emoji as icons.
- Pastels are decoration only; money status keeps green / amber / red.
- Bento follows the skill's **Bento Box Grid**: varied sizes (wide 2×1 for Accounts + Net worth, squares between),
  tiles appear staggered 45 ms apart (skill: 30–50 ms), off with Reduce Motion.
- Skill's Gen Z style **Neubrutalism** (black outlines, hard shadows) rejected: its own rule forbids mixing flat-brutal
  with glass at random, and Corpus is glass.

## Audit rules from ui-ux-pro-max (apply on every screen)
- **Colour never alone** (High): status = colour + icon/word (bento "Check" pill, "On track" pill, ring legend).
- **No clipped essential text** (Critical): wrap to 2 lines or give a full-detail path; never ellipsize meaning.
- **Empty state = message + action** (Medium).
- **Loading keeps layout + announces busy** (High): skeletons with `accessibilityState={{ busy: true }}`.
- **Tap feedback < 100 ms**, lists of 50+ virtualised, thousand separators, tab badges sparingly.

## Type
Inter (bundled, OFL) for amounts and headings: `Font.displayBold` (amounts, large titles), `Font.display` (titles);
`tabular` digits on every amount. System font for body text. Never add fontWeight next to a custom face.
Sizes: large title 34 · section 20 · row 16 · secondary 13 · min 12.

## Components
`Group` + `GroupRow` (inset grouped list, 22 radius, hairline inset 58) · `IconChip` (rounded square, white glyph) ·
`ActivityRing` (dot ring, no SVG needed) · `GlassTabBar` (capsule + round Ask) · cards: 22–26 radius, no border.

## Rules (from the skill's pro-rules checklist)
- Touch targets ≥ 44pt iOS / 48dp Android — expand with hitSlop when the visual is smaller.
- Text contrast ≥ 4.5:1 in both themes; icons that carry meaning ≥ 3:1. No meaning by colour alone.
- Press feedback within 80–150 ms; motion off when Reduce Motion is on; one entrance moment per screen.
- Safe areas respected; scroll content padded so the floating tab bar never hides it (≥ 130 bottom).
- Glass only on navigation and controls; solid when Reduce Transparency is on.
- Icons: Ionicons only, filled for selected / outline otherwise, never emoji as icons.
- 4/8 spacing rhythm: 8 · 12 · 16 · 24 · 32.

## Forms and sheets (from step 4, Accounts)
- Every form opens in `Sheet` (`src/components/ui/Sheet.tsx`): title + round close, body scrolls, actions pinned at the bottom.
- `Field`: visible sentence-case label above the box, `money` adds ₹ + number keyboard, hint or error (with icon) right under the field.
- `Choice` for single picks (`tiles` for 3–4 short options with icons); `Toggle` for on/off. Selected state = filled brand pill, never colour alone.
- Save shows a loading button, then a toast with the same verb ("added", "saved", "deleted"). Delete always asks first.
- Each account keeps one identity colour (Chip palette) across its icon, the "where it sits" bar and the balance sheet.

## Charts + icons (more "modern", step 4b)
- `IconChip` is a glossy squircle (soft top light via `linear-gradient`, hairline highlight). `"mci:<name>"` uses Material Community icons for money things Ionicons lacks (bank, cash, credit-card-chip).
- `CandleChart` (`src/components/charts`): money candles from Views, no SVG. Tap/hover a candle and the screen's big number shows that candle ("scrub"); "Back to now" resets. Green = ended higher, red = lower, always with "Up/Down ₹X" in words.
- `Spark`: watchlist-style mini columns in list rows, the latest one solid. Hidden from screen readers (the row already says the amount).
- Range pills ("2 weeks" / "3 months") in plain words, not "2W/3M".

## Today: order of sections (step 4c)
Glance → act → what needs you → what just happened → explore → long term. (ui-ux-pro-max `content-priority`, `primary-action`.)
1. Header + Safe to spend (the one number) 2. Add spend / Scan / Can I afford? 3. Your usuals (one-tap log)
4. **Needs you** (count badge): bill alerts, bank SMS to log, catch-up, month report, reminders — only when there is something
5. Recent 6. This week 7. Up next 8. Your money bento (Accounts tile has a 14-day spark) 9. For you 10. Wealth score, debt plan, investing.

## No AI slop (step 4d) — check every screen against this
Visual
- No pastel candy tiles, no gradient glows or washes, no glossy icons. Colour only for money status and category identity.
- One primary button per screen (filled black/white pill). Everything else is secondary (card-coloured pill) or a row.
- Not everything is a card: lists are grouped rows; figures right-aligned like a ledger. Vary hierarchy with type size and space.
- One motion moment per screen (the main number counting up). No staggered tile entrances.
- No emoji anywhere in the UI or toasts. Icons from @expo/vector-icons only.
Copy
- No em dashes (—) and no "A · B · C" middle-dot chains. Use a comma, a full stop, or a separate line.
- Short and plain: say the fact, then the action. No "Not wrong, just worth seeing", no pep talk, no ✓ in text.
- No explainer paragraphs under charts: a two-item legend instead.
Still to clean (done as each screen is redesigned): 247 middle dots, 134 em dashes, 72 emoji lines across other screens and notifications.

## Motion (step 4e) — react-native-reanimated 4 + gesture-handler, tokens in src/constants/motion.ts
Every motion answers something you did. Reduce Motion turns them off.
- Press: `Tap` dips to 0.97 and springs back (buttons, hero, tab bar, actions). List rows keep the grey highlight instead.
- Tab bar: the selected pill slides to the tab you tap.
- Screens: forward slides in from the right, the old screen parallaxes back; Ask and bank SMS rise from the bottom; auth/app crossfade.
- Sheets: backdrop fades, sheet springs up; drag the top down or tap outside and it slides away faster than it came.
- Numbers: `useTween` rolls Safe to spend / You have from old to new value after you log something.
- Lists: `<Group animate>` slides new rows in, fades removed ones, the rest close the gap (not on first load).
- Candle chart: slide a finger across to read each candle.
- Switches: the knob springs across.

## Goals = Jars (product rule, step 7b)
One goal = one jar. A jar holds cash you put in AND can have investments linked to it (holding.goalId = jar id).
- Jar progress, milestones and the monthly plan use cash + linked investment value (`savedOf`); the plan assumes linked money grows at its expected return.
- Cash only (`balance`) is used for take-out limits, Safe to spend and net worth, so investments are never counted twice.
- The old Invest → Goals move into jars automatically once (useGoalsToJars). Invest shows a Goals card that links to the jars.
- Deleting a jar unlinks its investments; it never deletes them.
- Nothing is hidden: the Jars total counts every investment. Ones not in a jar show as one row, "Not in a jar yet · Sort".
- Sort / "What is it for?" (JarPickerSheet) starts each holding on a suggested jar with the reason in words: liquid/gilt/debt/FD → Emergency fund, gold/silver → Savings, equity → the longest goal.
- Each holding in Invest shows "For: Car" or "Not in a jar. Add to Car?".
- Two jars with the same name → "You have two jars called Savings · Merge" (confirm first; history and investments move, nothing is lost).

## Income that varies (product rule, step 8b)
- A source is "Changes every month" by default; "Same every month" is opt-in and is the only kind with an expected amount and a "still to come" bar.
- Never ask people to guess: `usualOf` learns the range, average and usual pay day from the last 6 full months of logged payments.
- "Got paid" on every source row logs income in one step, with "Same as last time" and "Your usual" amounts one tap away.
- Rows speak in words: "Not paid yet", "Usually paid by the 5th. Got it?", "A lower / usual / strong month. Usually ₹12K to ₹30K".
- Safe to spend only ever counts income actually received, so varying income never inflates it.

## A savings plan never turns Today red (product rule)
- A jar plan needing more than half a month's income is paused: Safe to spend doesn't set it aside (`planTooBig`, `plansPaused`).
- Other plans are set aside only up to half of what is left this month, so there is always money to live on.
- Today shows "Car plan paused this month"; the jar says why and offers "Move to <month>" (about a quarter of a usual month's income) or "Change goal".

## Net worth (step 9)
- Signature: "You own" and "You owe" as two bars on one shared scale, each split by kind with every part named. The gap between them is the net worth.
- One identity colour + icon per kind (cash, gold, investments, loans…) reused in bars, legend and rows.
- Confidence in words on the row ("Old value", "Estimate", "Your value"), never a coloured pill alone.

## Atmosphere and effects (step 9b, replaces the earlier "no glow" rule)
Cards and text stay clean; the life is in the background and in moments.
- `Aura` (components/fx): two soft lights drifting slowly behind the title. Each screen has its colour (Accounts blue, Budgets orange, People pink, Jars yellow, Income green, Net worth indigo; a jar or income source uses its own colour). Today's light is your money status: green, amber or red.
- `Shine`: one sweep of light across the main card when a screen opens. Once, then gone.
- Sections arrive one after another (55 ms apart) on every `Screen`.
- `celebrate()` / toast `celebrate: true`: a short burst of coloured pieces for real wins only (got paid, jar milestone or goal, all settled).
- Tab icon hops when chosen.
- All of it is decoration: hidden from screen readers and switched off by Reduce Motion.

## Net worth v2 (researched: INDmoney, Kubera, Monarch, Copilot, Freenance + ui-ux-pro-max)
- Hero: number + `TrendLine` (line through the months, pulsing latest point, tap to read a month).
- "The balance": own vs owe on one scale. "Where your wealth sits": `Treemap`, with a plain-words warning when 60%+ is in one kind.
- "How long it lasts": 12 month-blocks filled by how many months of spending ready cash, and everything after debts, would cover.
- "Next stop": a path from the last milestone to the next with a marker where you are.

## Bills (step 10a; researched Monarch, Simplifi, Rocket Money, Origin + ui-ux-pro-max)
- Hero: paid this month, with a month rail (a dot per bill placed on its due day, sized by amount, filled = paid, today marked).
- Cash context card: what's due in the next 7 days against what's in your accounts.
- Calendar: each due day carries a symbol (tick paid, dot due, alert overdue); tap a day to list its bills.
- Still to do (10b): BillSheet, LoanSheet and LoanPanel on the shared Sheet; bill detail sections.

## Bill calendar (step 10a, calendar pass)
- A day with bills is a tinted tile: state symbol + short amount (4.1K). State never rests on colour alone.
- Today is outlined, the chosen day is filled and gives one small bounce.
- Arrows look up to 3 months ahead; future months show every bill as "To pay".
- The day panel lists that day's bills with a Pay button. An empty day says what is next and when.

## Bill dates (rules)
- Two kinds of repeat. Calendar bills (monthly, 2, 3, 6 months, yearly) fall on a fixed day. Day-count plans (28, 56, 84 days) run from the day you last paid.
- A day-count plan's next date = the later of its due date and the day you paid, plus the plan length.
- Only bills marked "Records itself" are added on the due day (auto-debits). Everything else waits for Mark paid.
- A missed payment stays as Late until it is paid or skipped. It never vanishes when the month turns.
- The Pay sheet always asks which day it was paid, default today.

## Bills 10b: forms and loan
- Bill, loan and pay forms all use the shared Sheet with Field, Choice, Toggle, Stepper and DayStepper. No form draws its own inputs.
- Stepper (‹ value ›) is for short ordered sets: day of month, month, a past date. Arrows are 44pt.
- Loan card: one cell per EMI when there are 36 or fewer, a single bar above that. Green = cleared, amber = interest, always with words and numbers next to it.
- A screen has one primary button. "I paid this extra" is secondary because Mark paid is the primary.

## Reminders (step 11)
- Top card: today's date, Safe to spend today (rolls), one line of what is due, and a Late / Today / Next 7 days strip. Late is red with an icon, never colour alone.
- Groups: Late, Today, Next 7 days, Later. Each has its count in the title.
- No swipe actions (skill: gesture-conflicts). Tap a row to open its tray: Mark paid (bills that are waiting) or Done, three snoozes, and Open. Every action has Undo in the toast.
- Clearing the last reminder fires the small celebration once.
- Reminder text from every source uses sentences: no middle dots or dashes.

## Reminders v2 (researched)
- The screen answers three questions in order: how much goes out and when, can I cover it, what else needs a look.
- Top card: total to pay in the next 30 days, the next payment, a bar of bank and cash against it, and exactly how much to add by which date. Income can still arrive, so it says so.
- Payments are listed by when they come (Today, Tomorrow, Rest of this week, Next week, Later), each group with its total. Each row: date tile, name, one plain line of what to do, amount on the right.
- Notes where no money moves (update balances, budget, minimum balance) sit apart under "Worth a look" with an icon instead of a date.
- Late payments sit first with their actions already open.
- Optional money (the payoff plan's extra) is listed in grey and never counted in the must-pay total.
- An auto-debit says "Keep it in your bank": its main action is Done, because it records itself on the day.
- Spending reviews and Safe to spend stay on Home, not here.

## Wealth score v2 (researched)
- Five plain questions, 20 points each, on the Financial Health Network's areas (spend, save, borrow, plan and protect): Do you spend less than you earn? Could you handle a surprise? Is your debt easy to carry? Is your money growing? Are you covered if something goes wrong?
- Indian benchmarks: 20 to 25% left over; cushion of 6 months, 9 if income varies; EMIs and interest under 15% full marks, 45% zero (lenders worry above 40%); 20% of income invested; health cover of ₹5 lakh+, term cover of about 10x yearly income when others depend on you.
- Bands with their numbers shown: under 40 Needs care, 40 to 59 Getting there, 60 to 79 Good, 80+ Strong.
- The next step is always the next milestone (1 month of cushion, then 3, 6, 9; invest 5%, then 10%, then 20%), never the whole distance, with the points it adds.
- Each part shows a status word and icon (Good, Okay, Weak, Not scored), not colour alone. Tap a part for what it means, what full marks looks like, and its step.
- Insurance is self-reported in a two-question sheet; until answered, that part is "Not scored" and the score is scaled from the rest.
- Late bills cost 3 points each in Spending.

## Debts (step 13, researched)
- Order: how much you owe and when it ends, the one debt to pay first, card trap with cheaper ways out, how heavy it is next to income, the plan, every debt costliest first.
- Payoff order is a choice between two tiles with the same three numbers (interest, free by, first debt gone): "Save the most" (highest interest first) and "Quick wins" (smallest first). Research: quick wins keep many people going; when shown the interest gap most pick the cheaper order. Show the gap in rupees and let them pick.
- Card balance: show the minimum-due trap (years and interest) next to 12-month ways out with real costs incl. fees and GST (card EMI ~16% + fee, personal loan ~13% + 2%). Tag the cheapest by cost.
- Progress line only once something is paid off; in the first month say the plan has started.
- The order of payoff is a numbered step line (it is a real sequence).

## From your bank + Ask Corpus (step 14, researched)
- SMS: the privacy promise is said in three plain lines with icons (this phone only, bank payments only, nothing saved until you tap Log). Android allows SMS reading only as all-or-nothing, so the promise has to be explicit; Play allows it for SMS-based money management with a declaration.
- SMS items grouped by day. Each: category chip, who it went to, category and account ending, amount. "Show the message" reveals the original so people can check. A likely duplicate (same amount, same day, already logged) gets an amber note and "Skip, it is the same" becomes the main action.
- Where SMS can't be read (web, iPhone), the screen is a paste box with a live preview row.
- Ask: rules, not AI; said up front. Welcome shows example questions in three groups (spending, saving and income, today/bills/people). Each answer leads with the one number, a sentence, a small ledger, an Open button, and 2–3 "Ask next" chips that follow from that answer (Google conversation design: suggestions relate to the last response).

## Safe to spend + Can I afford it (step 15, researched)
- Safe to spend sheet is a cascade (skill: waterfall for components adding up to a total): what came in, then each thing taken out with its sign, an icon and a bar of what is left after it, then "Left for N days", then shared per day, minus today, equals today's number. One-number apps like PocketGuard confuse people when the inputs aren't shown; ours shows every input.
- Can I afford it: price and what it is, Pay in full / On EMI, answer as you type. The verdict is a pill with word + icon + colour, then the one number (a month or a day left), then plain lines.
- Two research-based nudges: the price in days of usual income, and for unplanned buys a pause (a day from ₹5,000, a week from ₹25,000) because waiting lets the urgency fade.
- "Save for it" (start a jar) sits in the sheet footer only when the answer is Not yet.

## Add and Edit (researched)
- Goal: an entry in under 5 seconds and 3 taps (trackers people abandon take ~30 s with many fields). NN/g EAS: eliminate, automate, simplify.
- Amount first and big, then "What was it?" right under it (typing it picks the category from past entries), then the day as pills: Today, Yesterday, Earlier (opens a day stepper).
- Usuals row when the amount is empty, matching past notes while typing; both fill everything in one tap.
- Save button names the amount ("Save ₹120") and, when off, says why ("Enter an amount", "Pick a category").
- No blocking pop-ups: saving shows a toast "Saved: ₹120 on milk" with Undo; Edit saves and returns with a toast; Delete can be undone.
- Add and Edit share one AmountCard so they look and behave the same.

## Add v2: payment-app feel (user asked: premium, Gen Z, animated)
- No custom keypad (user rejected it): the phone's own number keyboard opens straight away. An invisible input sits over the big animated digits, so tapping the amount opens the keyboard.
- Amount is huge with Indian commas; each digit springs up into place and pops out when deleted; the size steps down as it grows; a blinking caret.
- Spent / Money in is a sliding pill that turns green for money in, together with the amount and the background.
- The background glow takes the colour of the picked category and cross-fades when it changes.
- Categories are one swipeable row; the picked one lifts with a ring in its own colour.
- Save is never a dead button: tapped too early it shakes the missing part (amount or categories) and its label says what is needed. After saving it turns green with a tick, money in gets a small colour burst, then the form clears.
- Everything respects Reduce Motion.

## SVG (react-native-svg 15)
- Rings (ActivityRing) are one SVG stroke with round caps and a soft gradient in their colour; they sweep to their value (900 ms ease-out), still under Reduce Motion.
- Add shows "what this does to today": a half-circle gauge around the amount, green to amber to red against today's safe-to-spend, a knob at the end, and the words under it ("Leaves ₹31 for today", "₹120 over what you can spend today"). Only for Spent, only when Safe to spend is known.
- Put accessibility props on a wrapping View, not on <Svg> (web warns).
- SVG is native: the phone needs a new dev build after it was added.

## Insights (researched)
- A month told as a story: the headline first (spent so far, change against the same days last month, where it went), then "What stands out" as swipeable one-idea cards, then detail. Research: recaps people engage with are personal, give context to every number, and read from one screen; finance recaps should help habits, not shame.
- Donut only for ≤ 5 slices (top 4 + Everything else) with a legend of label, % and amount next to it; slices sweep in.
- Month switcher is a row of pills that opens on This month.
- Trend lines use monotone curves (no overshoot: never draw money that isn't there) with soft gradient fills that draw in; months are tappable pills under the chart, legend above.
- Sections fade up one after another when the month changes.

## Invest (broker-style, step 16)
- Layout follows Groww and Kite: market strip on top, one portfolio card (Current value; Invested, Total returns, 1D returns in three ruled cells), then tabs.
- Tabs: Holdings, Watchlist, SIPs, Analysis. Sliding underline, sticky under the header while scrolling.
- Holding row: name and quantity left, a 1-month sparkline in the middle, value and P&L right, LTP and day change on the second line. The LTP flashes green or red when the price moves.
- Sort chips on Holdings: Current value, Returns %, Today, A to Z.
- Charts: StockChart (gradient area, dashed base at previous close on 1D, drag to scrub). The big price follows the finger and the line under it shows the change from the start of the range and the time.
- Green and red only mean up and down against a stated base. Never decorative.
- Copy: "+₹1,240 (+2.10%)", no arrows or triangles, no middle-dot chains.
- Step 16b (Groww and Angel One patterns): the portfolio card is label-left, value-right rows (Invested, 1D returns, Total returns, XIRR), as on Groww. An eye toggle hides rupee amounts but keeps percentages, as on Angel One.
- Rows show "LTP ₹152.81 (−1.89%)". Watchlist rows show the change in points and percent. Tapping the chosen sort again reverses it.
- Stock sheet: "Performance" with today's and the 52-week low and high on a grey track with a triangle marker, and sentence-case labels (no ALL CAPS). "Your investment" lists Shares, Avg. price, Current value, Invested, Total returns and 1D returns.
- Tab switches stay near-instant (120 ms). Groww users complain about slow tab animations.
- Pull down to refresh prices.

## Settings (step 17)
- Follows Android's settings guidance: a short overview where every row shows its current value, and you tap a row to change just that one thing.
- Each value sheet has its own Save button. Switches save the moment you flip them. There is no page-wide "Save changes".
- The reminder choices (how often, briefing time, quiet hours, the 7 switches) are one level down, in the Notifications sheet. The overview row sums them up, for example "Everything. Briefing at 9 AM", "7 on".
- Groups: profile card, Money, Bank SMS, Alerts, Look and privacy, Your data, then Sign out and Delete account. Labels are sentence case with no ALL CAPS section labels.
- Switches use the shared spring SwitchKnob, and the whole row is the tap target.

## Sign in and Create account (step 18)
- One AuthScreen for both, switched by a segmented control. Everything above the card is centred: the app icon, then the "Corpus" wordmark in Bricolage Grotesque Bold (Font.brand, used only for the wordmark), then a one-line tagline, then a "safe to spend today" arc that tracks the form: ₹0 at the start, one step for each finished field up to ₹48, then ₹100 when you press the button. It drops back to ₹48 if sign-in fails.
- Form research (Baymard, web.dev): no confirm-password field, a show-password eye instead. Autofill hints are set (email, current-password, new-password). The keyboard's Next and Go keys work. Errors sit under their field.
- Forgot password sends a Firebase reset email. The message never says whether the email has an account.
- Sign up shows a privacy policy link. The wordmark is "Corpus" in sentence case on both the splash and the sign-in screen.

## Setup (step 19)
- Six steps, each a big plain question with one line under it and no ALL CAPS eyebrows. A single progress bar springs forward, and steps slide in from the right going forward and from the left going back.
- Pick cards: the whole card is the tap target, with a square check for "pick all" and a round dot for "pick one". The chosen card gets a ring, and the "what this means for you" line opens only once chosen. Suggested options get a small green "Suggested" pill.
- The budget step shows the live daily number (budget ÷ 30) and what is left to save, so the choice feels concrete.
- The review uses the same Group lists as Settings. The welcome step's promise list (icon + title + text rows) was cut as filler, along with its incorrect "no SMS reading" line.
- Step 19b: each step has its own Aura colour (teal, blue, green, orange, yellow, purple), which crossfades as you move. The first step greets you in the Bricolage wordmark font ("Welcome to Corpus" becomes "Hi, Logesh" as you type).
- The budget step has a drag slider in ₹500 steps (a screen reader steps it by ₹500), three preset buttons and a spend / save split bar, all moving the live daily number. Check marks spring in when you pick.
- The review opens with DailyGauge (shared with sign-in in components/charts): the ring sweeps and the daily number counts up together, then the Income, Budget and Jars groups arrive one after another. Finish fires celebrate().

## Jars (step 20)
- LiquidJar (components/charts) is a glass mason jar drawn in SVG. The liquid inside, in the jar's colour, rolls in a slow wave and springs up when money goes in.
- Built from moving layers, not an animated SVG path, because animated path shapes do not render on web. Still under Reduce Motion, and hidden from screen readers.
- The Jars list is a two-column grid of JarTiles: the jar, the name, the amount in bold, "62% of ₹84K" and a thin bar in the jar's colour. The + sits outside the tile's tap area. Tiles arrive one after another.
- The jar detail hero is a large centred jar, 120 × 156, with the amount counting up under it.

## Income (step 21)
- Each income source has its own colour, assigned in the order it was added (sourceColor), so two clients never share one. The same colour shows on the list icon, the progress bar, the donut slice and the detail page.
- The hero adds a donut of this month's money by source, with a legend of name and %, plus a grey "No source" slice. That sits above the 6-month bars.
- The "Got paid" pill is filled while a source has not paid yet this month and plain once it has, so the list shows who is still to pay. The detail page's Got paid button takes the source's colour.

## Year report and Tax summary (step 22)
- Both use the shared Screen frame, Stepper and Segmented. All ALL CAPS section labels, "·" chains, arrows, "⬇" and "•" are gone.
- Year report: the hero is what you saved, big, with "32% of what came in" and an Earned / Spent / Invested strip. Below it: the AreaTrend chart (tap a month for its numbers), a "Where it went" donut with legend, Biggest spends as GroupRows with category icons, a "Look closer" group (last month's review, Tax summary), Data health, and Export rows with a CSV tag.
- Tax summary: the hero is the ITR due date and the days left. Then cards with a title and a pill (Schedule CG, Other sources, Old regime only) and label-left, amount-right lines. Capital gains has a real "Download for your CA" button. "Before you file" is a list with an icon on each row.
- Fix: Screen keyed flattened fragment children by their own keys, which clashed (".0" twice). Keys now include the position.

## Category detail (step 23)
- Shared Screen frame with the category's colour as the Aura. The hero has the category icon, the month name, the amount counting up, "N spends, about ₹X each", and a comparison in words ("12% more than Oct 1 to 22", red for more, green for less). No ▲▼ arrows.
- A limit bar in the category colour (red when over). With no limit, a "Set a monthly limit" button goes to Budgets.
- Last 6 months uses MonthBars, which now has optional selected / onSelect so the page controls the month. A dashed "Usual" line marks the 5-month average.
- New "Where it went" card: notes that repeat or take 20% or more of the month (Swiggy, Uber), with a bar and "5 times, 40% of food".

## Whole-app copy pass (step 24)
- Every user-facing "·" chain, "—", ▲▼ → ⬇ ↻ ✓ and emoji in screens, sheets, toasts, phone notifications and notification buttons was rewritten as plain sentences or commas. Ups and downs are said in words ("12% more than Oct", "up 3").
- ALL CAPS labels became sentence case (form labels, report card labels, Toast actions), and the shared form-label style lost its letter-spacing.
- Removed dead code: GoalSheet (emoji goals, already moved to jars), ScreenHeader and SectionLabel with their styles, and four unused style files.
- Left as they are: "—" as the empty value in number cells, and arrows inside code comments.

## Insights v3 (step 25)
- The hero (spent, change, donut, came in / kept / % of income) stays on top. Under it a sticky switch for Overview, Spending, Income and Trends, so each view is one short scroll.
- Overview: "Where the month is heading" (month-end estimate that counts one big spend once, a budget bar with a tick for today, and how much a day keeps you inside), What stands out, Where your income went.
- Spending: Where your money went, Day by day, "Your week" (average spend per weekday over 3 months, the costliest day in orange, said in words), "Small spends add up" (spends under ₹200), Biggest spends.
- Income: Where it came from, "How much you kept" (savings rate per month, green at 20% or more, yellow under, red when negative).
- Trends: Last 6 months, "Against your usual" (categories up or down at least ₹300 against the 3 months before, over the same days; tap to open).
- Step 25b, more visual: PillTabs (components/ui) has icon-over-word tabs with a filled pill that springs across.
- BurnChart (components/charts) shows your spending adding up day by day as a drawn line with a gradient underneath. A dashed line is even spending to the budget, and a dotted line runs to the month-end estimate. Green when you finish under budget, red when over, and the card says the same in words.
- Weekday and "kept" bars grow up one after another. Small spends show as a grid of dots, one per spend, that pop in. "What stands out" cards use the pastel tones with a solid icon square.
- Step 25c, futuristic: RadialRings (components/charts) shows the top 4 categories as concentric rings of light, each a gradient from white into its colour, with a soft wide copy underneath as a glow. They sweep in one after another and replace the hero donut on Insights.
- BurnChart got a glow under its line and a pulsing "you are here" ring on today. That ring is an Animated.View, because animated SVG radius does not render on web.
- PillTabs uses an indigo-to-teal gradient pill with a coloured shadow. Bars have a light catch at the top. Small-spend dots glow. Insights cards have a hairline edge, and the Aura is indigo with teal.
- Web note: never use SVG rotation/origin props (they turn into an invalid DOM transform-origin). Use transform="rotate(-90 cx cy)".
