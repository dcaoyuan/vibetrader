import type { BaseTSer } from "../../timeseris/BaseTSer"
import { ChartView } from "./ChartView"
import { ChartViewContainer } from "./ChartViewContainer"
import type { ClassOfChartViewContainer } from "./ChartViewContainer"

/**
 * Each BaseTSer can have more than one ChartControl instances.
 *
 * A ChartControl instance keeps the 1-1 relation with:
 *   the BaseTSer,
 *   the Descriptor, and
 *   a ChartViewContainer
 * Thus, ChartControl couples BaseTSer-Descriptor-ChartViewContainer
 * together from outside.
 *
 * A ChartView's container can be any Component even without a ChartViewContainer,
 * but should reference back to a control. All ChartViews shares the same
 * control will have the same cursor behaves.
 *
 */
interface IChartControl /* extends ChangeSubject*/ {

  //serProvider: SerProvider
  baseSer: BaseTSer

  isCursorCrossVisible: boolean

  isMouseEnteredAnyChartPane: boolean

  wBar(): number

  growWBar(increment: number): void

  isFixedNBars(): boolean
  fixedNBars?: number

  isFixedLeftSideTime(): boolean
  fixedLeftSideTime: number

  // setWBarByNBars(nBars: number): void
  setWBarByNBars(wViewPort: number, nBars: number): void

  isOnCalendarMode: boolean

  setCursorByRow(referRow: number, rightRow: number, willUpdateViews: boolean): void

  setReferCursorByRow(Row: number, willUpdateViews: boolean): void

  scrollReferCursor(increment: number, willUpdateViews: boolean): void

  /** keep refer cursor stay on same x of screen, and scroll charts left or right by bar */
  scrollChartsHorizontallyByBar(increment: number): void

  scrollReferCursorToLeftSide(): void
  setLeftSideRowByTime(time: number, willUpdateViews: boolean): void

  setMouseCursorByRow(row: number): void

  isAutoScrollToNewData: boolean

  updateViews(): void

  //popupViewToDesktop(view: ChartView, dimension: DOMRect, alwaysOnTop: boolean, joint: boolean): void

  /**
   * ======================================================
   * Bellow is the methods for cursor etc:
   */
  referCursorRow: number
  rightSideRow: number
  mouseCursorRow: number

  leftSideRow(): number

  referCursorTime(): number
  rightSideTime(): number
  leftSideTime(): number
  mouseCursorTime(): number

  isCursorAccelerated: boolean

  /**
   * Factory method to create ChartViewContainer instance
   */
  createChartViewContainer(clazz: ClassOfChartViewContainer, focusableParent: any): ChartViewContainer
}


/**
 * ChartControl that implements IChartControl
 *
 * ChangeSubject cases for ChartValidityObserver:
 *   rightSideRow
 *   referCursorRow
 *   wBar
 *   onCalendarMode
 * ChangeSubject cases for MouseCursorObserver:
 *   mosueCursor
 *   mouseEnteredAnyChartPane
 */
export class ChartControl implements IChartControl {
  /**
   * min spacing in number of bars between referRow and left / right edge, if want more, such as:
   *     minSpacing = (nBars * 0.168).intValue
   * set REF_PADDING_RIGHT=1 to avoid hidden last day's bar sometimes. @Todo
   */
  static readonly REF_PADDING_RIGHT = 1
  static readonly REF_PADDING_LEFT = 1

  /** BASIC_BAR_WIDTH = 6 */
  static readonly PREDEFINED_BAR_WIDTHS = [
    0.00025, 0.0005, 0.001, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 6, 8, 10, 20
  ]

  static isCursorAccelerated = false

  readonly baseSer: BaseTSer;

  constructor(baseSer: BaseTSer) {
    this.baseSer = baseSer;
  }

  referCursorRow = 0;
  mouseCursorRow = 0;
  rightSideRow = 0;

  fixedNBars?: number;

  isCursorAccelerated = false;

  private readonly popupViewRefs = new Map<ChartView, any>();
  private popupViews() { return this.popupViewRefs.keys() };
  private viewContainer?: ChartViewContainer;
  private _fixedLeftSideTime?: number;
  private _wBarIdx = 11;
  /** pixels per bar (bar width in pixels) */
  private _wBar = ChartControl.PREDEFINED_BAR_WIDTHS[this._wBarIdx]
  private _lastOccurredRowOfBaseSer = 0;
  private _isAutoScrollToNewData = true;
  private _isMouseEnteredAnyChartPane = false;
  isCursorCrossVisible = true;

  /**
   * Factory method to create ChartViewContainer instance, got the relations
   * between ChartViewContainer and Control ready.
   */
  createChartViewContainer(clazz: ClassOfChartViewContainer, focusableParent: any): ChartViewContainer | undefined {
    try {
      const instance = new clazz(focusableParent);
      //instance.init(focusableParent, this)

      /**
       * @Note
       * Always call internal_setChartViewContainer(instance) next to
       * instance.init(focusableParent, this), since the internal_initCursorRow()
       * procedure needs the children of chartViewContainer ready.
       */
      this.internal_setChartViewContainer(instance)
      return instance;
    } catch (ex) {
      return undefined;
    }
  }

  setViewContainer(viewContainer: ChartViewContainer) {
    this.internal_setChartViewContainer(viewContainer);
  }

  private internal_setChartViewContainer(viewContainer: ChartViewContainer) {
    this.viewContainer = viewContainer

    this.internal_initCursorRow()

    // reactions += {
    //   /** this reaction only process loading, update events to check if need to update cursor */
    //   case TSerEvent.Loaded(_, _, fromTime, toTime, _, _) => updateView(toTime)
    //     case TSerEvent.Refresh(_, _, fromTime, toTime, _, _) => updateView(toTime)
    //     case TSerEvent.Updated(_, _, fromTime, toTime, _, _) => updateView(toTime)
    //     case _ =>
    //   }

    // listenTo(baseSer)

    // addKeyMouseListenersTo(viewContainer)
  }

  private internal_initCursorRow() {
    /**
     * baseSer may have finished computing at this time, to adjust
     * the cursor to proper row, update it here.
     * @NOTICE
     * don't set row directly, instead, use setCursorByRow(row, row);
     */
    const row = this.baseSer.lastOccurredRow();
    this.setCursorByRow(row, row, true)

    this.mouseCursorRow = this.referCursorRow;
  }

  // private addKeyMouseListenersTo(component: JComponent) {
  //   component.setFocusable(true)
  //   component.addKeyListener(new ChartViewKeyAdapter)
  //   component.addMouseWheelListener(new ChartViewMouseWheelListener)
  // }

  // private removeKeyMouseListenersFrom(component: JComponent) {
  //   /** copy to a list to avoid concurrent issue */
  //   component.getKeyListeners.forEach(x => component.removeKeyListener(x))
  //   component.getMouseWheelListeners.forEach(x => component.removeMouseWheelListener(x))
  // }

  get isMouseEnteredAnyChartPane() {
    return this._isMouseEnteredAnyChartPane;
  }
  set isMouseEnteredAnyChartPane(b: boolean) {
    const oldValue = this._isMouseEnteredAnyChartPane
    this._isMouseEnteredAnyChartPane = b

    if (!this._isMouseEnteredAnyChartPane) {
      /** this cleanups mouse cursor */
      if (this._isMouseEnteredAnyChartPane != oldValue) {
        //this.notifyChanged(classOf<MouseCursorObserver>);
        this.updateViews()
      }
    }
  }

  get isAutoScrollToNewData() {
    return this._isAutoScrollToNewData
  }
  set isAutoScrollToNewData(autoScrollToNewData: boolean) {
    this._isAutoScrollToNewData = autoScrollToNewData
  }

  isFixedLeftSideTime() {
    return this._fixedLeftSideTime !== undefined;
  }
  get fixedLeftSideTime() {
    return this._fixedLeftSideTime
  }
  set fixedLeftSideTime(time: number) {
    this._fixedLeftSideTime = time;
  }

  isFixedNBars() {
    return this.fixedNBars !== undefined;
  }

  growWBar(increment: number) {
    if (this.isFixedNBars()) {
      return
    }

    this._wBarIdx += increment
    if (this._wBarIdx < 0) {
      this._wBarIdx = 0
    } else if (this._wBarIdx > ChartControl.PREDEFINED_BAR_WIDTHS.length - 1) {
      this._wBarIdx = ChartControl.PREDEFINED_BAR_WIDTHS.length - 1
    }

    this.internal_setWBar(ChartControl.PREDEFINED_BAR_WIDTHS[this._wBarIdx]);
    this.updateViews();
  }

  wBar(): number {
    return this.isFixedNBars() ?
      this.viewContainer.masterView.wChart() * 1.0 / this.fixedNBars :
      this._wBar;
  }

  // setWBarByNBars(nBars: number) {
  //   if (nBars < 0 || this.fixedNBars != - 0) return

  //   /** decide wBar according to wViewPort. Do not use integer divide here */
  //   const masterView = viewContainer.masterView
  //   let newWBar = masterView.wChart * 1.0 / nBars;

  //   this.internal_setWBar(newWBar);
  //   this.updateViews();
  // }

  setWBarByNBars(wViewPort: number, nBars: number) {
    if (nBars < 0 || this.fixedNBars != 0) return

    /** decide wBar according to wViewPort. Do not use integer divide here */
    let newWBar = wViewPort * 1.0 / nBars * 1.0;

    /** adjust xfactorIdx to nearest */
    if (newWBar < ChartControl.PREDEFINED_BAR_WIDTHS[0]) {
      /** avoid too small xfactor */
      newWBar = ChartControl.PREDEFINED_BAR_WIDTHS[0]

      this._wBarIdx = 0

    } else if (newWBar > ChartControl.PREDEFINED_BAR_WIDTHS[ChartControl.PREDEFINED_BAR_WIDTHS.length - 1]) {
      this._wBarIdx = ChartControl.PREDEFINED_BAR_WIDTHS.length - 1

    } else {
      let i = 0
      const n = ChartControl.PREDEFINED_BAR_WIDTHS.length - 1;
      let breakNow = false
      while (i < n && !breakNow) {
        if (newWBar > ChartControl.PREDEFINED_BAR_WIDTHS[i] && newWBar < ChartControl.PREDEFINED_BAR_WIDTHS[i + 1]) {
          /** which one is the nearest ? */
          this._wBarIdx = Math.abs(ChartControl.PREDEFINED_BAR_WIDTHS[i] - newWBar) < Math.abs(ChartControl.PREDEFINED_BAR_WIDTHS[i + 1] - newWBar) ? i : i + 1
          breakNow = true;
        }
        i++;
      }
    }

    this.internal_setWBar(newWBar)
    this.updateViews()
  }

  get isOnCalendarMode() {
    return this.baseSer.isOnCalendarMode
  }
  set isOnCalendarMode(b: boolean) {
    if (this.isOnCalendarMode !== b) {
      const referCursorTime1 = this.referCursorTime()
      const rightCursorTime1 = this.rightSideTime()

      if (b == true) {
        this.baseSer.toOnCalendarMode()
      } else {
        this.baseSer.toOnOccurredMode()
      }

      this.internal_setReferCursorByTime(referCursorTime1);
      this.internal_setRightCursorByTime(rightCursorTime1);

      // this.notifyChanged(classOf<ChartValidityObserver>)
      this.updateViews()
    }
  }

  setCursorByRow(referRow: number, rightRow: number, willUpdateViews: boolean) {
    /** set right cursor row first and directly */
    this.internal_setRightSideRow(rightRow, willUpdateViews)

    const oldValue = this.referCursorRow
    this.scrollReferCursor(referRow - oldValue, willUpdateViews)
  }

  setReferCursorByRow(row: number, willUpdateViews: boolean) {
    const increment = row - this.referCursorRow
    this.scrollReferCursor(increment, willUpdateViews)
  }

  scrollReferCursor(increment: number, willUpdateViews: boolean) {
    const referRow = this.referCursorRow + increment
    const rightRow = this.rightSideRow

    // if refCursor is near left/right side, check if need to scroll chart except referCursur
    const rightPadding = rightRow - referRow
    if (rightPadding < ChartControl.REF_PADDING_RIGHT) {
      this.internal_setRightSideRow(rightRow + ChartControl.REF_PADDING_RIGHT - rightPadding, willUpdateViews)
    } else {
      /** right spacing is enough, check left spacing: */
      const leftRow = rightRow - this.nBars() + 1
      const leftPadding = referRow - leftRow
      if (leftPadding < ChartControl.REF_PADDING_LEFT) {
        this.internal_setRightSideRow(rightRow + leftPadding - ChartControl.REF_PADDING_LEFT, willUpdateViews)
      }
    }

    this.internal_setReferCursorRow(referRow, willUpdateViews)
    if (willUpdateViews) {
      this.updateViews()
    }
  }

  /** keep refer cursor stay on same x of screen, and scroll charts left or right by bar */
  scrollChartsHorizontallyByBar(increment: number) {
    const rightRow = this.rightSideRow;
    this.internal_setRightSideRow(rightRow + increment)

    this.scrollReferCursor(increment, true)
  }

  scrollReferCursorToLeftSide() {
    const rightRow = this.rightSideRow;
    const leftRow = rightRow - this.nBars() + ChartControl.REF_PADDING_LEFT
    this.setReferCursorByRow(leftRow, true)
  }

  setMouseCursorByRow(row: number) {
    this.internal_setMouseCursorRow(row)
  }

  updateViews() {
    if (this.viewContainer !== undefined) {
      //this.viewContainer.repaint()
    }

    /**
     * as repaint() may be called by awt in instance's initialization, before
     * popupViewSet is created, so, check null.
     */
    //this.popupViews().forEach(x => x.repaint())
  }

  referCursorTime() {
    return this.baseSer.timeOfRow(this.referCursorRow);
  }

  rightSideTime(): number {
    return this.baseSer.timeOfRow(this.rightSideRow);
  }

  leftSideTime() {
    return this.baseSer.timeOfRow(this.leftSideRow());
  }

  mouseCursorTime() {
    return this.baseSer.timeOfRow(this.mouseCursorRow)
  }

  leftSideRow(): number {
    const rightRow = this.rightSideRow
    return rightRow - this.nBars() + ChartControl.REF_PADDING_LEFT
  }

  setLeftSideRowByTime(time: number, willUpdateViews: boolean = false) {
    const frRow = this.baseSer.rowOfTime(time);
    const toRow = frRow + this.nBars() - 1;

    const lastOccurredRow = this.baseSer.lastOccurredRow()
    this.setCursorByRow(lastOccurredRow, toRow, willUpdateViews)
  }

  private nBars(): number {
    return this.viewContainer.masterView.nBars;
  }

  /**
   * @NOTICE
   * =======================================================================
   * as we don't like referCursor and rightCursor being set directly by others,
   * the following setter methods are named internal_setXXX, and are private.
   */
  private internal_setWBar(wBar: number) {
    const oldValue = this._wBar
    this._wBar = wBar
    if (this._wBar != oldValue) {
      //notifyChanged(classOf<ChartValidityObserver>)
    }
  }

  private internal_setReferCursorRow(row: number, notify: boolean = true) {
    const oldValue = this.referCursorRow
    this.referCursorRow = row
    /** remember the lastRow for decision if need update cursor, see changeCursorByRow() */
    this._lastOccurredRowOfBaseSer = this.baseSer.lastOccurredRow()
    if (this.referCursorRow !== oldValue && notify) {
      //this.notifyChanged(classOf<ReferCursorObserver>)
      //this.notifyChanged(classOf<ChartValidityObserver>)
    }
  }

  private internal_setRightSideRow(row: number, notify: boolean = true) {
    const oldValue = this.rightSideRow
    this.rightSideRow = row
    if (this.rightSideRow !== oldValue && notify) {
      //this.notifyChanged(classOf<ChartValidityObserver>)
    }
  }

  private internal_setReferCursorByTime(time: number, notify: boolean = true) {
    this.internal_setReferCursorRow(this.baseSer.rowOfTime(time), notify)
  }

  private internal_setRightCursorByTime(time: number) {
    this.internal_setRightSideRow(this.baseSer.rowOfTime(time))
  }

  private internal_setMouseCursorRow(row: number) {
    const oldValue = this.mouseCursorRow;
    this.mouseCursorRow = row;

    /**
     * even mouseCursor row not changed, the mouse's y may has been changed,
     * so, notify observers without comparing the oldValue and newValue.
     */
    //this.notifyChanged(classOf<MouseCursorObserver>)
  }

  // popupViewToDesktop(view: ChartView, dim: DOMRect, alwaysOnTop: boolean, joint: boolean) {
  //   const popupView = view;

  //   this.popupViewRefs.set(popupView, undefined)
  //   // addKeyMouseListenersTo(popupView)

  //   const w = dim.width
  //   const h = dim.height
  //   const frame = new JFrame//new JDialog (), true);
  //   frame.setAlwaysOnTop(alwaysOnTop)
  //   frame.setTitle(popupView.mainSer.shortName)
  //   frame.add(popupView, BorderLayout.CENTER)
  //   const screenSize = Toolkit.getDefaultToolkit.getScreenSize
  //   frame.setBounds((screenSize.width - w) / 2, (screenSize.height - h) / 2, w, h)
  //   frame.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE)
  //   frame.addWindowListener(new WindowAdapter {
  //     windowClosed(e: WindowEvent) {
  //       removeKeyMouseListenersFrom(popupView)
  //       popupViewRefs.remove(popupView)
  //     }
  //   })

  //   frame.setVisible(true)
  // }

  protected finalize() {
    //deafTo(baseSer)

    //super.finalize
  }

  private updateView(toTime: number) {
    // switch (this.viewContainer.masterView) {
    //   case view: WithDrawingPane:
    //     const drawing = view.selectedDrawing
    //     if (drawing != null && drawing.isInDrawing) {
    //       return
    //     }
    //     break;
    //   default:
    // }

    const oldReferRow = this.referCursorRow;
    if (oldReferRow === this._lastOccurredRowOfBaseSer || this._lastOccurredRowOfBaseSer <= 0) {
      /** refresh only when the old lastRow is extratly oldReferRow, or prev lastRow <= 0 */
      const lastTime = Math.max(toTime, this.baseSer.lastOccurredTime());
      const referRow = this.baseSer.rowOfTime(lastTime);
      const rightRow = this.isFixedLeftSideTime() ? this.rightSideRow : referRow;

      this.setCursorByRow(referRow, rightRow, true)
    }

    //this.notifyChanged(classOf<ChartValidityObserver>)
  }

  internal_getCorrespondingChartView(e: UIEvent): ChartView | undefined {
    return e.target as any as ChartView;
    // switch (e.target) {
    //   case source: ChartViewContainer:
    //     return source.masterView;
    //   case source: ChartView:
    //     return source;
    //   default:
    //     return undefined;
    // }
  }
}


/**
 * =============================================================
 * Bellow are the private listener classes for key and mouse:
 */
class ChartViewKeyAdapter /* extends KeyAdapter */ {
  private static readonly LEFT = -1
  private static readonly RIGHT = 1

  outer: ChartControl;

  constructor(outer: ChartControl) {
    this.outer = outer;
  }

  keyPressed(e: KeyboardEvent) {
    const view = this.outer.internal_getCorrespondingChartView(e)
    if (view == null || !view.isInteractive) {
      return
    }

    const fastSteps = Math.floor(view.nBars * 0.168)

    switch (e.key) {
      case "ArrowLeft":
        if (e.ctrlKey) {
          this.moveCursorInDirection(fastSteps, ChartViewKeyAdapter.LEFT)
        } else {
          this.moveChartsInDirection(fastSteps, ChartViewKeyAdapter.LEFT)
        }
        break;

      case "ArrowRight":
        if (e.ctrlKey) {
          this.moveCursorInDirection(fastSteps, ChartViewKeyAdapter.RIGHT)
        } else {
          this.moveChartsInDirection(fastSteps, ChartViewKeyAdapter.RIGHT)
        }
        break;

      case "ArrowUp":
        if (!e.ctrlKey) {
          this.outer.growWBar(1)
        }
        break;

      case "ArrowDown":
        if (!e.ctrlKey) {
          this.outer.growWBar(-1);
        }
        break;

      default:
    }

  }

  keyReleased(e: KeyboardEvent) {
    if (e.key === " ") {
      this.outer.isCursorAccelerated = !this.outer.isCursorAccelerated
    }
  }

  keyTyped(e: KeyboardEvent) { }

  private moveCursorInDirection(fastSteps: number, DIRECTION: number) {
    const steps = (this.outer.isCursorAccelerated ? fastSteps : 1) * DIRECTION

    this.outer.scrollReferCursor(steps, true)
  }

  private moveChartsInDirection(fastSteps: number, DIRECTION: number) {
    const steps = (this.outer.isCursorAccelerated ? fastSteps : 1) * DIRECTION

    this.outer.scrollChartsHorizontallyByBar(steps)
  }
}

class ChartViewMouseWheelListener /* extends MouseWheelListener */ {
  outer: ChartControl;

  constructor(outer: ChartControl) {
    this.outer = outer;
  }

  mouseWheelMoved(e: WheelEvent) {
    const view = this.outer.internal_getCorrespondingChartView(e)
    if (view === undefined || !view.isInteractive) {
      return
    }

    const fastSteps = Math.floor(view.nBars * 0.168)
    const delta = e.deltaX;

    if (e.shiftKey) {
      /** zoom in / zoom out */
      this.outer.growWBar(delta)
    } else if (e.ctrlKey) {
      if (!view.isInteractive) {
        return
      }

      const unitsToScroll = this.outer.isCursorAccelerated ? delta * fastSteps : delta;
      /** move refer cursor left / right */
      this.outer.scrollReferCursor(unitsToScroll, true)
    } else {
      if (!view.isInteractive) {
        return
      }

      const unitsToScroll = this.outer.isCursorAccelerated ? delta * fastSteps : delta;
      /** keep referCursor stay same x in screen, and move */
      this.outer.scrollChartsHorizontallyByBar(unitsToScroll)
    }
  }
}


