import type { Key } from "react-aria-components"
import { Path } from "../../svg/Path"
import type { ChartXControl } from "../view/ChartXControl"
import type { ChartYControl } from "../view/ChartYControl"

export type TPoint = {
    time: number,
    value: number
}

export abstract class Drawing {

    xc: ChartXControl
    yc: ChartYControl

    constructor(xc: ChartXControl, yc: ChartYControl, points?: TPoint[]) {
        this.xc = xc;
        this.yc = yc;

        if (points === undefined) {
            this.init()

        } else {
            this.initWithPoints(points)
        }

    }

    nHandles = 0

    abstract init(): void

    abstract plotDrawing(): Path[]
    abstract hits(x: number, y: number): boolean

    /**
     * define final members, so we can be sure that they won't be pointed to
     * another object, even in case of being got by others via public or
     * protected method
     */
    readonly handles: Handle[] = [];

    /** For moving drawing: the handles when mouse is pressed before drag */
    readonly handlesWhenMousePressed: Handle[] = []

    /**
     * define mousePressedPoint as final to force using copy(..) to set its value
     */
    mousePressedPoint: TPoint;

    currHandleIdx = 0

    isCompleted = false
    isAnchored = false

    protected newHandle(point?: TPoint) {
        return new Handle(this.xc, this.yc, point)
    }

    /**
     * init by known points
     */
    initWithPoints(points: TPoint[]) {
        const n = points.length

        this.nHandles = n

        let i = 0
        while (i < n) {
            this.handles.push(this.newHandle())
            this.handlesWhenMousePressed.push(this.newHandle())

            // assign points to handles
            this.handles[i].point = points[i]
            i++
        }

        this.isCompleted = true
    }

    /**
     *
     * @return true  if accomplished after this anchor,
     *         false if not yet.
     */
    anchorHandle(point: TPoint): boolean {
        if (this.handles.length === 0) {
            if (this.nHandles === undefined) {
                // it is drawing with variable number of handles , create first handle 
                this.handles.push(this.newHandle())
                this.handlesWhenMousePressed.push(this.newHandle())

            } else {
                // it is drawing with known number of handles, create all handles 
                let i = 0
                while (i < this.nHandles) {
                    this.handles.push(this.newHandle())
                    this.handlesWhenMousePressed.push(this.newHandle())
                    i++;
                }
            }
        }

        this.handles[this.currHandleIdx].point = point

        if (!this.isCompleted) {
            // fill handles that not yet anchored with the same point as selectedHandle 
            let i = this.currHandleIdx + 1
            while (i < this.handles.length) {
                this.handles[i].point = point
                i++
            }
        }

        if (this.currHandleIdx < this.nHandles - 1) {
            this.isAnchored = true

            // select next handle 
            this.currHandleIdx++

            /// create next handle if not created yet
            if (this.handles.length - 1 < this.currHandleIdx) {
                this.handles.push(this.newHandle(point))
                this.handlesWhenMousePressed.push(this.newHandle())
            }

        } else {
            // if only one handle, should let it be completed at once
            if (this.nHandles == 1) {
                this.stretchCurrentHandle(point)
            }

            this.isAnchored = false
            this.isCompleted = true
            this.currHandleIdx = -1
        }

        return this.isCompleted;
    }


    stretchCurrentHandle(point: TPoint) {
        this.handles[this.currHandleIdx].point = point

        if (!this.isCompleted) {
            // fill handles that not yet anchored with the same point as selectedHandle 
            let i = this.currHandleIdx + 1
            while (i < this.handles.length) {
                this.handles[i].point = point
                i++
            }
        }

        return this.renderDrawingWithHandles()
    }

    moveDrawing(mouseDraggedPoint: TPoint) {
        /**
         * should compute bar moved instead of time moved, because when shows
         * in trading date mode, time moved may not be located at a trading day
         */
        const barMoved = this.xc.bt(mouseDraggedPoint.time) - this.xc.bt(this.mousePressedPoint.time)
        const vMoved = mouseDraggedPoint.value - this.mousePressedPoint.value

        let i = 0
        while (i < this.handles.length) {
            const oldPoint = this.handlesWhenMousePressed[i].point

            // compute newTime, process bar fisrt, then transfer to time 
            const oldBar = this.xc.bt(oldPoint.time)
            const newBar = oldBar + barMoved;
            const newTime = this.xc.tb(newBar);

            // compute newValue
            const newValue = oldPoint.value + vMoved

            /**
             * NOTE: 
             * do not use getPoint().set(newTime, newValue) to change point member,
             * because we need handle to recompute position. use copyPoint().
             */
            this.handles[i].point = { time: newTime, value: newValue }

            i++
        }

        return this.renderDrawingWithHandles()
    }

    getHandleIdxAt(x: number, y: number): number {
        let i = 0
        while (i < this.handles.length) {
            if (this.handles[i].hits(x, y)) {
                return i;
            }
            i++
        }

        return -1
    }

    renderHandles() {
        <g>
            {this.handles.map((handle, n) => handle.render("handle-" + n))}
        </g>
    }

    renderDrawing(key?: Key) {
        return (
            <g key={key}>
                {this.plotDrawing().map((seg, n) => seg.render({
                    key: "seg-" + n,
                    style: { stroke: "#ffffff", strokeWidth: "0.7px" }
                }))}
            </g>
        )
    }

    renderDrawingWithHandles(key?: Key) {
        return (
            <g key={key}>
                {this.plotDrawing().map((seg, n) => seg.render({
                    key: "seg-" + n,
                    style: { stroke: "#ffffff", strokeWidth: "1px" }
                }))}
                {this.handles.map((handle, n) => handle.render("handle-" + n))}
            </g>
        )
    }

    protected xt(handle: Handle) {
        return this.xc.xb(this.xc.bt(handle.point.time))
    }

    protected yv(handle: Handle) {
        return this.yc.yv(handle.point.value)
    }

    protected plotLine(baseX: number, baseY: number, k: number, path: Path) {
        const xstart = 0
        const ystart = this.yOnLine(xstart, baseX, baseY, k)
        const xend = this.xc.wChart
        const yend = this.yOnLine(xend, baseX, baseY, k)

        path.moveto(xstart, ystart)
        path.lineto(xend, yend)
    }

    protected plotVerticalLine(bar: number, path: Path) {
        const x = this.xc.xb(bar)
        const xstart = this.yc.yCanvasLower
        const yend = this.yc.yCanvasUpper

        path.moveto(x, xstart)
        path.lineto(x, yend)
    }


    protected yOnLine(x: number, baseX: number, baseY: number, k: number) {
        return (baseY + (x - baseX) * k)
    }

    protected distanceToLine(x: number, y: number, baseX: number, baseY: number, k: number) {
        return Math.abs(k * x - y + baseY - k * baseX) / Math.sqrt(k * k + 1)
    }
}

const RADIUS = 3
export class Handle {

    point: TPoint

    private xc: ChartXControl
    private yc: ChartYControl

    constructor(xc: ChartXControl, yc: ChartYControl, point?: TPoint) {
        this.xc = xc;
        this.yc = yc;
        if (point !== undefined) {
            this.point = point
        }
    }

    getPath(): Path {
        const path = new Path()

        // always replot path as not only point could have changed but also the view's size could have changed
        this.plot()

        return path
    }

    private plot() {
        const path = new Path()

        const [x, y] = this.xyLocation()

        path.moveto(x - RADIUS, y - RADIUS)
        path.lineto(x - RADIUS, y + RADIUS)
        path.lineto(x + RADIUS, y + RADIUS)
        path.lineto(x + RADIUS, y - RADIUS)
        path.closepath()

        return path;
    }

    private xyLocation() {
        const x = this.xc.xb(this.xc.bt(this.point.time))
        const y = this.yc.yv(this.point.value)

        return [x, y];
    }

    hits(x: number, y: number): boolean {
        const [x0, y0] = this.xyLocation()

        const distance = Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2))

        return distance <= 4
    }

    render(key: string) {
        const path = this.plot();

        return path.render({ key, style: { stroke: "#ffffff", strokeWidth: "1px" } })
    }

    equals(o: unknown): boolean {
        if (o instanceof Handle) {
            return this.point === o.point

        } else {
            return false;
        }
    }
}


