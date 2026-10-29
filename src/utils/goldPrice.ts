// ─── Live gold price (India) ───
// Source: gold-api.com (free, no key) gives the INTERNATIONAL spot price per troy ounce in ₹.
// India's market rate is higher because of import duty — 15% since May 2026 — so:
//   24K ₹/gram ≈ spot ₹/oz ÷ 31.1035 × 1.15   (before 3% GST and making charges, like IBJA rates)
export const GOLD_SOURCE = 'https://api.gold-api.com/price/XAU/INR';
export const IMPORT_DUTY = 0.15;
const GRAMS_PER_OZ = 31.1035;

export type GoldQuote = { rate24k: number; at: string; spotPerGram: number };

export const indianRateFromSpot = (spotPerOzInr: number) => {
  const spotPerGram = spotPerOzInr / GRAMS_PER_OZ;
  return { spotPerGram: Math.round(spotPerGram), rate24k: Math.round(spotPerGram * (1 + IMPORT_DUTY)) };
};

let cache: { quote: GoldQuote; fetched: number } | null = null;

export async function fetchGoldRate(maxAgeMs = 30 * 60_000): Promise<GoldQuote | null> {
  if (cache && Date.now() - cache.fetched < maxAgeMs) return cache.quote;
  try {
    const r = await fetch(GOLD_SOURCE);
    if (!r.ok) return cache?.quote ?? null;
    const j = await r.json();
    if (typeof j.price !== 'number' || j.currency !== 'INR') return cache?.quote ?? null;
    const { spotPerGram, rate24k } = indianRateFromSpot(j.price);
    const quote = { rate24k, spotPerGram, at: j.updatedAt ?? new Date().toISOString() };
    cache = { quote, fetched: Date.now() };
    return quote;
  } catch {
    return cache?.quote ?? null; // offline: keep the last price
  }
}
