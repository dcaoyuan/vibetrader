import { memo, useRef, useState, type JSX } from "react";
import { QuoteChartView } from "../charting/view/QuoteChartView";
import { VolumeView } from "../charting/view/VolumeView";
import { ChartXControl } from "../charting/view/ChartXControl";
import { ChartView, RefreshEvent, type RefreshCursor } from "../charting/view/ChartView";
import AxisX from "../charting/pane/AxisX";
import type { BaseTSer } from "../timeseris/BaseTSer";
import type { TVar } from "../timeseris/TVar";
import type { Quote } from "./Quote";
import { Path } from "../svg/Path";
import Title from "../charting/pane/Title";
import Spacing from "../charting/pane/Spacing";

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

  const hTitle = 98;
  const hMasterView = 400;
  const hSlaveView = 100;
  const hAxisx = ChartView.AXISX_HEIGHT;

  const hSpacing = 10;

  const hViews = [hSpacing, hMasterView, hSpacing, hSlaveView, hSpacing, hAxisx];
  const iChartStart = 1; // index of first chart view

  let yStart = 0
  let svgHeight = 0;
  const yStarts = [];
  for (const hView of hViews) {
    yStarts.push(yStart);
    yStart += hView;
    svgHeight += hView;
  }

  const yChartStart = yStarts[iChartStart];
  const containerHeight = svgHeight + hTitle;

  const emptyYMouses = hViews.map(_ => undefined);

  console.log("QuoteSerView render");
  const [refreshChart, setRefreshChart] = useState(0);
  const [refreshCursors, setRefreshCursors] = useState<RefreshCursor>({ changed: 0, yMouses: emptyYMouses });

  const cursors = plotCursors()

  const notify = (event: RefreshEvent, yMouses: number[] = emptyYMouses) => {
    switch (event) {
      case RefreshEvent.Chart:
        setRefreshChart(refreshChart + 1);
        break;

      case RefreshEvent.Cursors:
        setRefreshCursors({ changed: refreshCursors.changed + 1, yMouses })
        break;

      default:
    }
  }

  function plotCursorVerticalLine(x: number, color: string) {
    const crossPath = new Path(color);
    // crossPath.stroke_dasharray = '1, 1'

    // vertical line
    crossPath.moveto(x, yChartStart);
    crossPath.lineto(x, svgHeight)

    return crossPath.render()
  }

  function plotCursors() {
    let referCursor = <></>
    let mouseCursor = <></>
    const referColor = '#00F0F0'; // 'orange'
    if (xc.isReferCuroseVisible) {
      const time = xc.tr(xc.referCursorRow)
      if (xc.exists(time)) {
        const cursorX = xc.xr(xc.referCursorRow)
        referCursor = plotCursorVerticalLine(cursorX, referColor)
      }
    }

    if (xc.isMouseCuroseVisible) {
      const time = xc.tr(xc.mouseCursorRow)
      if (xc.exists(time)) {
        const cursorX = xc.xr(xc.mouseCursorRow)
        mouseCursor = plotCursorVerticalLine(cursorX, '#00F000')
      }
    }

    return (
      <g shapeRendering="crispEdges">
        {referCursor}
        {mouseCursor}
      </g>
    )
  }

  function calcYMouses(y: number) {
    const yMouses: number[] = [];

    for (let i = 0; i < hViews.length; i++) {
      const yStart = yStarts[i];
      const yEnd = yStart + hViews[i];
      if (y >= yStart && y <= yEnd) {
        yMouses.push(y - yStart);

      } else {
        yMouses.push(undefined);
      }
    }

    return yMouses;
  }

  function isInAxisYArea(x: number) {
    return x < width - ChartView.AXISY_WIDTH
  }

  function handleMouseLeave() {
    // clear mouse cursor
    xc.isMouseCuroseVisible = false;

    notify(RefreshEvent.Cursors);
  }

  function handleMouseMove(e: React.MouseEvent) {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const x = e.pageX - targetRect.left;
    const y = e.pageY - targetRect.top;

    const b = xc.bx(x);

    if (isInAxisYArea(x)) {
      // draw mouse cursor only when not in the axis-y area
      const row = xc.rb(b)
      xc.setMouseCursorByRow(row)
      xc.isMouseCuroseVisible = true

    } else {
      xc.isMouseCuroseVisible = false;
    }

    notify(RefreshEvent.Cursors, calcYMouses(y));
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
          y >= yChartStart && y <= svgHeight &&
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

    notify(RefreshEvent.Chart);
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

  const spacing = (i: number, upOrDown?: string) => {
    return (
      <Spacing
        id={i}
        y={yStarts[i]}
        height={hViews[i]}
        x={0}
        width={width}
        upOrDown={upOrDown}
      />
    )
  }

  const quoteChartView = (i: number) => {
    return (
      <QuoteChartView
        id={i}
        y={yStarts[i]}
        height={hViews[i]}
        x={0}
        width={width}
        name="ETH"
        xc={xc}
        baseSer={quoteSer}
        tvar={qvar}
        isQuote={true}
        isMasterView={true}
        refreshChart={refreshChart}
        refreshCursors={refreshCursors}
      />
    )
  }

  const volumeView = (i: number) => {
    return (
      <VolumeView
        id={i}
        y={yStarts[i]}
        height={hViews[i]}
        x={0}
        width={width}
        name="Vol"
        xc={xc}
        baseSer={quoteSer}
        tvar={qvar}
        refreshChart={refreshChart}
        refreshCursors={refreshCursors}
      />
    )
  }

  const axisX = (i: number) => {
    return (
      <AxisX
        id={i}
        y={yStarts[i]}
        height={hViews[i]}
        x={0}
        width={width}
        xc={xc}
        refreshChart={refreshChart}
        refreshCursors={refreshCursors}
      />
    )
  }

  return (
    // onKeyDown/onKeyUp etc upon <div/> should combine tabIndex={0} to work correctly.
    <div className="container" style={{ width: width + 'px', height: containerHeight + 'px' }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={0}
    >
      <div className="title" style={{ width: width, height: hTitle }}>
        <div style={{ paddingLeft: '0px' }}>
          <Title
            width={width}
            height={hTitle}
            xc={xc}
            tvar={qvar}
            refreshChart={refreshChart}
            refreshCursors={refreshCursors}
          />
        </div>
        <div className="borderLeft" style={{ top: hTitle - 8 }} />
      </div>
      <div style={{ width: width + 'px', height: svgHeight + 'px' }}>
        <svg viewBox={`0, 0, ${width} ${svgHeight}`} width={width} height={svgHeight} vectorEffect="non-scaling-stroke"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          {spacing(0)}
          {quoteChartView(1)}
          {spacing(2)}
          {volumeView(3)}
          {spacing(4)}
          {axisX(5)}
          {cursors}
        </svg>
      </div>
    </div>
  )
}

export default QuoteSerView 