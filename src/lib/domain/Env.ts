import { Source } from "./DataFecther"

export const dev = false

export const source: Source = dev ? Source.yfinance : Source.binance
