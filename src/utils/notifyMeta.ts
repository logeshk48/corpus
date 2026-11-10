// What each phone notification opens when tapped, and which buttons it shows.
export type NotifyCat = 'corpus-bill' | 'corpus-sip' | 'corpus-done';

export function hrefFor(id: string): string {
  if (id.startsWith('bill:')) return `/bill/${id.split(':')[1]}`;
  if (id.startsWith('card:') || id.startsWith('low:') || id.startsWith('checkin')) return '/accounts';
  if (id.startsWith('sip:') || id.startsWith('invest:')) return '/invest';
  if (id.startsWith('debtplan:')) return id.includes(':ask') ? '/' : '/debts';
  if (id.startsWith('brief:') || id.startsWith('week:')) return '/inbox';
  if (id.startsWith('budget:')) return '/budgets';
  if (id.startsWith('over:')) return '/';
  return '/ious'; // money with people
}

export function categoryFor(id: string): NotifyCat | null {
  const base = id.replace(/:(eve|3d|snz)$/, '');
  if (base.startsWith('bill:')) return 'corpus-bill';
  if (base.startsWith('sip:') && base.endsWith(':ask')) return 'corpus-sip';
  if (base.startsWith('brief:') || base.startsWith('week:') || base.startsWith('over:') || base.startsWith('low:')) return null;
  return 'corpus-done';
}

// buttons (they open the app for a second, do the action, and show a confirmation)
export const CATEGORIES: { id: NotifyCat; actions: { id: string; title: string }[] }[] = [
  { id: 'corpus-bill', actions: [{ id: 'paid', title: '✓ Paid' }, { id: 'snooze', title: 'Remind tomorrow' }] },
  { id: 'corpus-sip', actions: [{ id: 'sip-yes', title: '✓ Yes, it went' }, { id: 'sip-skip', title: 'Skipped' }] },
  { id: 'corpus-done', actions: [{ id: 'done', title: '✓ Done' }, { id: 'snooze', title: 'Remind tomorrow' }] },
];
