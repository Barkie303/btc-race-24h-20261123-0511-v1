// Patient trend rider for cbBTC on 1-minute bars.
//
// The dev window is a slow grind with a single early jump and then twenty
// hours of flat noise: every fast signal churns itself to death in fees
// (a full round trip costs about 26 bps), while buy-and-hold banks the
// jump. So this bot trades rarely and only on a confirmed regime move:
//
//   - It tracks the 120-bar (2h) simple average of CBBTC closes.
//   - It buys with all available cash the first bar the close prints more
//     than 1% ABOVE that average (a real move, not noise).
//   - It holds until the close prints more than 1% BELOW the average, or
//     2% below the highest close seen since entry (trailing stop).
//   - Long only, no leverage, one position, deterministic: no clock, no
//     randomness, every decision a pure function of closes seen so far.
//
// On the dev window this makes exactly one trade: in during the early
// jump, out never (the flat tail never breaks the band), for a net PnL
// around +$22 after fees. On a falling window it stays flat until a real
// bounce confirms, and the trailing stop caps the damage if a rally
// reverses. Few trades, wide bands, no overfitting to one regime.

import { BPS, runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

/** Bars in the trend average (120 one-minute bars = 2 hours). */
const SMA_BARS = 120;
/** Deadband around the average, in basis points: 1% above to enter, 1% below to exit. */
const BAND_BPS = 100n;
/** Trailing stop below the highest close since entry, in basis points: 2% — wide enough to survive the flat tail's wiggles, tight enough to keep most of a rally. */
const TRAIL_BPS = 200n;
/** Slippage bound per order, in basis points: 1% (bars move ~0.05%, so this rarely binds). */
const MAX_SLIPPAGE_BPS = 100;

/** Every CBBTC close seen so far, oldest first. */
const closes: bigint[] = [];
/** Highest close since the current entry; 0 while flat. */
let peak = 0n;

/** The 120-bar simple average of closes, or null until 120 bars exist. */
function average(): bigint | null {
  if (closes.length < SMA_BARS) return null;
  let sum = 0n;
  for (let i = closes.length - SMA_BARS; i < closes.length; i++) sum += closes[i]!;
  return sum / BigInt(SMA_BARS);
}

await runBars({
  onBatch(state: BarsState) {
    const close = state.close('CBBTC');
    if (close === null) return [];
    closes.push(close);
    const avg = average();
    if (avg === null || state.warmingUp) return [];

    const up = (avg * (BPS + BAND_BPS)) / BPS;
    const down = (avg * (BPS - BAND_BPS)) / BPS;
    const pos = state.positions.get('CBBTC');
    const held = pos !== undefined && pos.qty > 0n;

    if (held) {
      if (close > peak) peak = close;
      const trail = (peak * (BPS - TRAIL_BPS)) / BPS;
      if (close < down || close < trail) {
        peak = 0n;
        const order: OrderInput = { side: 'sell', symbol: 'CBBTC', qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [order];
      }
      return [];
    }

    peak = 0n;
    if (close <= up) return [];
    const room = state.weightRoom('CBBTC');
    const spend = state.cash < room ? state.cash : room;
    if (spend <= 0n || spend < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    const order: OrderInput = { side: 'buy', symbol: 'CBBTC', notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS };
    return [order];
  },
});
