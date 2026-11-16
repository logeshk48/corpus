import { addTransaction } from '@/services/transactions';
import type { IncomeStream } from '@/types/incomeStream';

// "Got paid" saves a normal income entry linked to the source, so it shows everywhere income does
export const logPaid = (stream: IncomeStream, amount: number, date: Date, note: string | undefined, accountId?: string) =>
  addTransaction({ type: 'income', amount: Math.round(amount * 100) / 100, category: stream.type, streamId: stream.id, date: date.toISOString(), note: note ?? stream.name, accountId });
