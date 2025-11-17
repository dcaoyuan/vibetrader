import { Theme } from "../theme/Theme";
import { AbstractChart } from "./AbstractChart"
import { Path } from "../../svg/Path";
import { ChartView } from "../view/ChartView";
import type { ChartYControl } from "../view/ChartYControl";

export class CursorChart extends AbstractChart {
  paths(): Path[] {
    return this.cursorPath ? [this.cursorPath] : [];
  }

  static readonly MONEY_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }); // DecimalFormat("0.###")

  static readonly STOCK_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }); // DecimalFormat("0.00")


  protected fgColor?: string;
  protected bgColor?: string;

  protected referRow = 0
  protected mouseRow = 0
  protected referTime = 0
  protected mouseTime = 0
  protected x = 0.0

  constructor(ycontrol: ChartYControl) {
    super(ycontrol);
    this._xcontrol = ycontrol.view.xcontrol;
  }

  protected cursorPath: Path;

  kind: CursorChart.Kind = CursorChart.Kind.Mouse

  protected plotChart() {
    const theme = Theme.now()

    const referRow = this._xcontrol.referCursorRow
    const referTime = this._xcontrol.referCursorTime
    const mouseRow = this._xcontrol.mouseCursorRow
    const mouseTime = this._xcontrol.mouseCursorTime

    switch (this.kind) {
      case CursorChart.Kind.Refer:
        this.fgColor = theme.referCursorColor
        this.bgColor = theme.referCursorColor

        this.cursorPath = new Path(this.fgColor);

        this.x = this.xb(this.br(referRow))

        this.plotReferCursor()

        break;
      case CursorChart.Kind.Mouse:
        if (!this._ycontrol.view.xcontrol.isMouseEnteredAnyChartPane) {
          return;
        }

        this.fgColor = theme.mouseCursorColor
        this.bgColor = "yellow"

        this.cursorPath = new Path(this.fgColor);

        this.x = this.xb(this.br(mouseRow))

        this.plotMouseCursor();
    }
  }


  protected plotReferCursor() {
    const h = this._ycontrol.view.height
    const w = this._ycontrol.view.width

    /** plot cross' vertical line */
    if (this._xcontrol.isCursorCrossVisible) {
      this.cursorPath.moveto(this.x, 0)
      this.cursorPath.lineto(this.x, h)
    }

    if (this._ycontrol.view.isQuote) {
      const quoteSer = this._xcontrol.baseSer
      const time = this._ycontrol.tr(this.referRow);
      if (quoteSer.exists(time)) {
        const y = this._ycontrol.isAutoReferCursorValue ? this.yv(quoteSer.close(time)) : this.yv(this._ycontrol.referCursorValue)

        /** plot cross' horizonal line */
        if (this._xcontrol.isCursorCrossVisible) {
          this.cursorPath.moveto(0, y)
          this.cursorPath.lineto(w, y)
        }
      }
    }

  }


  protected plotMouseCursor() {
    const h = this._ycontrol.view.height
    const w = this._ycontrol.view.width

    /** plot vertical line */
    if (this._xcontrol.isCursorCrossVisible) {
      this.cursorPath.moveto(x, 0)
      this.cursorPath.lineto(x, h)
    }

    let y = 0.0
    if (this._ycontrol.view.isQuote) {
      const quoteSer = x.quoteSer

      cal.setTimeInMillis(this.mouseTime)
      const time = quoteSer.timeOfRow(this.mouseRow)
      const vMouse = quoteSer.exists(time) ? quoteSer.close(time) : 0;

      if (this._ycontrol.isMouseEntered) {
        y = this._ycontrol.yMouse
      } else {
        y = quoteSer.exists(time) ? this._ycontrol.yv(quoteSer.close(time)) : 0
      }


      /** plot horizonal line */
      if (this._ycontrol.view.xcontrol.isCursorCrossVisible) {
        this.cursorPath.moveto(0, y)
        this.cursorPath.lineto(w, y)
      }

      const vDisplay = this._ycontrol.vy(y)

      let str: string;
      if (this._ycontrol.isAutoReferCursorValue) { // normal QuoteChartView
        const time = quoteSer.timeOfRow(this.referRow)
        const vRefer = quoteSer.exists(time) ? quoteSer.close(time) : 0;

        const period = this.br(this.mouseRow) - this.br(this.referRow)
        const percent = vRefer === 0 ? 0.0 : 100 * (this.vy(y) - vRefer) / vRefer

        let amountSum = 0.0
        const rowBeg = Math.min(this.referRow, this.mouseRow)
        const rowEnd = Math.max(this.referRow, this.mouseRow)
        let i = rowBeg
        while (i <= rowEnd) {
          const time = quoteSer.timeOfRow(i)
          if (quoteSer.exists(time)) {
            amountSum += quoteSer.amount(time)
          }
          i++;
        }

        str = "P: " + period + "  %" + append("%+3.2f".format(percent)).append("%").append("  A: ").append("%5.0f".format(amountSum)).toString
      } else { // else, usually RealtimeQuoteChartView
        const vRefer = this._ycontrol.referCursorValue
        const percent = vRefer == 0 ? 0.0 : 100 * (this._ycontrol.vy(y) - vRefer) / vRefer

        str = CursorChart.MONEY_DECIMAL_FORMAT.format(vDisplay) + "  " + ("%+3.2f".format(percent)).append("%").toString
      }

      const label = addChild(new Label)
      label.setForeground(Theme.now().nameColor)
      label.setFont(Theme.now().axisFont)

      const fm = getFontMetrics(label.getFont)
      label.model.set(w - fm.stringWidth(str) - (BUTTON_SIZE + 1), ChartView.TITLE_HEIGHT_PER_LINE - 2, str)
      label.plot

    } else { // indicator view
      if (this._ycontrol.isMouseEntered) {
        y = this._ycontrol.yMouse

        /** plot horizonal line */
        if (this._xcontrol.isCursorCrossVisible) {
          this.cursorPath.moveto(0, y)
          this.cursorPath.lineto(w, y)
        }
      }
    }

  }

  /** CursorChart always returns false */
  isSelected = false;

}

export namespace CursorChart {
  export enum Kind {
    Refer,
    Mouse
  }
}

