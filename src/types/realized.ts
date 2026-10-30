// A sale you made — kept so this year's tax (and the ₹1.25 L exemption) is right.
export type Realized = {
  id: string;
  investmentId: string;
  name: string;
  cls: string;          // tax class at the time of sale (equity, debt, crypto…)
  date: string;         // ISO
  units: number;
  sellPrice: number;
  cost: number;         // FIFO cost of the units sold
  shortGain: number;
  longGain: number;
};
export type NewRealized = Omit<Realized, 'id'>;
