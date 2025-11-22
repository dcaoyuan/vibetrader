import { memo, useRef, useState, type JSX } from "react";
import { QuoteChartView } from "../charting/view/QuoteChartView";
import { VolumeView } from "../charting/view/VolumeView";
import { loadSer } from "./QuoteSer";
import { ChartXControl } from "../charting/view/ChartXControl";
import { ChartView, RefreshEvent } from "../charting/view/ChartView";
import AxisX from "../charting/pane/AxisX";
import { ref } from "process";
import type { BaseTSer } from "../timeseris/BaseTSer";
import type { TVar } from "../timeseris/TVar";
import type { Quote } from "./Quote";
import { Path } from "../svg/Path";

type Props = {
  xc: ChartXControl,
  varName: string,
  width: number,
}

const QuoteSerView = (props: Props) => {
  const { xc, varName, width } = props;

  const quoteSer = xc.baseSer as BaseTSer;
  const qvar = quoteSer.varOf(varName) as TVar<Quote>;

  const isInteractive = true;

  const hMasterView = 400;
  const hSlaveView = 100;
  const hAxisx = ChartView.AXISX_HEIGHT;
  const padding = 10;

  const heights = [hMasterView, hSlaveView, hAxisx];

  const ys = [0];
  let height = 0;
  let y = 0
  for (let i = 0; i < heights.length - 1; i++) {
    y += heights[i] + padding;
    ys.push(y);
  }

  height = y + heights[heights.length - 1];

  console.log("QuoteSerView render");
  const [refreshChart, setRefreshChart] = useState(0);
  const [refreshCursors, setRefreshCursors] = useState(0);

  const [cursors, setCursors] = useState<JSX.Element[]>([]);

  const notify = (event: RefreshEvent) => {
    switch (event) {
      case RefreshEvent.Chart:
        setRefreshChart(refreshChart + 1);
        updateCursors();
        break;

      case RefreshEvent.Cursors:
        setRefreshCursors(refreshCursors + 1)
        updateCursors();
        break;

      default:
    }
  }

  function plotCursor(x: number, color: string) {
    const crossPath = new Path(color);
    crossPath.moveto(x, 0);
    crossPath.lineto(x, height)
    return (
      <g shapeRendering="crispEdges">
        {crossPath.render()}
      </g>
    )
  }

  function updateCursors() {
    let referCursor = <></>
    let mouseCursor = <></>
    const referColor = '#00F0F0'; // 'orange'
    if (xc.isReferCuroseVisible) {
      const time = xc.tr(xc.referCursorRow)
      if (xc.exists(time)) {
        const b = xc.bt(time)
        if (b >= 1 && b <= xc.nBars) {
          const cursorX = xc.xr(xc.referCursorRow)
          referCursor = plotCursor(cursorX, referColor)
        }
      }
    }

    if (xc.isMouseCuroseVisible) {
      const time = xc.tr(xc.mouseCursorRow)
      if (xc.exists(time)) {
        const cursorX = xc.xr(xc.mouseCursorRow)
        mouseCursor = plotCursor(cursorX, '#00F000')
      }
    }

    console.log([mouseCursor, referCursor]);
    setCursors([mouseCursor, referCursor]);
  }


  function isInAxisXArea(y: number) {
    return false;
    //return this.isMasterView && y >= this.height - ChartView.AXISX_HEIGHT
  }

  function isInAxisYArea(x: number) {
    return x < width - ChartView.AXISY_WIDTH
  }

  function handleMouseLeave() {
    // clear mouse cursor and prev value
    xc.isMouseCuroseVisible = false;
    //this.yc.setMouseCursorValue(undefined, undefined)

    notify(RefreshEvent.Cursors);
  }

  function handleMouseMove(e: React.MouseEvent) {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const x = e.pageX - targetRect.left;
    const y = e.pageY - targetRect.top;

    const time = xc.tx(x);

    const b = xc.bx(x);

    let value: number;
    let cursorY: number
    if (isInAxisXArea(y) && xc.exists(time)) {
      // it's in the axis-x area
      //value = this.valueAtTime(time)
      //cursorY = this.yc.yv(value)

    } else {
      //value = this.yc.vy(y);
      //cursorY = y;
    }

    if (isInAxisYArea(x)) {
      // draw mouse cursor only when not in the axis-y area
      const row = xc.rb(b)
      xc.setMouseCursorByRow(row)
      //this.yc.setMouseCursorValue(value, cursorY)
      xc.isMouseCuroseVisible = true

    } else {
      // clear mouse cursor and prev value
      xc.isMouseCuroseVisible = false;
      //this.yc.setMouseCursorValue(undefined, undefined)
    }

    notify(RefreshEvent.Cursors);
    //this.props.notify(RefreshEvent.Cursors);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.ctrlKey) {
      // will select chart on pane

    } else {
      // set refer cursor
      const targetRect = e.currentTarget.getBoundingClientRect();
      const x = e.pageX - targetRect.left;
      const y = e.pageY - targetRect.top;

      const time = xc.tx(x);
      if (!xc.exists(time)) {
        return;
      }

      // align x to bar center
      const b = xc.bx(x);

      if (isInAxisYArea(x)) {
        // draw refer cursor only when not in the axis-y area
        if (
          y >= ChartView.TITLE_HEIGHT_PER_LINE && y <= height &&
          b >= 1 && b <= xc.nBars
        ) {
          const row = xc.rb(b)
          xc.setReferCursorByRow(row, true)
          xc.isReferCuroseVisible = true;

          notify(RefreshEvent.Cursors);
        }
      }
    }
  }

  function handleWheel(e: React.WheelEvent) {
    const fastSteps = Math.floor(xc.nBars * 0.168)
    const delta = Math.round(e.deltaY / xc.nBars);
    console.log(e, delta)

    if (e.shiftKey) {
      // zoom in / zoom out 
      this.xc.growWBar(delta)

    } else if (e.ctrlKey) {
      if (!isInteractive) {
        return
      }

      const unitsToScroll = xc.isCursorAccelerated ? delta * fastSteps : delta;
      // move refer cursor left / right 
      xc.scrollReferCursor(unitsToScroll, true)

    } else {
      if (!isInteractive) {
        return
      }

      const unitsToScroll = xc.isCursorAccelerated ? delta * fastSteps : delta;
      // keep referCursor staying same x in screen, and move
      xc.scrollChartsHorizontallyByBar(unitsToScroll)
    }

    this.props.notify(RefreshEvent.Chart);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const fastSteps = Math.floor(xc.nBars * 0.168)

    switch (e.key) {
      case "ArrowLeft":
        if (e.ctrlKey) {
          xc.moveCursorInDirection(fastSteps, -1)

        } else {
          xc.moveChartsInDirection(fastSteps, -1)
        }
        break;

      case "ArrowRight":
        if (e.ctrlKey) {
          xc.moveCursorInDirection(fastSteps, 1)
        } else {
          xc.moveChartsInDirection(fastSteps, 1)
        }
        break;

      case "ArrowUp":
        if (!e.ctrlKey) {
          xc.growWBar(1)
        }
        break;

      case "ArrowDown":
        if (!e.ctrlKey) {
          xc.growWBar(-1);
        }
        break;

      default:
    }

    notify(RefreshEvent.Chart)
  }

  function handleKeyUp(e: React.KeyboardEvent) {
    switch (e.key) {
      case " ":
        xc.isCursorAccelerated = !xc.isCursorAccelerated
        break;

      case "Escape":
        xc.isReferCuroseVisible = false;
        notify(RefreshEvent.Cursors)
        break;

      default:
    }
  }

  return (
    // onKeyDown/onKeyUp etc upon <div/> should combine tabIndex={0} to work correctly.
    <div className="container" style={{ width: width + 'px', height: height + 'px' }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={0}
    >
      <svg width={width} height={height} vectorEffect="non-scaling-stroke"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      // onWheel={handleWheel}
      >
        <QuoteChartView
          name="ETH"
          x={0}
          y={ys[0]}
          xc={xc}
          baseSer={quoteSer}
          tvar={qvar}
          isQuote={true}
          isMasterView={true}
          width={width}
          height={hMasterView}
          refreshChart={refreshChart}
          refreshCursors={refreshCursors}
        />
        <VolumeView
          name="Vol"
          x={0}
          y={ys[1]}
          xc={xc}
          baseSer={quoteSer}
          tvar={qvar}
          width={width}
          height={hSlaveView}
          refreshChart={refreshChart}
          refreshCursors={refreshCursors}
        />
        <AxisX
          x={0}
          y={ys[2]}
          width={width}
          height={hAxisx}
          xc={xc}
          refreshChart={refreshChart}
          refreshCursors={refreshCursors}
        />
        {cursors}
      </svg>
    </div>
  )
}

export default QuoteSerView 