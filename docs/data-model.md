# Corpus — Data Model

All user data lives under one root, protected by security rules
(`firestore.rules`): a user can only read/write their own `users/{uid}` tree.

```
users/{uid}/
├── transactions/{txId}      ← live (Day 9)
├── incomeStreams/{streamId} ← live (Day 15)
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
| taxVaultPercent | number? | % of taxable income reserved for tax |
| savingsVaultPercent | number? | % of all income reserved for savings |
| taxIncludesSalary | boolean? | Apply the tax vault to salary too (default false — TDS) |
| vaultMoved | map? | `'YYYY-MM'` → `{ tax, savings }` amounts the user marked as transferred |
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

