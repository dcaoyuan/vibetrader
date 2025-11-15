import { Theme } from "../theme/Theme";
import { AbstractChart } from "./AbstractChart"
import { PathData } from "../../svg/Path";

export abstract class CursorChart extends AbstractChart {
  static readonly MONEY_DECIMAL_FORMAT = new DecimalFormat("0.###")
  static readonly STOCK_DECIMAL_FORMAT = new DecimalFormat("0.00")


  protected laf?: Theme;
  protected fgColor?: string;
  protected bgColor?: string;

  protected referRow = 0
  protected mouseRow = 0
  protected referTime = 0
  protected mouseTime = 0
  protected x = 0.0

  protected cursorPath: PathData[] = []

  tpe: CursorChart.Type = CursorChart.Type.Mouse

  protected abstract createModel(): ShapeModel {
    null.asInstanceOf[WidgetModel]
  }

  protected plotChart() {
    const theme = Theme.now()

    const referRow = this._datumPlane.view.control.referCursorRow
    const referTime = this._datumPlane.view.control.referCursorTime
    const mouseRow = this._datumPlane.view.control.mouseCursorRow
    const mouseTime = this._datumPlane.view.control.mouseCursorTime

    const pathWidget = addChild(new PathWidget)
    switch (tpe) {
      case Type.Refer:
        fgColor = theme.referCursorColor
        bgColor = theme.referCursorColor
        pathWidget.setForeground(fgColor)

        cursorPath = pathWidget.getPath

        x = xb(br(referRow))

        this.plotReferCursor()

        break;
      case Type.Mouse:
        if (!this._datumPlane.view.control.isMouseEnteredAnyChartPane) {
          return;
        }

        this.fgColor = theme.mouseCursorColor
        this.bgColor = "yellow"
        pathWidget.setForeground(fgColor)

        cursorPath = pathWidget.getPath

        this.x = this.xb(this.br(mouseRow))

        this.plotMouseCursor();

    }
  }

  protected abstract plotReferCursor(): void

  protected abstract plotMouseCursor(): void

  /** CursorChart always returns false */
  isSelected(): boolean {
    return false
  }

}

export namespace CursorChart {
  export enum Kind {
    Refer,
    Mouse
  }
}

