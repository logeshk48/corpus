// Things you own that aren't in an account: home, land, vehicle, gold, anything else.
export type AssetKind = 'home' | 'property' | 'vehicle' | 'gold' | 'other';

export type ManualAsset = {
  id: string;
  name: string;            // "Our flat", "Activa", "Wedding gold"
  kind: AssetKind;
  value: number;           // your own estimate (ignored for vehicles/gold when auto values exist)
  addedAt: string;         // ISO — counted in net worth from this date
  updatedAt: string;       // ISO — last time you confirmed the value
  // vehicle: value falls each year from the price you paid
  purchasePrice?: number;
  purchaseDate?: string;   // ISO
  // gold: grams × purity × today's 24K rate per gram (you enter the rate)
  grams?: number;
  karat?: 24 | 22 | 18;
  rate24k?: number;
};

export type NewManualAsset = Omit<ManualAsset, 'id'>;

export const ASSET_KINDS: { id: AssetKind; label: string; icon: string; hint: string }[] = [
  { id: 'home', label: 'Home you live in', icon: 'home-outline', hint: 'Shown separately — many people leave it out' },
  { id: 'property', label: 'Other property', icon: 'business-outline', hint: 'Land, a rented flat, a shop' },
  { id: 'vehicle', label: 'Vehicle', icon: 'car-outline', hint: 'Value drops each year automatically' },
  { id: 'gold', label: 'Gold', icon: 'diamond-outline', hint: 'Jewellery or coins, valued by weight' },
  { id: 'other', label: 'Something else', icon: 'cube-outline', hint: 'Any asset you could sell' },
];
export const assetKindMeta = (k: AssetKind) => ASSET_KINDS.find((x) => x.id === k) ?? ASSET_KINDS[4];
