# Corpus — Data Model

All user data lives under one root, protected by security rules
(`firestore.rules`): a user can only read/write their own `users/{uid}` tree.

```
users/{uid}/
├── transactions/{txId}      ← live (Day 9)
├── incomeStreams/{streamId} ← live (Day 15)
├── vaults/{vaultId}         ← live (Day 17)
├── vaultEntries/{entryId}   ← live (Day 17)
├── bills/{billId}           ← live (Day 19)
├── investments/{invId}      ← Day 39
└── settings/main            ← live (Day 13)
```

## transactions/{txId}

| Field       | Type      | Notes                                      |
|-------------|-----------|--------------------------------------------|
| type        | string    | `"expense"` or `"income"`                  |
| amount      | number    | Always positive, in INR                    |
| category    | string    | Category id, e.g. `"food"`, `"salary"`     |
| note        | string?   | Optional, omitted when empty               |
| date        | string    | ISO 8601 — when the money moved            |
| streamId    | string?   | Income only — links to incomeStreams/{id}  |
| recurringId | string?   | Set for auto-logged recurring items        |
| createdAt   | timestamp | Server time — when the record was saved    |

TypeScript source of truth: `src/types/transaction.ts`

## Conventions

- **Dates** are ISO strings; ranges are `[start, end)` — start inclusive,
  end exclusive (see `src/utils/dates.ts`).
- **Weeks** start on Monday.
- **Money** is stored as a plain number in rupees; formatting
  (`₹6,200`) happens only in the UI with `toLocaleString('en-IN')`.
- **No `undefined` fields** — the service layer strips them before writing.
- Screens never call Firestore directly; they go through `src/services/*`.

## settings/main

| Field         | Type    | Notes                                   |
|---------------|---------|-----------------------------------------|
| displayName   | string? | Shown in the Home greeting              |
| monthlyBudget | number? | Total monthly spending budget, INR      |
| categoryBudgets | map? | Expense category id → monthly limit, e.g. `{ food: 8000 }` |
| currency      | string  | `"INR"` (only option for now)           |

Missing fields fall back to `DEFAULT_SETTINGS` (`src/types/settings.ts`).

## incomeStreams/{streamId}

| Field           | Type      | Notes                                         |
|-----------------|-----------|-----------------------------------------------|
| name            | string    | e.g. "Salary", "Zenith Studio"                |
| type            | string    | `salary` · `client` · `business` · `other`    |
| expectedMonthly | number?   | Expected income per month, INR                |
| createdAt       | timestamp | Server time                                   |

Deleting a stream does not touch past transactions; their `streamId`
simply no longer resolves and they show as unlinked income.

## vaults/{vaultId}  (money jars)

| Field     | Type      | Notes                                   |
|-----------|-----------|-----------------------------------------|
| name      | string    | "Tax", "Emergency fund", "Goa trip"     |
| icon      | string    | Ionicons name                           |
| color     | string    | Accent colour (hex)                     |
| goal      | number?   | Optional target amount, INR             |
| targetDate | string?  | `'YYYY-MM'` — month to reach the goal by |
| kind      | string?   | `tax` · `emergency` · `savings` · `goal` — unlocks smart info |
| createdAt | timestamp | Server time — jars are listed in this order |

## vaultEntries/{entryId}  (money in / out of a jar)

| Field   | Type    | Notes                              |
|---------|---------|------------------------------------|
| vaultId | string  | The jar this belongs to            |
| type    | string  | `"in"` or `"out"`                  |
| amount  | number  | Always positive, INR               |
| note    | string? | Optional                           |
| date    | string  | ISO 8601                           |

A jar's balance is never stored — it is always Σ in − Σ out of its entries.
Deleting a jar deletes its entries in the same batch.

## bills/{billId}  (recurring bills)

| Field           | Type    | Notes                                              |
|-----------------|---------|----------------------------------------------------|
| name            | string  | "Rent", "Netflix", "Bike EMI"                      |
| amount          | number  | INR per month                                      |
| category        | string  | Expense category id                                |
| dayOfMonth      | number  | 1–31; 31 = last day in shorter months              |
| active          | boolean | Paused bills are not logged or reserved            |
| startMonth      | string  | `'YYYY-MM'` — first month it applies               |
| lastLoggedMonth | string? | `'YYYY-MM'` — month it was last recorded           |

Auto-logging writes the expense to `transactions/bill_<billId>_<YYYY-MM>` and sets
`lastLoggedMonth` in one batch, so a bill can never be logged twice for a month.

