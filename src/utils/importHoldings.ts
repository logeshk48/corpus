// Turn pasted holdings (a broker CSV, a copied table, or typed lines) into rows.
// Works with Zerodha (Instrument, Qty., Avg. cost), Groww stocks (Stock Name, Quantity, Average buy price),
// Groww / Kuvera / CAS mutual funds (Scheme Name, Units, Invested Value), and lines like "TCS 10 3400".
export type ParsedRow = { name: string; qty: number; avg: number | null; invested: number | null };

const NAME = /instrument|symbol|scrip|stock|company|scheme|fund|security|^name$|name/i;
const QTY = /qty|quantity|units|shares|^balance/i;
const AVG = /avg|average|buy price|cost price|purchase price|purchase nav/i;
const INV = /invested|investment|buy value|cost value|purchase value|amount/i;

const toNum = (s: string) => {
  const n = Number(String(s).replace(/[₹,\s"]/g, ''));
  return isFinite(n) && String(s).trim() !== '' ? n : null;
};

function splitCsv(line: string, d: string): string[] {
  if (d !== ',') return line.split(d).map((x) => x.trim());
  const out: string[] = [];
  let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) (out.push(cur.trim()), (cur = ''));
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseHoldings(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  // find a header row anywhere in the first few lines
  const hi = lines.slice(0, 6).findIndex((l) => QTY.test(l) && NAME.test(l));
  if (hi >= 0) {
    const head = lines[hi];
    const d = head.includes('\t') ? '\t' : head.includes(';') ? ';' : ',';
    const cols = splitCsv(head, d);
    const find = (re: RegExp, not?: RegExp) => cols.findIndex((c) => re.test(c) && !(not && not.test(c)));
    const iName = find(NAME, /isin|amc|category|folio/i);
    const iQty = find(QTY, /price|value/i);
    const iAvg = find(AVG);
    const iInv = find(INV, /current|cur\./i);
    return lines
      .slice(hi + 1)
      .map((l) => splitCsv(l, d))
      .map((c) => ({
        name: (c[iName] ?? '').replace(/"/g, '').trim(),
        qty: toNum(c[iQty] ?? '') ?? 0,
        avg: iAvg >= 0 ? toNum(c[iAvg] ?? '') : null,
        invested: iInv >= 0 ? toNum(c[iInv] ?? '') : null,
      }))
      .filter((r) => r.name && r.qty > 0 && !/^total/i.test(r.name))
      .map((r) => ({ ...r, avg: r.avg ?? (r.invested ? r.invested / r.qty : null) }));
  }
  // free-form: "TCS 10 3400" / "Parag Parikh Flexi Cap  152.3  45000"
  return lines
    .map((l) => {
      const tokens = l.split(/\t|\s+/);
      const nums: number[] = [];
      const words: string[] = [];
      for (const t of tokens) {
        const n = toNum(t);
        if (n != null && /\d/.test(t) && nums.length < 3 && (words.length > 0 || nums.length > 0)) nums.push(n);
        else if (!nums.length) words.push(t);
      }
      const [qty = 0, avg = null] = nums; // "name qty avg-price"
      return { name: words.join(' ').replace(/[-–:]+$/, '').trim(), qty, avg, invested: null };
    })
    .filter((r) => r.name && r.qty > 0);
}

// Rank mutual-fund matches: Direct-Growth unless the text says Regular / IDCW
export function rankFunds<T extends { name: string }>(want: string, list: T[]): T[] {
  const w = want.toLowerCase();
  const wantRegular = /regular/.test(w);
  const wantIdcw = /idcw|dividend|payout/.test(w);
  const words = w.split(/[^a-z0-9]+/).filter((x) => x.length > 2 && !['fund', 'plan', 'direct', 'regular', 'growth', 'option'].includes(x));
  const score = (n: string) => {
    const l = n.toLowerCase();
    let s = words.filter((x) => l.includes(x)).length * 10;
    if (/direct/.test(l) !== wantRegular) s += 3;
    if (/growth/.test(l) !== wantIdcw) s += 2;
    if (/bonus|segregated/.test(l)) s -= 5;
    return s;
  };
  return [...list].sort((a, b) => score(b.name) - score(a.name));
}
