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
   * set the drawing's model according to the handles.
   *
   * @param handles the list of handles to be used to set the model
   */
  abstract setModel(handles: Handle[]): void

  /**
   * define final members, so we can be sure that they won't be pointed to
   * another object, even in case of being got by others via public or
   * protected method
   */
  readonly currHandles: Handle[] = [];

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
    const size = points.length

    this.nHandles = size

    let i = 0
    while (i < size) {
      this.currHandles.push(new Handle(this.xc, this.yc))
      this.currHandlesWhenMousePressed.push(new Handle(this.xc, this.yc))

      // assign currentHandles' points to points
      this.currHandles[i].point = points[i]

      i++
    }

    this.isCompleted = true

    // set drawing' arg according to current handles 
    this.setModel(this.currHandles)
  }

  /**
   *
   *
   * @return <code>true</code> if accomplished after this anchor,
   *         <code>false</code> if not yet.
   */
  anchorHandle(point: TPoint): boolean {
    if (this.currHandles.length === 0) {
      if (this.nHandles === undefined) {
        // it is drawing with variable number of handles , create first handle 
        this.currHandles.push(new Handle(this.xc, this.yc))
        this.currHandlesWhenMousePressed.push(new Handle(this.xc, this.yc))

      } else {
        // it is drawing with known number of handles, create all handles 
        let i = 0
        while (i < this.nHandles) {
          this.currHandles.push(new Handle(this.xc, this.yc))
          this.currHandlesWhenMousePressed.push(new Handle(this.xc, this.yc))

          i++;
        }
      }
    }

    this.currHandles[this.selectedHandleIdx].point = point

    if (!this.isCompleted) {
      // fill handles that not yet anchored with the same point as selectedHandle 
      const n = this.currHandles.length
      let i = this.selectedHandleIdx + 1
      while (i < n) {
        this.currHandles[i].point = point

        i++
      }
    }

    if (this.selectedHandleIdx < this.nHandles - 1) {
      this.isAnchored = true

      // select next handle 
      this.selectedHandleIdx++

      /// create next handle if not created yet
      if (this.currHandles.length - 1 < this.selectedHandleIdx) {
        this.currHandles.push(new Handle(this.xc, this.yc, point))
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
    this.currHandles[this.selectedHandleIdx].point = point

    if (!this.isCompleted) {
      const n = this.currHandles.length
      let i = this.selectedHandleIdx + 1
      while (i < n) {
        this.currHandles[i].point = this.currHandles[this.selectedHandleIdx].point
        i++
      }
    }


    if (this.firstStretch) {
      this.firstStretch = false
    }

    // current new drawing
    const drawings: JSX.Element[] = []

    const mainDrawing = this.renderDrawing();
    drawings.push(mainDrawing)

    drawings.push(this.currHandles[this.selectedHandleIdx].render())

    if (this.isCompleted) {
      const n = this.currHandles.length
      let i = 0
      while (i < n) {
        if (i !== this.selectedHandleIdx) {
          drawings.push(this.currHandles[i].render())
        }

        i++
      }

    } else {
      let i = 0
      while (i < this.selectedHandleIdx) {
        drawings.push(this.currHandles[i].render())

        i++
      }

    }

    return drawings;
  }

  moveDrawing(mouseDraggedPoint: TPoint) {
    /**
     * should compute bar moved instead of time moved, because when shows
     * in trading date mode, time moved may not be located at a trading day
     */
    const barMoved = this.xc.bt(mouseDraggedPoint.time) - this.xc.bt(this.mousePressedPoint.time)
    const vMoved = mouseDraggedPoint.value - this.mousePressedPoint.value

    const n = this.currHandles.length
    let i = 0
    while (i < n) {
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
      this.currHandles[i].point = { time: newTime, value: newValue }

      i++
    }
    /// current new drawing
    this.renderDrawing()
    this.renderHandles()

  }

  private renderHandles() {
    return this.currHandles.map(handle => handle.render())
  }

  activate() {
    this.isActivated = true
  }

  passivate() {
    this.isActivated = false
  }


  getCurrentHandlesPoints(): TPoint[] {
    return this.handlesPoints(this.currHandles)
  }

  protected handlesPoints(handles: Handle[]): TPoint[] {
    this.handlePointsBuf.length = 0
    let i = 0
    const n = handles.length
    while (i < n) {
      this.handlePointsBuf.push(handles[i].point)

      i++
    }

    return this.handlePointsBuf
  }


  getAllCurrentHandlesPath(): Path[] {
    const allCurrHandlesPathBuf = []
    for (const handle of this.currHandles) {
      allCurrHandlesPathBuf.push(handle.getPath())
    }

    return allCurrHandlesPathBuf;
  }

  getHandleAt(x: number, y: number): Handle {
    for (const handle of this.currHandles) {
      if (handle.contains(x, y)) {
        return handle
      }
    }

    return undefined
  }

  private renderDrawing() {
    // 1. set drawing's model according to the handles
    this.setModel(this.currHandles)

    // 2. plot drawing
    this.plotDrawing()

    // 3. render drawing 
    return this.render()
  }

  render(): JSX.Element {
    const segs = this.plotDrawing()

    return (
      <g>{segs.map((seg, n) => seg.render("seg-" + n, { stroke: "yellow" }))}</g>
    )
  }


  protected plotLine(xBase: number, yBase: number, k: number, path: Path) {
    const xStart = 0
    const yStart = this.yOnLine(xStart, xBase, yBase, k)
    const xEnd = this.xc.wChart
    const yEnd = this.yOnLine(xEnd, xBase, yBase, k)

    path.moveto(xStart, yStart)
    path.lineto(xEnd, yEnd)
  }

  protected plotVerticalLine(bar: number, path: Path) {
    const x = this.xc.xb(bar)
    const yStart = this.yc.yCanvasLower
    const yEnd = this.yc.yCanvasUpper

    path.moveto(x, yStart)
    path.lineto(x, yEnd)
  }


  protected yOnLine(x: number, baseX: number, baseY: number, k: number) {
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

  contains(x: number, y: number): boolean {
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

  render() {
    const path = this.plot();

    return (
      <g>
        {path.render("handle", { stroke: "yellow" })}
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


