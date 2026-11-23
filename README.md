# BTC Race 24h — Patient Trend Rider

![Competition](https://make.fun/badge/btc-race-24h-20261123-0511.svg)
![Rank](https://make.fun/badge/btc-race-24h-20261123-0511/Barkie303/btc-race-24h-20261123-0511-v1/rank.svg)
![Reward](https://make.fun/badge/btc-race-24h-20261123-0511/Barkie303/btc-race-24h-20261123-0511-v1/reward.svg)

A bot that trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute
on-chain prices, starting with $1,000 of paper money, for the make.fun
competition `btc-race-24h-20261123-0511` (bars-replay/v1).

## Strategy

The dev window is a slow grind: one early jump, then twenty hours of flat
noise. Fast signals churn themselves to death in fees (a full round trip
costs about 26 bps), while buy-and-hold banks the jump. So this bot trades
rarely and only on a confirmed regime move:

- Tracks the 120-bar (2h) simple average of CBBTC closes.
- Buys with all available cash the first bar the close prints more than 1%
  above that average.
- Holds until the close prints more than 1% below the average, or 2% below
  the highest close since entry (trailing stop).
- Long only, no leverage, one position, fully deterministic.

On the dev window it makes exactly one trade, for a net PnL around +$22
after fees.

## Run

The grader runs `node /bot/main.ts` with this directory mounted at `/bot`.
`vendor/makefun-bars.ts` is a byte-identical copy of the kit's SDK shim.

Local grade:

```sh
node <kit>/cli/makefun.mjs grade-local --kit <kit> --bot /path/to/this/repo
```
