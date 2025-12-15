import type { JSX } from "react"
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
  isSelected: boolean

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

  /** For moving drawing: the valuePoint and handls when mouse is pressed before drag */
  readonly currHandlesWhenMousePressed: Handle[] = []

  /**
   * define mousePressedPoint as final to force using copy(..) to set its value
   */
  mousePressedPoint: TPoint;

  selectedHandleIdx = 0

  isCompleted = false
  isAnchored = false
  isActivated = false
  isReadyToDrag = false

  private firstStretch = true
  private readonly handlePointsBuf: TPoint[] = []

  /**
   * init with known points
   */
  initWithPoints(points: TPoint[]) {
    const n = points.length

    this.nHandles = n

    let i = 0
    while (i < n) {
      this.handles.push(new Handle(this.xc, this.yc))
      this.currHandlesWhenMousePressed.push(new Handle(this.xc, this.yc))

      // assign currentHandles' points to points
      this.handles[i].point = points[i]

      i++
    }

    this.isCompleted = true
  }

  /**
   *
   *
   * @return <code>true</code> if accomplished after this anchor,
   *         <code>false</code> if not yet.
   */
  anchorHandle(point: TPoint): boolean {
    if (this.handles.length === 0) {
      if (this.nHandles === undefined) {
        // it is drawing with variable number of handles , create first handle 
        this.handles.push(new Handle(this.xc, this.yc))
        this.currHandlesWhenMousePressed.push(new Handle(this.xc, this.yc))

      } else {
        // it is drawing with known number of handles, create all handles 
        let i = 0
        while (i < this.nHandles) {
          this.handles.push(new Handle(this.xc, this.yc))
          this.currHandlesWhenMousePressed.push(new Handle(this.xc, this.yc))

          i++;
        }
      }
    }

    this.handles[this.selectedHandleIdx].point = point

    if (!this.isCompleted) {
      // fill handles that not yet anchored with the same point as selectedHandle 
      let i = this.selectedHandleIdx + 1
      while (i < this.handles.length) {
        this.handles[i].point = point

        i++
      }
    }

    if (this.selectedHandleIdx < this.nHandles - 1) {
      this.isAnchored = true

      // select next handle 
      this.selectedHandleIdx++

      /// create next handle if not created yet
      if (this.handles.length - 1 < this.selectedHandleIdx) {
        this.handles.push(new Handle(this.xc, this.yc, point))
        this.currHandlesWhenMousePressed.push(new Handle(this.xc, this.yc))
      }

    } else {
      // if only one handle, should let it be completed at once
      if (this.nHandles == 1) {
        this.stretchHandle(point)
      }

      this.isAnchored = false
      this.isCompleted = true
      this.selectedHandleIdx = -1
    }

    return this.isCompleted;
  }


  stretchHandle(point: TPoint) {
    // set selectedHandle's new position
    this.handles[this.selectedHandleIdx].point = point

    if (!this.isCompleted) {
      let i = this.selectedHandleIdx + 1
      while (i < this.handles.length) {
        this.handles[i].point = this.handles[this.selectedHandleIdx].point
        i++
      }
    }


    if (this.firstStretch) {
      this.firstStretch = false
    }

    const finishedHandle = this.isCompleted ? this.handles.length - 1 : this.selectedHandleIdx

    return (
      <g>
        {this.renderDrawing()}
        {this.handles.slice(finishedHandle + 1).map((Handle, n) => Handle.render("handle-" + n))}
      </g>
    )

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
      const oldPoint = this.currHandlesWhenMousePressed[i].point

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

    // current new drawing
    this.renderDrawing()
    this.renderHandles()
  }

  activate() {
    this.isActivated = true
  }

  passivate() {
    this.isActivated = false
  }


  getCurrentHandlesPoints(): TPoint[] {
    return this.handlesPoints(this.handles)
  }

  protected handlesPoints(handles: Handle[]): TPoint[] {
    this.handlePointsBuf.length = 0
    let i = 0
    while (i < handles.length) {
      this.handlePointsBuf.push(handles[i].point)

      i++
    }

    return this.handlePointsBuf
  }


  getAllCurrentHandlesPath(): Path[] {
    const allCurrHandlesPathBuf = []
    for (const handle of this.handles) {
      allCurrHandlesPathBuf.push(handle.getPath())
    }

    return allCurrHandlesPathBuf;
  }

  getHandleAt(x: number, y: number): Handle {
    for (const handle of this.handles) {
      if (handle.hits(x, y)) {
        return handle
      }
    }

    return undefined
  }

  renderHandles() {
    <g>
      {this.handles.map((handle, n) => handle.render("handle-" + n))}
    </g>
  }

  renderDrawing() {
    const segs = this.plotDrawing()

    return (
      <g>{segs.map((seg, n) => seg.render("seg-" + n, { stroke: "yellow" }))}</g>
    )
  }

  renderWithHandles() {
    const segs = this.plotDrawing()

    return (
      <g>
        {segs.map((seg, n) => seg.render("seg-" + n, { stroke: "yellow" }))}
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

  protected plotLine(xBase: number, yBase: number, k: number, path: Path) {
    const xBeg = 0
    const yBeg = this.yOfLine(xBeg, xBase, yBase, k)
    const xEnd = this.xc.wChart
    const yEnd = this.yOfLine(xEnd, xBase, yBase, k)

    path.moveto(xBeg, yBeg)
    path.lineto(xEnd, yEnd)
  }

  protected plotVerticalLine(bar: number, path: Path) {
    const x = this.xc.xb(bar)
    const yBeg = this.yc.yCanvasLower
    const yEnd = this.yc.yCanvasUpper

    path.moveto(x, yBeg)
    path.lineto(x, yEnd)
  }


  protected yOfLine(x: number, baseX: number, baseY: number, k: number) {
    return (baseY + (x - baseX) * k)
  }
}

export class Handle {
  private readonly RADIUS = 2

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

    const { x, y } = this.xyLocation()

    path.moveto(x - this.RADIUS, y - this.RADIUS)
    path.lineto(x - this.RADIUS, y + this.RADIUS)
    path.lineto(x + this.RADIUS, y + this.RADIUS)
    path.lineto(x + this.RADIUS, y - this.RADIUS)
    path.closepath()

    return path;
  }

  private xyLocation() {
    const x = this.xc.xb(this.xc.bt(this.point.time))
    const y = this.yc.yv(this.point.value)

    return { x, y };
  }

  hits(x: number, y: number): boolean {
    /**
     * always recompute location as not only point could have been changed,
     * but also the view's size could have been changed
     */
    const location = this.xyLocation()

    const centerx = location.x
    const centery = location.y

    return (
      x >= centerx - this.RADIUS &&
      x <= centerx + this.RADIUS &&
      y >= centery - this.RADIUS &&
      y <= centery + this.RADIUS
    )
  }

  render(key: string) {
    const path = this.plot();

    return (
      <g>
        {path.render(key, { stroke: "yellow" })}
      </g>)
  }

  equals(o: unknown): boolean {
    if (o instanceof Handle) {
      return this.point === o.point

    } else {
      return false;
    }
  }
}


