import { Path } from "../../svg/Path"
import type { ChartXControl } from "../view/ChartXControl"
import type { ChartYControl } from "../view/ChartYControl"
import { Rect } from "../../svg/Rect"
import type { Seg } from "../../svg/Seg"
import type { Key } from "react"
import { Circle } from "../../svg/Circle"

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

    abstract plotDrawing(): Seg[]
    abstract hits(x: number, y: number): boolean

    readonly handles: Handle[] = [];

    // For drag whole drawing: the handles when mouse is pressed before drag
    #handlesWhenMousePressed: Handle[] = []
    #mousePressedPoint: TPoint;

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

            // assign points to handles
            this.handles[i].point = points[i]
            i++
        }

        this.isCompleted = true
    }

    /**
     *
     * @return true  if completed after this anchor,
     *         false if not yet.
     */
    anchorHandle(point: TPoint): boolean {
        if (this.handles.length === 0) {
            if (this.nHandles === undefined) {
                // it is variable-handle drawing, create the first handle 
                this.handles.push(this.newHandle())

            } else {
                // it is known-number-handle drawing, create all handles 
                let i = 0
                while (i < this.nHandles) {
                    this.handles.push(this.newHandle())
                    i++;
                }
            }
        }

        this.handles[this.currHandleIdx].point = point

        if (!this.isCompleted) {
            // fill handles that not yet anchored with the same point
            let i = this.currHandleIdx + 1
            while (i < this.handles.length) {
                this.handles[i].point = point
                i++
            }
        }

        if (this.currHandleIdx < this.nHandles - 1 || this.nHandles === undefined) {
            this.isAnchored = true

            // go to next handle 
            this.currHandleIdx++

            if (this.nHandles === undefined) {
                /// pre-create next handle for variable-handle drawing
                this.handles.push(this.newHandle(point))
            }

        } else {
            // if it's one-handle drawing, complete it right now 
            if (this.nHandles === 1) {
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

        return this.renderDrawingWithHandles("drawing-stretching")
    }

    // Store handles when mouse pressed, for moveDrawing() 
    recordHandlesWhenMousePressed(point: TPoint) {
        this.#mousePressedPoint = point
        const handles: Handle[] = new Array(this.handles.length)
        let i = 0
        while (i < this.handles.length) {
            handles[i] = this.newHandle(this.handles[i].point)
            i++
        }
        this.#handlesWhenMousePressed = handles;
    }

    dragDrawing(point: TPoint) {
        /**
         * should compute bar moved instead of time moved, because when shows
         * in trading date mode, time moved may not be located at a trading day
         */
        const bMoved = this.xc.bt(point.time) - this.xc.bt(this.#mousePressedPoint.time)
        const vMoved = point.value - this.#mousePressedPoint.value

        let i = 0
        while (i < this.handles.length) {
            const oldP = this.#handlesWhenMousePressed[i].point

            const oldB = this.xc.bt(oldP.time)
            const newB = oldB + bMoved;

            const newTime = this.xc.tb(newB);
            const newValue = oldP.value + vMoved

            this.handles[i].point = { time: newTime, value: newValue }

            i++
        }

        return this.renderDrawingWithHandles("drawing-moving")
    }

    // used by variable-handle drawing to insert a handle
    insertHandle(point: TPoint): number {
        return -1
    }

    deleteHandleAt(handleIdx: number) {
        this.handles.splice(handleIdx, 1);
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

    renderDrawing(key: Key) {
        return (
            <g key={key} className="drawing">
                {this.plotDrawing().map((seg, n) => seg.render({ key: "seg-" + n }))}
            </g>
        )
    }

    renderDrawingWithHandles(key: Key) {
        return (
            <g key={key}>
                <g className="drawing-highlight">
                    {this.plotDrawing().map((seg, n) => seg.render({ key: "seg-" + n }))}
                </g>
                <g className="drawing-handle">
                    {this.handles.map((handle, n) => handle.render("handle-" + n))}
                </g>
            </g>
        )
    }

    protected bt(handle: Handle) {
        return this.xc.bt(handle.point.time)
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


    protected xOnLine(y: number, baseX: number, baseY: number, k: number) {
        return (baseX + (y - baseY) / k)
    }

    protected yOnLine(x: number, baseX: number, baseY: number, k: number) {
        return (baseY + (x - baseX) * k)
    }

    protected distanceToLine(x: number, y: number, baseX: number, baseY: number, k: number) {
        return Math.abs(k * x - y + baseY - k * baseX) / Math.sqrt(k * k + 1)
    }
}

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

    private plot() {
        const [x, y] = this.xyLocation()

        const seg = new Circle(x, y, 5)

        return seg;
    }

    private xyLocation() {
        const x = this.xc.xb(this.xc.bt(this.point.time))
        const y = this.yc.yv(this.point.value)

        return [x, y];
    }

    hits(x: number, y: number): boolean {
        const [x0, y0] = this.xyLocation()

        const distance = Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2))

        return distance <= 8
    }

    render(key: string) {
        const seg = this.plot();

        return seg.render({ key })
    }

    equals(o: unknown): boolean {
        if (o instanceof Handle) {
            return this.point === o.point

        } else {
            return false;
        }
    }
}


