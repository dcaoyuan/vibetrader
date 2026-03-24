# VibeTrader 
Toward an Open Source AI-Friendly Trading Platform. 
- APIs for specifying ticker, timeframe, and indicators etc.
- Supports Pine Script indicators.
- Take screenshot of chart.

> [Pine Script™](https://www.tradingview.com/pine-script-docs/welcome/) is a trademark of TradingView, Inc., and serves as their programming language for creating custom trading tools. VibeTrader is an independent platform and is not affiliated with, endorsed by, or sponsored by TradingView.

## For Developers

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/dcaoyuan/vibetrader)

https://deepwiki.com/dcaoyuan/vibetrader

## For Users

### Shortcuts

#### Select symbol, timeframe
* Click on symbol: Select symbol
* Click on timeframe: Select timeframe

#### Move, Zoom
* Mouse:
  * Drag: Move chart
  * Ctrl + Drag: Scale chart
  * Double click on chart: Put a reference crosshair
  * Double click on y-axis: Remove reference crosshair
  * Wheel: Move chart
  * Shift + Wheel: Zoom in/out chart 

* Keyboard:
  * Left/Right arrow: Move chart
  * Ctrl + Left/Right arrow: Move reference crosshair
  * ESC: Remove reference crosshair / Hide crosshair
  * Up/Down arrow: Zoom in/out chart
  * Space: Swich fast/normal moving speed

#### Drawing
* Mouse:
  * Click on drawing: Select it
  * Double Click: Complete variable-handle drawing
  * Ctrl + Click on variable-handle drawing's handle: remove this handle
  * Ctrl + Drag on variable-handle drawing's segment: insert a handle

* Keyboard:
  * ESC: Unselect drawing
  * DELETE: Delete selected drawing

## Screenshot
<img src="./docs/images/screenshot_01.png" />

## Build

```bash
npm install

npm run build
npm run preview
```
