export type StreamType = 'salary' | 'client' | 'business' | 'other';

export type IncomeStream = {
  id: string;
  name: string;              // e.g. "Salary", "Zenith Studio"
  type: StreamType;
  expectedMonthly?: number;  // what you expect per month, in INR (optional)
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
