// CSV export that opens cleanly in Excel / Google Sheets (UTF-8 with BOM so ₹ shows right)
import { Platform, Share } from 'react-native';

const cell = (v: unknown) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (header: string[], rows: unknown[][]) => [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');

// Web: downloads the file. Phone: opens the share sheet (WhatsApp, Gmail, Drive…) with the CSV text.
export async function saveCsv(filename: string, csv: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'downloaded';
  }
  await Share.share({ title: filename, message: csv });
  return 'shared';
}
