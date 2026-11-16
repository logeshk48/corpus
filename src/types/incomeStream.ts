export type StreamType = 'salary' | 'client' | 'business' | 'other';

export type IncomeStream = {
  id: string;
  name: string;              // e.g. "Salary", "Zenith Studio"
  type: StreamType;
  fixed?: boolean;           // true = the same amount every month. Default: it varies (most salaries with incentives, freelance, clients)
  expectedMonthly?: number;  // fixed: the monthly amount. Varying: only a starting guess until real payments teach the usual range
};

export type NewIncomeStream = Omit<IncomeStream, 'id'>;

export const STREAM_TYPES: { id: StreamType; label: string; icon: string }[] = [
  { id: 'salary',   label: 'Salary',   icon: 'briefcase' },
  { id: 'client',   label: 'Client',   icon: 'people' },
  { id: 'business', label: 'Business', icon: 'storefront' },
  { id: 'other',    label: 'Other',    icon: 'ellipsis-horizontal' },
];

export function streamTypeMeta(type: StreamType) {
  return STREAM_TYPES.find((t) => t.id === type) ?? STREAM_TYPES[3];
}
