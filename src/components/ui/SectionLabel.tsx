import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { styles } from './SectionLabel.styles';

type Props = {
  children: string;  // the label; shown in sentence case (callers may pass CAPS)
  right?: ReactNode; // a short meta string or a small link
};

// Short words that stay in capitals when a label is turned into sentence case
const KEEP = new Set(['SIP', 'SIPS', 'EMI', 'EMIS', 'ITR', 'UPI', 'FD', 'FDS', 'NPS', 'MF', 'XIRR', 'LTCG', 'STCG', 'GST', 'ETF', 'ETFS', 'PPF', 'EPF', 'SMS', 'IOU', 'IOUS', 'NAV', 'PAN', 'TDS', 'HRA', 'OTP', 'ATM', 'EOD', 'AM', 'PM', 'I']);
export const sentence = (t: string) =>
  t.split(/(\s+)/).map((w, i) => {
    const core = w.replace(/[^A-Za-z]/g, '');
    if (KEEP.has(core.toUpperCase()) && w === w.toUpperCase()) return w;
    const low = w === w.toUpperCase() ? w.toLowerCase() : w;
    return i === 0 ? low.charAt(0).toUpperCase() + low.slice(1) : low;
  }).join('');

// "Money", "This month · ₹4,200" — the label above a group of cards
export default function SectionLabel({ children, right }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.text} accessibilityRole="header">
        {sentence(children)}
      </Text>
      {typeof right === 'string' ? <Text style={styles.meta}>{right}</Text> : right}
    </View>
  );
}
