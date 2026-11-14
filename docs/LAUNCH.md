# Corpus — launch checklist (Google Play, Android)

Everything below is done by you (accounts, payments, store forms). The app side is ready.

## 0. What's already done in the code
- App name **Corpus**, new icon (gold C on ledger ticks), ink-green splash, dark mode.
- Release profiles in `eas.json`: `preview` = APK to test on your phone, `production` = AAB for Play.
- **Delete account and data** in Settings (Play requires it for apps with sign-up).
- Public pages (live after you push to Vercel):
  - Privacy policy: https://corpus-fawn-eight.vercel.app/privacy
  - Account deletion: https://corpus-fawn-eight.vercel.app/delete-account
- No SMS permission in Play builds (SMS reading is only in the `development-sms` build). Users get **Share → Corpus** instead.
- No full photo-library permission (system photo picker), no microphone.
- No ads, no analytics SDK, no debug logs.

## 1. Put your Firebase keys on EAS (once)
Cloud builds don't see your `.env` (it's gitignored — keep it that way):
```
eas env:push --environment preview --path .env
eas env:push --environment production --path .env
```
Check with `eas env:list --environment production`.

## 2. Test the release version on your phone
```
eas build -p android --profile preview
```
Install the APK (it replaces nothing — it's a normal app, not the dev client). Check: sign-in, add, scan a receipt, Ask Corpus, reminders, delete-account flow on a throwaway account.

## 3. Google Play developer account
- Register at play.google.com/console (one-time fee, personal account). Verify identity.
- New personal accounts must run a **closed test with at least 12 testers for 14 days** before going to production. Start this early.

## 4. Create the app in Play Console
- App name: **Corpus — Money Tracker** · Default language English (India) · App · Free.
- Package: `com.logesh.corpus` (permanent after the first upload).

### Store listing
**Short description (≤80):**
Know what you can spend today. Track spending, bills, SIPs and net worth.

**Full description:**
Corpus answers one question every morning: how much can I safely spend today?

It takes your income, bills, SIPs and savings goals, and shares what's left across the days until pay day. Log spends in a tap, scan a receipt, or share a bank SMS straight into Corpus.

• Safe to spend today — on your own pay cycle
• One-tap logging, receipt scan, share bank SMS to log
• Bills, EMIs and card dues with reminders
• Money with people: lent, borrowed, part payments
• Live prices for stocks, mutual funds, NPS and crypto; SIP tracking and XIRR
• Net worth, Wealth score and a 5/10/20-year projection
• Can I afford this? and Ask Corpus — answers from your own numbers
• Year report and tax summary for your ITR, CSV export

Private by design: no bank login, no ads, no trackers. Receipts and SMS are read on your phone and never uploaded.

**Graphics:** icon 512×512 (export `assets/images/icon.png`), feature graphic 1024×500, at least 2 phone screenshots (take them from the preview build).

### App content forms
| Form | Answer |
|---|---|
| Privacy policy | https://corpus-fawn-eight.vercel.app/privacy |
| App access | Login needed — give a test email + password for reviewers (make a fresh test account) |
| Ads | No ads |
| Content rating | Questionnaire → Utility/Productivity, no objectionable content |
| Target audience | 18+ |
| Financial features | Personal finance: budgeting / expense tracking. No loans, no payments, no investing transactions |
| Government app / news / health | No |
| Data deletion | Yes, in app + https://corpus-fawn-eight.vercel.app/delete-account |

### Data safety
| Question | Answer |
|---|---|
| Collects data? | Yes |
| Personal info → Email address | Collected · Account management · Not shared · Required |
| Financial info → Other financial info (entries you type) | Collected · App functionality · Not shared · Required |
| Photos, SMS | Not collected (processed on the device only, never sent) |
| Encrypted in transit | Yes |
| Users can request deletion | Yes |

## 5. Build and upload
```
eas build -p android --profile production
eas submit -p android --profile production
```
(First `submit` asks for a Google service-account key — or upload the `.aab` by hand in Play Console → Testing → Closed testing.)

## 6. Later: automatic bank SMS on Play
Only if you want the auto "log it?" for Play users: add `CORPUS_SMS=1` to the production profile, then fill Play's **SMS permissions declaration** → use case "SMS-based money management". Google reviews it; approval isn't guaranteed. Until then Share → Corpus covers it with no permission.
