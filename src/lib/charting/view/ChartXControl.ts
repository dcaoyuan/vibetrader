import { Temporal } from "temporal-polyfill"
import type { TSer } from "../../timeseris/TSer"
import type { KlineKind } from "../plot/PlotKline"
import { TUnit } from "../../timeseris/TUnit"
import { dev } from "../../../Env"


// --- xticks related code
type Tick = {
    dt: Temporal.ZonedDateTime,
    x: number,
    level: "year" | "month" | "weekOfYear" | "day" | "hour" | "minute"
}

const MIN_TICK_SPACING = 100 // in pixels

const LOCATOR_DICT: Record<string, number[][]> = {
    year: [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // Used with modulo 10
        [0, 2, 4, 6, 8],
        [0, 5],
    ],
    month: [
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Temporal months are 1-12
        [1, 3, 5, 7, 9, 11],
        [1, 4, 7, 10],
        [1, 7],
    ],
    weekOfYear: [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // Used with modulo 10
        [0, 2, 4, 6, 8],
        [0, 5],
    ],
    day: [
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31], // 1st of month is critical
        [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
        [1, 4, 8, 12, 16, 20, 24, 28],
        [1, 5, 10, 15, 20, 25],
        [1, 10, 20],
        [1, 15],
    ],
    hour: [
        [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
        [0, 3, 6, 9, 12, 15, 18, 21],
        [0, 4, 8, 12, 16, 20],
        [0, 6, 12, 18],
        [0, 12],
    ],
    minute: [
        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], // 0 replaces 60
        [0, 10, 20, 30, 40, 50],
        [0, 15, 30, 45],
        [0, 30],
    ],
}

function getFuzzyTicks(newTicks: Tick[], locator: number[], level: Tick['level']): Tick[] {
    if (locator.length === 0) return [];

    const selectedTicks: Tick[] = [];
    let targetIdx = 0;
    let prevValue = -1;
    let lastSelectedX = -99999; // Keep track of the physical X coordinate

    for (let i = 0; i < newTicks.length; i++) {
        const tick = newTicks[i];
        let value = tick.dt[level];
        // Apply modulo 10 logic for years/weeks
        if (level === "year" || level === "weekOfYear") {
            value = value % 10;
        }

        // 1. Detect Period Rollover
        if (prevValue !== -1 && value < prevValue) {
            targetIdx = 0;
        }

        // 2. Match Target
        if (targetIdx < locator.length) {
            const target = locator[targetIdx];

            // If the current tick's value has reached or passed the target
            if (value >= target) {

                // Check physical pixel spacing before adding.
                // We use 0.5 * MIN_TICK_SPACING to match your collisionThreshold logic.
                if (tick.x - lastSelectedX >= MIN_TICK_SPACING * 0.5) {
                    selectedTicks.push(tick);
                    lastSelectedX = tick.x;
                }

                // Fast-forward the target index. 
                // We do this whether the tick was physically drawn or skipped due to crowding.
                // This prevents mislabeling a future bar with an old target.
                while (targetIdx < locator.length && value >= locator[targetIdx]) {
                    targetIdx++;
                }
            }
        }

        prevValue = value;
    }

    return selectedTicks;
}

function fillTicks(existedTicks: Tick[], newTicks: Tick[], level: Tick['level'], nTicksAround: number): Tick[] {

    // Phase 1: Establish the baseline
    if (existedTicks.length === 0) {
        const locators = LOCATOR_DICT[level];

        let candidateTicks: Tick[]
        for (const locator of locators) {
            candidateTicks = getFuzzyTicks(newTicks, locator, level);

            // We allow a 20% tolerance (1.2x) so we don't accidentally leave the chart empty
            if (candidateTicks.length <= nTicksAround * 1.2) {
                existedTicks.push(...candidateTicks);
                console.log(level, locator)
                return existedTicks.sort((a, b) => a.x - b.x);
            }
        }

        // If we get here, ALL locators for this timeframe are too dense.
        // We DO NOT force the fallback anymore. We SKIP this level entirely, returning 
        // the empty array so the next timeframe up (e.g. Month) becomes the baseline.
        // The only exception is "year" - if years are too dense, we have to plot them anyway.
        if (level === "year") {
            const sparsestLocator = candidateTicks;
            existedTicks.push(...sparsestLocator);
        }

        return existedTicks;

    } else {
        // Phase 2: Overlay upper-level ticks (Months over Days, Years over Months)
        const collisionThreshold = MIN_TICK_SPACING * 0.5; // 70% of spacing requires clearing

        for (const upperTick of newTicks) {
            // Prevent two major ticks of the SAME level from overlapping if zoomed out insanely far
            // const collidesWithSameLevel = existedTicks.some(existing =>
            //     existing.level === upperTick.level && Math.abs(existing.x - upperTick.x) < collisionThreshold
            // );

            // if (collidesWithSameLevel) continue;

            // Remove ALL lower-level ticks that fall within the collision radius
            existedTicks = existedTicks.filter(existing =>
                Math.abs(existing.x - upperTick.x) >= collisionThreshold
            );

            // Add the major tick into the cleared-out space
            existedTicks.push(upperTick);
        }
    }

    return existedTicks.sort((a, b) => a.x - b.x);
}

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
        0.04, 0.06, 0.08, 0.1, 0.2, 0.4, 0.6, 0.8, 1, 2, 4, 6, 8, 10, 20
    ]

    static isMovingAccelerated = false

    readonly baseSer: TSer;

    #wBarIdx = dev ? 10 : 11;
    /** pixels per bar (bar width in pixels) */
    wBar = ChartXControl.PREDEFINED_BAR_WIDTHS[this.#wBarIdx]

    nBars = 0;
    nBarsCompressed = 0;

    wChart: number;

    constructor(baseSer: TSer, wChart: number) {
        this.baseSer = baseSer;
        this.wChart = wChart;

        this.internal_initCrosshairRow()
    }

    reinit() {
        this.internal_initCrosshairRow()
    }

    rightSideRow = 0;

    referCrosshairRow = 0;

    mouseCrosshairRow = 0;

    isReferCrosshairEnabled = false
    isMouseCrosshairEnabled = false

    isCrosshairEnabled = false;

    isMovingAccelerated = false;

    fixedNBars?: number;
    fixedLeftSideTime?: number;

    #isAutoScrollToNewData = true;

    isCrosshairVisible = true;

    klineKind: KlineKind = 'candle'

    xTicks: Tick[] = [];

    setChartWidth(width: number) {
        this.wChart = width;
        this.updateGeometry();
    }

    private updateGeometry() {
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

        this.xTicks = this.calcXTicks();

        // console.log('ChartXControl updateGeometry:', {
        //   wBar: this.wBar,
        //   nBars: this.nBars,
        //   nBarsCompressed: this.nBarsCompressed,
        //   rightSideRow: this.rightSideRow,
        //   isFixedLeftSideTime: this.isFixedLeftSideTime()
        // })
    }

    calcXTicks(): Tick[] {
        const nTicksAround = Math.round(this.wChart / MIN_TICK_SPACING);
        const tzone = this.baseSer.timezone;
        const tframe = this.baseSer.timeframe;

        let prev: Temporal.ZonedDateTime | undefined;

        const yearTicks: Tick[] = [];
        const monthTicks: Tick[] = [];
        const weekTicks: Tick[] = [];
        const dayTicks: Tick[] = [];
        const hourTicks: Tick[] = [];
        const minuteTicks: Tick[] = [];

        // Collect all potential ticks first.
        for (let i = 1; i <= this.nBars; i++) {
            const time = this.tb(i);
            const dt = new Temporal.ZonedDateTime(BigInt(time) * BigInt(TUnit.NANO_PER_MILLI), tzone);
            const x = this.xb(i);

            if (prev !== undefined) {
                switch (tframe.unit) {
                    case TUnit.Minute:
                        if (dt.minute !== prev.minute) {
                            minuteTicks.push({ dt, x, level: "minute" })
                        }

                        if (dt.hour !== prev.hour) {
                            hourTicks.push({ dt, x, level: "hour" })

                        }

                        if (dt.day !== prev.day) {
                            dayTicks.push({ dt, x, level: "day" })

                        }

                        if (dt.month !== prev.month) {
                            monthTicks.push({ dt, x, level: "month" })

                        }

                        if (dt.year !== prev.year) {
                            yearTicks.push({ dt, x, level: "year" })

                        }

                        break

                    case TUnit.Hour:
                        if (dt.hour !== prev.hour) {
                            hourTicks.push({ dt, x, level: "hour" })

                        }

                        if (dt.day !== prev.day) {
                            dayTicks.push({ dt, x, level: "day" })

                        }

                        if (dt.month !== prev.month) {
                            monthTicks.push({ dt, x, level: "month" })

                        }

                        if (dt.year !== prev.year) {
                            yearTicks.push({ dt, x, level: "year" })

                        }

                        break


                    case TUnit.Day:
                        if (dt.day !== prev.day) {
                            dayTicks.push({ dt, x, level: "day" })

                        }

                        if (dt.month !== prev.month) {
                            monthTicks.push({ dt, x, level: "month" })

                        }

                        if (dt.year !== prev.year) {
                            yearTicks.push({ dt, x, level: "year" })

                        }

                        break;


                    case TUnit.Week:
                        if (dt.weekOfYear !== prev.weekOfYear) {
                            weekTicks.push({ dt, x, level: "weekOfYear" })
                        }

                        if (dt.month !== prev.month) {
                            monthTicks.push({ dt, x, level: "month" })

                        }

                        if (dt.year !== prev.year) {
                            yearTicks.push({ dt, x, level: "year" })

                        }

                        break

                    case TUnit.Month:
                        if (dt.month !== prev.month) {
                            monthTicks.push({ dt, x, level: "month" })

                        }

                        if (dt.year !== prev.year) {
                            yearTicks.push({ dt, x, level: "year" })

                        }

                        break;


                    case TUnit.Year:
                        if (dt.year !== prev.year) {
                            yearTicks.push({ dt, x, level: "year" })
                        }

                        break;
                }
            }

            prev = dt;
        }

        // Try to fill ticks
        let ticks: Tick[] = [];
        switch (tframe.unit) {
            case TUnit.Minute:
                ticks = fillTicks(ticks, minuteTicks, "minute", nTicksAround);
                ticks = fillTicks(ticks, hourTicks, "hour", nTicksAround);
                ticks = fillTicks(ticks, dayTicks, "day", nTicksAround);
                ticks = fillTicks(ticks, monthTicks, "month", nTicksAround);
                ticks = fillTicks(ticks, yearTicks, "year", nTicksAround);
                break;
            case TUnit.Hour:
                ticks = fillTicks(ticks, hourTicks, "hour", nTicksAround);
                ticks = fillTicks(ticks, dayTicks, "day", nTicksAround);
                ticks = fillTicks(ticks, monthTicks, "month", nTicksAround);
                ticks = fillTicks(ticks, yearTicks, "year", nTicksAround);
                break;
            case TUnit.Day:
                ticks = fillTicks(ticks, dayTicks, "day", nTicksAround);
                ticks = fillTicks(ticks, monthTicks, "month", nTicksAround);
                ticks = fillTicks(ticks, yearTicks, "year", nTicksAround);
                break;
            case TUnit.Week:
                ticks = fillTicks(ticks, weekTicks, "weekOfYear", nTicksAround);
                ticks = fillTicks(ticks, monthTicks, "month", nTicksAround);
                ticks = fillTicks(ticks, yearTicks, "year", nTicksAround);
                break;
            case TUnit.Month:
                ticks = fillTicks(ticks, monthTicks, "month", nTicksAround);
                ticks = fillTicks(ticks, yearTicks, "year", nTicksAround);
                break;
            case TUnit.Year:
                ticks = fillTicks(ticks, yearTicks, "year", nTicksAround);
                break;
        }

        return ticks;
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

    xt(time: number): number {
        return this.xb(this.bt(time));
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

    ti(index: number): number {
        return this.baseSer.timeOfIndex(index);
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

    private internal_initCrosshairRow() {
        /**
         * baseSer may have finished computing at this time, to adjust
         * the cursor to proper row, update it here.
         * NOTE
         * don't set row directly, instead, use setCrosshairByRow(row, row);
         */
        const row = this.baseSer.lastOccurredRow();
        this.setCrosshairByRow(row, row, true)
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

        // console.log(this.#wBarIdx)
        this.internal_setWBar(ChartXControl.PREDEFINED_BAR_WIDTHS[this.#wBarIdx]);

        this.updateGeometry()
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

        this.internal_setWBar(newWBar)

        this.updateGeometry()
    }

    get isOnCalendarMode() {
        return this.baseSer.isOnCalendarMode
    }
    setOnCalendarMode(b: boolean) {
        if (this.isOnCalendarMode !== b) {
            const referCrosshairTime1 = this.referCrosshairTime()
            const rightCrosshairTime1 = this.rightSideTime()

            if (b == true) {
                this.baseSer.toOnCalendarMode()
            } else {
                this.baseSer.toOnOccurredMode()
            }

            this.internal_setReferCrosshairByTime(referCrosshairTime1);
            this.internal_setRightCrosshairByTime(rightCrosshairTime1);

            this.updateGeometry();
        }
    }

    setCrosshairByRow(referRow: number, rightRow: number, willUpdateViews: boolean) {
        /** set right crosshair row first and directly */
        this.internal_setRightSideRow(rightRow, willUpdateViews)

        const oldValue = this.referCrosshairRow
        this.scrollReferCrosshair(referRow - oldValue, willUpdateViews)
    }

    setReferCrosshairByRow(row: number, willUpdateViews: boolean) {
        const increment = row - this.referCrosshairRow
        this.scrollReferCrosshair(increment, willUpdateViews)
    }

    setMouseCrosshairByRow(row: number) {
        this.mouseCrosshairRow = row
    }

    scrollReferCrosshair(increment: number, willUpdateViews: boolean) {
        const referRow = this.referCrosshairRow + increment
        const rightRow = this.rightSideRow

        // if refCrosshair is near left/right side, check if need to scroll chart except referCursur
        const rightPadding = rightRow - referRow
        if (rightPadding < ChartXControl.REF_PADDING_RIGHT) {
            this.internal_setRightSideRow(rightRow + ChartXControl.REF_PADDING_RIGHT - rightPadding, willUpdateViews)

        } else {
            /** right spacing is enough, check left spacing: */
            const leftRow = rightRow - this.nBars + 1
            const leftPadding = referRow - leftRow
            if (leftPadding < ChartXControl.REF_PADDING_LEFT) {
                this.internal_setRightSideRow(rightRow + leftPadding - ChartXControl.REF_PADDING_LEFT, willUpdateViews)
            }
        }

        this.internal_setReferCrosshairRow(referRow, willUpdateViews)

        this.updateGeometry();
    }

    /** keep refer crosshair stay on same x of screen, and scroll charts left or right by bar */
    scrollChartsHorizontallyByBar(increment: number) {
        const rightRow = this.rightSideRow;
        this.internal_setRightSideRow(rightRow + increment)

        this.scrollReferCrosshair(increment, true)
    }

    scrollReferCrosshairToLeftSide() {
        const rightRow = this.rightSideRow;
        const leftRow = rightRow - this.nBars + ChartXControl.REF_PADDING_LEFT
        this.setReferCrosshairByRow(leftRow, true)
    }

    referCrosshairTime() {
        return this.baseSer.timeOfRow(this.referCrosshairRow);
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
        this.setCrosshairByRow(lastOccurredRow, toRow, willUpdateViews)
    }

    /**
     * @NOTICE
     * =======================================================================
     * as we don't like referCrosshair and rightCrosshair being set directly by others,
     * the following setter methods are named internal_setXXX, and are private.
     */
    private internal_setWBar(wBar: number) {
        const oldValue = this.wBar
        this.wBar = wBar
        if (this.wBar != oldValue) {
            //notifyChanged(classOf<ChartValidityObserver>)
        }
    }

    private internal_setReferCrosshairRow(row: number, boolean = true) {
        this.referCrosshairRow = row
    }

    private internal_setRightSideRow(row: number, notify: boolean = true) {
        this.rightSideRow = row
    }

    private internal_setReferCrosshairByTime(time: number, notify: boolean = true) {
        this.internal_setReferCrosshairRow(this.baseSer.rowOfTime(time), notify)
    }

    private internal_setRightCrosshairByTime(time: number) {
        this.internal_setRightSideRow(this.baseSer.rowOfTime(time))
    }

    // DIRECTION = -1: Left
    // DIRECTION = 1: Right 
    moveCrosshairInDirection(nBarsToMove: number, DIRECTION: number, isDragging?: boolean) {
        nBarsToMove = isDragging
            ? nBarsToMove
            : this.isMovingAccelerated ? Math.floor(this.nBars * 0.168) : 1

        this.scrollReferCrosshair(nBarsToMove * DIRECTION, true)
    }

    moveChartsInDirection(nBarsToMove: number, DIRECTION: number, isDragging?: boolean) {
        nBarsToMove = isDragging
            ? nBarsToMove
            : this.isMovingAccelerated ? Math.floor(this.nBars * 0.168) : 1

        this.scrollChartsHorizontallyByBar(nBarsToMove * DIRECTION)
    }

}




