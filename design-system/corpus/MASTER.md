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
