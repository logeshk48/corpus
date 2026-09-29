# Corpus — Data Model

All user data lives under one root, protected by security rules
(`firestore.rules`): a user can only read/write their own `users/{uid}` tree.

```
users/{uid}/
├── transactions/{txId}      ← live (Day 9)
├── incomeStreams/{streamId} ← Day 16
├── investments/{invId}      ← Day 39
└── settings (doc)           ← Day 15 / 18
```

## transactions/{txId}

| Field       | Type      | Notes                                      |
|-------------|-----------|--------------------------------------------|
| type        | string    | `"expense"` or `"income"`                  |
| amount      | number    | Always positive, in INR                    |
| category    | string    | Category id, e.g. `"food"`, `"salary"`     |
| note        | string?   | Optional, omitted when empty               |
| date        | string    | ISO 8601 — when the money moved            |
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