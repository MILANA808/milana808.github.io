# AKSI Quant — Paper Trading Lab

Experimental, browser-only research tool for cryptocurrency strategy evaluation.

## Current scope

- Loads public Binance Spot OHLCV candles for BTCUSDT, ETHUSDT, or SOLUSDT at 1h, 4h, or 1d intervals.
- If the public market-data endpoint is unavailable, switches to synthetic candles and explicitly labels them as demo data.
- Runs a simple long-only EMA(12)/EMA(26) crossover with an RSI(14) filter.
- Models entries/exits at the next candle open, with configurable-in-code assumptions of 0.10% fee per side and 0.05% slippage per side.
- Shows the historical equity curve, maximum drawdown estimate, closed trades, latest rule-based signal, and CSV export.
- Uses no exchange account, API key, wallet, private key, or real order endpoint.

## Important limitations

This is a research prototype, not a profitable or validated trading system. The strategy is a baseline, not machine learning. Historical results do not establish future returns. The current test is not a full institutional backtest: it needs independent tests for candle timing, open-position accounting, benchmark comparison, parameter stability, walk-forward evaluation, realistic liquidity/fees, and edge cases before strategy claims are made.

Do not connect real funds or use this prototype to make automated live trades. No live order execution exists in this project.

## Run

Open https://milana808.github.io/quant/ after the branch is merged and GitHub Pages has deployed it. Until then, preview the file from the branch at `quant/index.html`.

## Acceptance checks

1. Market data loads, or a clearly labelled synthetic demo appears.
2. Switching pair and interval reloads the data.
3. The page displays price, strategy P/L, drawdown, trade count, signal and a trade table.
4. Equity-curve timestamps align to the candle where the simulated execution/mark occurs; the final open position is included once in terminal equity and drawdown.
5. CSV export downloads a file.
6. No exchange credentials or order endpoints are requested or stored.
