import { Theme } from "../theme/Theme";
import { ChartView } from "../view/ChartView";
import { AbstractDatumPlane } from "./AbstractDatumPlane";

export class ChartPane extends AbstractDatumPlane {
  #chartValid = false;

  constructor(view: ChartView) {
    super(view);
    this.width = view.width - ChartView.AXISY_WIDTH;
    this.height = view.height;
  }


  //setOpaque(false);
  //setRenderStrategy(RenderStrategy.NoneBuffer)

  //val mouseAdapter = new MyMouseAdapter
  //addMouseListener(mouseAdapter)
  //addMouseMotionListener(mouseAdapter)

  //   val myComponentListener = new ComponentListener {
  //     def componentHidden(e: ComponentEvent) {
  //       for (chart <- charts) {
  //         chart.reset
  //       }
  //       _chartValid = false
  //     }

  //     def componentMoved(e: ComponentEvent) {
  //     }

  //     def componentResized(e: ComponentEvent) {
  //       _chartValid = false
  //     }

  //     def componentShown(e: ComponentEvent) {
  //     }
  //   }
  //   addComponentListener(myComponentListener)

  //   view.control.addObserver(this, new ChartValidityObserver {
  //       val updater: Updater = {
  //         case _: ChartControl =>
  //           _chartValid = false
  //           isGeometryValid = false
  //       }
  //     })

  //   view.addObserver(this, new ChartValidityObserver {
  //       val updater: Updater = {
  //         case _: ChartView =>
  //           _chartValid = false
  //           isGeometryValid = false
  //       }
  //     })

  protected isChartValid(): boolean {
    return this.#chartValid && this.isGeometryValid
  }

  protected plotPane() {
  }


  //   override protected def finalize {
  //     view.control.removeObserversOf(this)
  //     view.removeObserversOf(this)

  //     AWTUtil.removeAllAWTListenersOf(this)

  //     super.finalize
  //   }

  //   class MyMouseAdapter extends MouseAdapter with MouseMotionListener {

  //     var oldBMouse = -Integer.MAX_VALUE
  //     var oldYMouse = -Integer.MAX_VALUE

  //     override def mousePressed(e: MouseEvent) {
  //       if (e.isPopupTrigger) return // isPopupTrigger is the event of mousePressed and mouseReleased instead of mouseClicked

  //       if (!view.isInteractive) {
  //         /**
  //          * we don't want the click changes the refer cursor position and
  //          * selects a chart etc.
  //          */
  //         return
  //       }

  //       if (view.isInstanceOf[WithDrawingPane]) {
  //         val drawing = view.asInstanceOf[WithDrawingPane].selectedDrawing
  //         if (drawing != null && drawing.isInDrawing) {
  //           return
  //         }
  //       }

  //       if (e.isControlDown) {
  //         if (!(view.getParent.isInstanceOf[ChartViewContainer])) {
  //           return
  //         }
  //         val viewContainer = view.getParent.asInstanceOf[ChartViewContainer]
  //         val selectedChart = viewContainer.selectedChart
  //         val theChart = chartAt(e.getX, e.getY)
  //         if (theChart != null) {
  //           if (theChart == selectedChart) {
  //             /** deselect it */
  //             viewContainer.selectedChart = null
  //           } else {
  //             viewContainer.selectedChart = theChart
  //           }
  //         } else {
  //           viewContainer.selectedChart = null
  //         }
  //       } else {
  //         /** set refer cursor */
  //         val y = e.getY
  //         val b = bx(e.getX)
  //         if (y >= view.TITLE_HEIGHT_PER_LINE && y <= getHeight - (if (view.xControlPane == null) 0 else view.CONTROL_HEIGHT) &&
  //             b >= 1 && b <= nBars) {
  //           val position = rb(b)
  //           view.control.setReferCursorByRow(position, true)
  //         }
  //       }
  //     }

  //     override def mouseMoved(e: MouseEvent) {
  //       val y = e.getY

  //       if (y >= view.TITLE_HEIGHT_PER_LINE && y <= getHeight - (if (view.xControlPane == null) 0 else view.CONTROL_HEIGHT)) {
  //         _isMouseEntered = true
  //         view.control.isMouseEnteredAnyChartPane = true
  //       } else {
  //         _isMouseEntered = false
  //         view.control.isMouseEnteredAnyChartPane = false
  //       }

  //       val b = bx(e.getX)

  //       /** mouse position really changed? */
  //       if (oldBMouse == b && oldYMouse == y) {
  //         return
  //       }

  //       if (b >= 1 && b <= nBars) {
  //         yMouse = y
  //         val row = rb(b)
  //         view.control.setMouseCursorByRow(row)
  //       }

  //       oldBMouse = b
  //       oldYMouse = y
  //     }

  //     override def mouseEntered(e: MouseEvent) {
  //       _isMouseEntered = true
  //       view.control.isMouseEnteredAnyChartPane = true
  //     }

  //     override def mouseExited(e: MouseEvent) {
  //       _isMouseEntered = false
  //       view.control.isMouseEnteredAnyChartPane = false
  //     }

  //     override def mouseDragged(e: MouseEvent) {
  //       mouseMoved(e)
  //       //view.getControl.setMouseEnteredAnyChartPane(false);
  //     }
  //   }

}