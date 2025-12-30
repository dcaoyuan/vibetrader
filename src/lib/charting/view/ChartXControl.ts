import type { TSer } from "../../timeseris/TSer"
import type { KlineKind } from "../plot/KlineChart"

/**
 * Each TSer can have more than one ChartXControl instances.
 *
 * A ChartXControl instance keeps the 1-1 relation with:
 *   the TSer,
 *   the ChartViewContainer
 *
 * All ChartViews in the same view container share the same x-control.
 *
 * baseSer: the ser instaceof TSer, with the calendar time feature.
 *
 */
export class ChartXControl {
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

    readonly baseSer: TSer;

    #wBarIdx = 11;
    /** pixels per bar (bar width in pixels) */
    wBar = ChartXControl.PREDEFINED_BAR_WIDTHS[this.#wBarIdx]

    nBars = 0;
    nBarsCompressed = 0;

    wChart: number;

    constructor(baseSer: TSer, wChart: number) {
        this.baseSer = baseSer;
        this.wChart = wChart;

        this.#internal_initCursorRow()
    }

    reinit() {
        this.#internal_initCursorRow()
    }

    rightSideRow = 0;

    referCursorRow = 0;

    mouseCursorRow = 0;

    isReferCursorEnabled = false
    isMouseCursorEnabled = false

    isCrosshairEnabled = false;

    isCursorAccelerated = false;

    fixedNBars?: number;
    fixedLeftSideTime?: number;

    // share across view and view container
    selectedDrawingIdx: number;
    mouseMoveHitDrawingIdx: number;
    mouseDownHitDrawingIdx: number;

    #lastOccurredRowOfBaseSer = 0;
    #isAutoScrollToNewData = true;
    #isMouseEnteredAnyChartPane = false;

    isCursorCrossVisible = true;

    klineKind: KlineKind = 'candle'

    #updateGeometry() {
        /**
         * !NOTE
         * 1.Should get wBar firstly, then calculator nBars
         * 2.Get this view's width to compute nBars instead of mainChartPane's
         * width, because other panes may be repainted before mainChartPane is
         * properly layouted (the width of mainChartPane is still not good)
         */
        this.wBar = this.isFixedNBars() ?
            this.wChart * 1.0 / this.fixedNBars :
            ChartXControl.PREDEFINED_BAR_WIDTHS[this.#wBarIdx]

        const nBars1 = this.isFixedNBars() ?
            this.fixedNBars :
            Math.floor(this.wChart / this.wBar)

        /** avoid nBars == 0 */
        this.nBars = Math.max(nBars1, 1)

        this.nBarsCompressed = this.wBar >= 1 ? 1 : Math.floor(1 / this.wBar)

        if (this.isFixedLeftSideTime()) {
            this.setLeftSideRowByTime(this.fixedLeftSideTime, false)
        }

        // console.log('ChartXControl updateGeometry:', {
        //   wBar: this.wBar,
        //   nBars: this.nBars,
        //   nBarsCompressed: this.nBarsCompressed,
        //   rightSideRow: this.rightSideRow,
        //   isFixedLeftSideTime: this.isFixedLeftSideTime()
        // })
    }

    occurred(time: number): boolean {
        return this.baseSer.occurred(time);
    }

    lastOccurredTime(): number {
        return this.baseSer.lastOccurredTime()
    }

    /**
     * barIndex -> x
     *
     * @param i index of bars, start from 1 to nBars
     * @return x
     */
    xb(barIndex: number): number {
        return this.wBar * (barIndex - 1);
    }

    xr(row: number): number {
        return this.xb(this.br(row));
    }

    /**
     * barIndex <- x
     *
     * @param x x on the pane
     * @return index of bars, start from 1 to nBars
     */
    bx(x: number): number {
        return Math.round(x / this.wBar + 1)
    }

    /**
     * time <- x
     */
    tx(x: number): number {
        return this.tb(this.bx(x));
    }

    /** row <- x */
    rx(x: number): number {
        return this.rb(this.bx(x))
    }

    rb(barIndex: number): number {
        /** when barIndex equals it's max: nBars, row should equals rightTimeRow */
        return this.rightSideRow - this.nBars + barIndex
    }

    br(row: number): number {
        return row - this.rightSideRow + this.nBars
    }

    /**
     * barIndex -> time
     *
     * @param barIndex, index of bars, start from 1 and to nBars
     * @return time
     */
    tb(barIndex: number): number {
        return this.baseSer.timeOfRow(this.rb(barIndex));
    }

    tr(row: number): number {
        return this.baseSer.timeOfRow(row);
    }

    rt(time: number): number {
        return this.baseSer.rowOfTime(time);
    }

    /**
     * time -> barIndex
     *
     * @param time
     * @return index of bars, start from 1 and to nBars
     */
    bt(time: number): number {
        return this.br(this.baseSer.rowOfTime(time))
    }

    #internal_initCursorRow() {
        /**
         * baseSer may have finished computing at this time, to adjust
         * the cursor to proper row, update it here.
         * NOTE
         * don't set row directly, instead, use setCursorByRow(row, row);
         */
        const row = this.baseSer.lastOccurredRow();
        this.setCursorByRow(row, row, true)
    }

    get isMouseEnteredAnyChartPane() {
        return this.#isMouseEnteredAnyChartPane;
    }
    set isMouseEnteredAnyChartPane(b: boolean) {
        const oldValue = this.#isMouseEnteredAnyChartPane
        this.#isMouseEnteredAnyChartPane = b

        if (!this.#isMouseEnteredAnyChartPane) {
            /** this cleanups mouse cursor */
            if (this.#isMouseEnteredAnyChartPane != oldValue) {
                //this.notifyChanged(classOf<MouseCursorObserver>);
                this.#updateGeometry();
            }
        }
    }

    get isAutoScrollToNewData() {
        return this.#isAutoScrollToNewData
    }
    set isAutoScrollToNewData(autoScrollToNewData: boolean) {
        this.#isAutoScrollToNewData = autoScrollToNewData
    }

    isFixedLeftSideTime() {
        return this.fixedLeftSideTime !== undefined;
    }

    isFixedNBars() {
        return this.fixedNBars !== undefined;
    }

    growWBar(increment: number) {
        if (this.isFixedNBars()) {
            return
        }

        this.#wBarIdx += Math.sign(increment)
        if (this.#wBarIdx < 0) {
            this.#wBarIdx = 0

        } else if (this.#wBarIdx > ChartXControl.PREDEFINED_BAR_WIDTHS.length - 1) {
            this.#wBarIdx = ChartXControl.PREDEFINED_BAR_WIDTHS.length - 1
        }

        console.log(this.#wBarIdx)
        this.#internal_setWBar(ChartXControl.PREDEFINED_BAR_WIDTHS[this.#wBarIdx]);

        this.#updateGeometry()
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
        if (newWBar < ChartXControl.PREDEFINED_BAR_WIDTHS[0]) {
            /** avoid too small xfactor */
            newWBar = ChartXControl.PREDEFINED_BAR_WIDTHS[0]

            this.#wBarIdx = 0

        } else if (newWBar > ChartXControl.PREDEFINED_BAR_WIDTHS[ChartXControl.PREDEFINED_BAR_WIDTHS.length - 1]) {
            this.#wBarIdx = ChartXControl.PREDEFINED_BAR_WIDTHS.length - 1

        } else {
            let i = 0
            const n = ChartXControl.PREDEFINED_BAR_WIDTHS.length - 1;
            while (i < n) {
                if (newWBar > ChartXControl.PREDEFINED_BAR_WIDTHS[i] && newWBar < ChartXControl.PREDEFINED_BAR_WIDTHS[i + 1]) {
                    /** which one is the nearest ? */
                    this.#wBarIdx = Math.abs(ChartXControl.PREDEFINED_BAR_WIDTHS[i] - newWBar) < Math.abs(ChartXControl.PREDEFINED_BAR_WIDTHS[i + 1] - newWBar) ? i : i + 1
                    break;
                }
                i++;
            }
        }

        this.#internal_setWBar(newWBar)

        this.#updateGeometry()
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

            this.#internal_setReferCursorByTime(referCursorTime1);
            this.#internal_setRightCursorByTime(rightCursorTime1);

            this.#updateGeometry();
        }
    }

    setCursorByRow(referRow: number, rightRow: number, willUpdateViews: boolean) {
        /** set right cursor row first and directly */
        this.#internal_setRightSideRow(rightRow, willUpdateViews)

        const oldValue = this.referCursorRow
        this.scrollReferCursor(referRow - oldValue, willUpdateViews)
    }

    setReferCursorByRow(row: number, willUpdateViews: boolean) {
        const increment = row - this.referCursorRow
        this.scrollReferCursor(increment, willUpdateViews)
    }

    setMouseCursorByRow(row: number) {
        this.mouseCursorRow = row
    }

    scrollReferCursor(increment: number, willUpdateViews: boolean) {
        const referRow = this.referCursorRow + increment
        const rightRow = this.rightSideRow

        // if refCursor is near left/right side, check if need to scroll chart except referCursur
        const rightPadding = rightRow - referRow
        if (rightPadding < ChartXControl.REF_PADDING_RIGHT) {
            this.#internal_setRightSideRow(rightRow + ChartXControl.REF_PADDING_RIGHT - rightPadding, willUpdateViews)

        } else {
            /** right spacing is enough, check left spacing: */
            const leftRow = rightRow - this.nBars + 1
            const leftPadding = referRow - leftRow
            if (leftPadding < ChartXControl.REF_PADDING_LEFT) {
                this.#internal_setRightSideRow(rightRow + leftPadding - ChartXControl.REF_PADDING_LEFT, willUpdateViews)
            }
        }

        this.#internal_setReferCursorRow(referRow, willUpdateViews)

        this.#updateGeometry();
    }

    /** keep refer cursor stay on same x of screen, and scroll charts left or right by bar */
    scrollChartsHorizontallyByBar(increment: number) {
        const rightRow = this.rightSideRow;
        this.#internal_setRightSideRow(rightRow + increment)

        this.scrollReferCursor(increment, true)
    }

    scrollReferCursorToLeftSide() {
        const rightRow = this.rightSideRow;
        const leftRow = rightRow - this.nBars + ChartXControl.REF_PADDING_LEFT
        this.setReferCursorByRow(leftRow, true)
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

    leftSideRow(): number {
        const rightRow = this.rightSideRow
        return rightRow - this.nBars + ChartXControl.REF_PADDING_LEFT
    }

    setLeftSideRowByTime(time: number, willUpdateViews: boolean = false) {
        const frRow = this.baseSer.rowOfTime(time);
        const toRow = frRow + this.nBars - 1;

        const lastOccurredRow = this.baseSer.lastOccurredRow()
        this.setCursorByRow(lastOccurredRow, toRow, willUpdateViews)
    }

    /**
     * @NOTICE
     * =======================================================================
     * as we don't like referCursor and rightCursor being set directly by others,
     * the following setter methods are named internal_setXXX, and are private.
     */
    #internal_setWBar(wBar: number) {
        const oldValue = this.wBar
        this.wBar = wBar
        if (this.wBar != oldValue) {
            //notifyChanged(classOf<ChartValidityObserver>)
        }
    }

    #internal_setReferCursorRow(row: number, boolean = true) {
        this.referCursorRow = row
        // remember the lastRow for decision if need update cursor, see changeCursorByRow() 
        this.#lastOccurredRowOfBaseSer = this.baseSer.lastOccurredRow()
    }

    #internal_setRightSideRow(row: number, notify: boolean = true) {
        this.rightSideRow = row
    }

    #internal_setReferCursorByTime(time: number, notify: boolean = true) {
        this.#internal_setReferCursorRow(this.baseSer.rowOfTime(time), notify)
    }

    #internal_setRightCursorByTime(time: number) {
        this.#internal_setRightSideRow(this.baseSer.rowOfTime(time))
    }

    // DIRECTION = -1: Left
    // DIRECTION = 1: Right 
    moveCursorInDirection(nBarsToMove: number, DIRECTION: number, isDragging?: boolean) {
        nBarsToMove = isDragging
            ? nBarsToMove
            : this.isCursorAccelerated ? Math.floor(this.nBars * 0.168) : 1

        this.scrollReferCursor(nBarsToMove * DIRECTION, true)
    }

    moveChartsInDirection(nBarsToMove: number, DIRECTION: number, isDragging?: boolean) {
        nBarsToMove = isDragging
            ? nBarsToMove
            : this.isCursorAccelerated ? Math.floor(this.nBars * 0.168) : 1

        this.scrollChartsHorizontallyByBar(nBarsToMove * DIRECTION)
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
        if (oldReferRow === this.#lastOccurredRowOfBaseSer || this.#lastOccurredRowOfBaseSer <= 0) {
            /** update only when the old lastRow is extratly oldReferRow, or prev lastRow <= 0 */
            const lastTime = Math.max(toTime, this.baseSer.lastOccurredTime());
            const referRow = this.baseSer.rowOfTime(lastTime);
            const rightRow = this.isFixedLeftSideTime() ? this.rightSideRow : referRow;

            this.setCursorByRow(referRow, rightRow, true)
        }

        //this.notifyChanged(classOf<ChartValidityObserver>)
    }

}




