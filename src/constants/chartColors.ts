// Chart mark colours — all validated with the dataviz validator on the dark card surface #1A1D24.
// Same hues as the app's green / gold, stepped for data marks.
export const ChartColors = {
  income: '#199e70',
  spend: '#c98500',
  track: '#23262E', // empty bar track
  grid: '#2A2E38',  // recessive grid / baseline
  future: '#1F2229',
  // Cash-flow segments (adjacent order validated: CVD ΔE ≥ 17, normal ΔE ≥ 24)
  flow: {
    bills: '#3987e5',
    other: '#c98500',
    jars: '#9085e9',
    left: '#199e70',
  },
  // Calendar heatmap — sequential amber, more = brighter (ordinal check passed, faintest 2.16:1)
  heat: ['#23262E', '#684e16', '#946c0c', '#c08600', '#efae38'] as const,
  budgetMarker: '#F5F2E8',
};
