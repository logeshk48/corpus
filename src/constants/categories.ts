export type Category = {
  id: string;
  label: string;
  icon: string; // Ionicons name
};

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food',      label: 'Food',      icon: 'restaurant' },
  { id: 'travel',    label: 'Travel',    icon: 'bus' },
  { id: 'shopping',  label: 'Shopping',  icon: 'bag-handle' },
  { id: 'bills',     label: 'Bills',     icon: 'receipt' },
  { id: 'health',    label: 'Health',    icon: 'fitness' },
  { id: 'fun',       label: 'Fun',       icon: 'game-controller' },
  { id: 'education', label: 'Education', icon: 'book' },
  { id: 'other',     label: 'Other',     icon: 'ellipsis-horizontal' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary',   label: 'Salary',   icon: 'briefcase' },
  { id: 'client',   label: 'Client',   icon: 'people' },
  { id: 'business', label: 'Business', icon: 'storefront' },
  { id: 'other',    label: 'Other',    icon: 'ellipsis-horizontal' },
];