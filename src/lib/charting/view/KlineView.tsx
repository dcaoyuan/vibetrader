import PlotKline from "../plot/PlotKline"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import AxisY from "../pane/AxisY";
import PlotLine from "../plot/PlotLine";
import { Fragment, type JSX } from "react";
import { LN_SCALAR } from "../scalar/LnScalar";
import PlotStepLine from "../plot/PlotStepLine";
import PlotCrossCircles from "../plot/PlotCrossCircles";
import PlotShape from "../plot/PlotShape";
import PlotHline from "../plot/PlotHline";
import PlotFill from "../plot/PlotFill";
import PlotBgcolor from "../plot/PlotBgcolor";
import PlotDrawingLine from "../plot/PlotDrawingLine";
import PlotDrawingLineFill from "../plot/PlotDrawingLineFill";
import { negativeColor, positiveColor, styleOfLabel } from "../../colors";
import { H_SPACING } from "./KlineViewContainer";


export class KlineView extends ChartView<ViewProps, ViewState> {

    constructor(props: ViewProps) {
        super(props);

        this.yc.valueScalar = LINEAR_SCALAR;

        const { chartLines, chartAxisy, gridLines, overlayChartLines, drawingLines } = this.plot();

        this.state = {
            chartLines,
            chartAxisy,
            gridLines,
            overlayChartLines,
            drawingLines
        };
    }

    override plot() {
        this.computeGeometry();

        const positive = positiveColor(this.props.colorScheme)
        const negative = negativeColor(this.props.colorScheme)

        // Need the non-state latestValue to get it put in AxisY's svg without js code running.
        let latestValue: { value: number, isRising: boolean, axisyUpdated: number };
        const latestTime = this.props.xc.lastOccurredTime();
        if (latestTime !== undefined && latestTime > 0) {
            const kline = this.props.tvar.getByTime(latestTime)

            if (kline !== undefined && kline instanceof Kline) {
                latestValue = { value: kline.close, isRising: kline.close > kline.open, axisyUpdated: new Date().getTime() };
            }
        }

        const chartLines = [
            <PlotKline
                kvar={this.props.tvar as TVar<Kline>}
                xc={this.props.xc}
                yc={this.yc}
                kind={this.props.xc.klineKind}
                depth={0}
                positive={positive}
                negative={negative}
            />
        ]


        const chartAxisy = <AxisY
            x={this.props.width - ChartView.AXISY_WIDTH}
            y={0}
            height={this.props.height}
            xc={this.props.xc}
            yc={this.yc}
            tvar={this.props.tvar}
            colorScheme={this.props.colorScheme}
            latestValue={latestValue}
        />

        const gridLines = this.plotGrids();

        const overlayChartLines = this.plotOverlayCharts();
        // const indicatorLabels = this.plotIndicatorLabels()
        const drawingLines = this.plotDrawings()

        return { chartLines, chartAxisy, gridLines, overlayChartLines, drawingLines }
    }

    protected override plotOverlayCharts() {
        const overlayChartLines: JSX.Element[] = []
        if (this.props.overlayIndicators) {
            let depth = 1;
            this.props.overlayIndicators.map((indicator, n) => {
                const xc = this.props.xc
                const yc = this.yc
                const tvar = indicator.tvar;

                for (const { title, atIndex, options } of indicator.outputs) {
                    let chart: JSX.Element;
                    switch (options.style) {
                        case 'style_linebr':
                        case "style_stepline":
                            chart = <PlotStepLine
                                tvar={tvar}
                                name={title}
                                options={options}
                                atIndex={atIndex}
                                xc={xc}
                                yc={yc}
                                depth={depth++}
                            />
                            break

                        case "style_circles":
                        case "style_cross":
                            chart = <PlotCrossCircles
                                tvar={tvar}
                                name={title}
                                options={options}
                                atIndex={atIndex}
                                xc={xc}
                                yc={yc}
                                depth={depth++}
                            />
                            break

                        case 'shape':
                        case 'char':
                            chart = <PlotShape
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                options={options}
                                name={title}
                                atIndex={atIndex}
                            />
                            break

                        case "hline":
                            chart = <PlotHline
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                options={options}
                                name={title}
                                atIndex={atIndex}
                            />
                            break

                        case "fill":
                            chart = <PlotFill
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                options={options}
                                name={title}
                            />
                            break

                        case 'background':
                            chart = <PlotBgcolor
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                atIndex={atIndex}
                                options={options}
                                name={title}
                            />
                            break

                        case 'drawing_line':
                            chart = <PlotDrawingLine
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                atIndex={atIndex}
                                options={options}
                                name={title}
                            />
                            break

                        case 'linefill':
                            chart = <PlotDrawingLineFill
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                atIndex={atIndex}
                                options={options}
                                name={title}
                            />
                            break

                        case "line":
                        case "style_line":
                        default:
                            chart = <PlotLine
                                tvar={tvar}
                                name={title}
                                options={options}
                                atIndex={atIndex}
                                xc={xc}
                                yc={yc}
                                depth={depth++}
                            />
                    }

                    if (chart !== undefined) {
                        overlayChartLines.push(chart)
                    }
                }

            })
        }

        return overlayChartLines;
    }

    plotIndicatorLabels(mouseIndicatorValues: string[][], referIndicatorValues: string[][]) {
        const chartWidth = this.props.width;

        const styleOfMouse = styleOfLabel('label-mouse', this.props.colorScheme);
        const styleOfRefer = styleOfLabel('label-refer', this.props.colorScheme);

        return this.props.overlayIndicators.map(({ outputs }, m) => {
            // Calculate Y position. 
            // Note: SVG <text> y-coordinate is the baseline. 
            // The "+ 10" is an offset to approximate HTML's top-left positioning.
            const yPos = m * 13 - H_SPACING + 2 + 10;

            return (
                <g key={"indicator-labels-" + m} style={{ fontSize: '12px' }}>
                    {/* Left Aligned - Mouse Indicator Values */}
                    <text
                        x={0}
                        y={yPos}
                        textAnchor="start"
                    >
                        {outputs.map(({ title, options: { color } }, n) =>
                            <Fragment key={"indicator-label-" + n}>
                                <tspan style={styleOfMouse}>
                                    {title ? title + '\u00A0' : ''}
                                </tspan>
                                <tspan fill={color}>
                                    {
                                        mouseIndicatorValues !== undefined &&
                                        mouseIndicatorValues[m] !== undefined &&
                                        mouseIndicatorValues[m][n]
                                    }
                                </tspan>
                                {n === outputs.length - 1
                                    ? <tspan></tspan>
                                    : <tspan>{'\u00A0\u00B7\u00A0'}</tspan>
                                }
                            </Fragment>
                        )}
                    </text>

                    {/* Right Aligned - Refer Indicator Values */}
                    {this.props.xc.isReferCursorEnabled && (
                        <text
                            x={chartWidth - ChartView.AXISY_WIDTH}
                            y={yPos}
                            textAnchor="end"
                        >
                            {outputs.map(({ title, options: { color } }, n) =>
                                <Fragment key={"indicator-label-" + n}>
                                    <tspan style={styleOfRefer}>
                                        {title ? title + '\u00A0' : ''}
                                    </tspan>
                                    <tspan fill={color}>
                                        {
                                            referIndicatorValues &&
                                            referIndicatorValues[m] &&
                                            referIndicatorValues[m][n]
                                        }
                                    </tspan>
                                    {n === outputs.length - 1
                                        ? <tspan></tspan>
                                        : <tspan>{'\u00A0\u00B7\u00A0'}</tspan>
                                    }
                                </Fragment>
                            )}
                        </text>
                    )}
                </g>
            );
        });
    }

    override tryToUpdateIndicatorLabels(mouseTime: number, referTime?: number) {
        if (this.props.overlayIndicators !== undefined) {
            const mouseIndicatorValues: string[][] = []
            const referIndicatorValues: string[][] = []
            this.props.overlayIndicators.map((indicator, n) => {
                const tvar = indicator.tvar;

                let mvs: string[]
                if (mouseTime !== undefined && mouseTime > 0 && this.props.xc.baseSer.occurred(mouseTime)) {
                    mvs = indicator.outputs.map(({ atIndex }, n) => {
                        const datas = tvar.getByTime(mouseTime);
                        const data = datas ? datas[atIndex] : undefined;
                        const v = data ? data.value : NaN
                        return typeof v === 'number'
                            ? isNaN(v) ? "" : v.toFixed(2)
                            : '' + v
                    })

                } else {
                    mvs = new Array(indicator.outputs.length);
                }

                mouseIndicatorValues.push(mvs)

                let rvs: string[]
                if (referTime !== undefined && referTime > 0 && this.props.xc.baseSer.occurred(referTime)) {
                    rvs = indicator.outputs.map(({ atIndex }, n) => {
                        const datas = tvar.getByTime(referTime);
                        const data = datas ? datas[atIndex] : undefined;
                        const v = data ? data.value : NaN
                        return typeof v === 'number'
                            ? isNaN(v) ? "" : v.toFixed(2)
                            : '' + v
                    })

                } else {
                    rvs = new Array(indicator.outputs.length);
                }

                referIndicatorValues.push(rvs)
            })

            const indicatorLabels = this.plotIndicatorLabels(mouseIndicatorValues, referIndicatorValues)
            this.setState({ indicatorLabels })

            // this.props.callbacksToContainer.updateOverlayIndicatorLabels(mouseIndicatorValues, referIndicatorValues);
        }
    }

    override computeMaxValueMinValue() {
        let max = Number.NEGATIVE_INFINITY;
        let min = Number.POSITIVE_INFINITY;

        const xc = this.props.xc;
        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const kline = this.props.tvar.getByTime(time) as Kline;
                if (kline.close > 0) {
                    max = Math.max(max, kline.high)
                    min = Math.min(min, kline.low)
                }
            }
        }

        if (max == min) {
            max *= 1.05
            min *= 0.95
        }

        return [max, min]
    }

    swithScalarType() {
        switch (this.yc.valueScalar.kind) {
            case LINEAR_SCALAR.kind:
                this.yc.valueScalar = LG_SCALAR;
                break;

            case LG_SCALAR.kind:
                this.yc.valueScalar = LN_SCALAR;
                break;

            default:
                this.yc.valueScalar = LINEAR_SCALAR;
        }
    }

    override valueAtTime(time: number) {
        return (this.props.tvar.getByTime(time) as Kline).close;
    }

    render() {
        const transform = `translate(${this.props.x} ${this.props.y})`;
        return (
            <g transform={transform}
                onDoubleClick={this.onDrawingMouseDoubleClick}
                onMouseDown={this.onDrawingMouseDown}
                onMouseMove={this.onDrawingMouseMove}
                onMouseUp={this.onDrawingMouseUp}
                cursor={this.state.cursor}
                ref={this.ref}
            >
                {/* Invisible background to capture clicks in empty space */}
                <rect width={this.props.width} height={this.props.height} fill="transparent" pointerEvents="all" />

                {this.state.chartLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.state.chartAxisy}
                {this.state.gridLines}
                {this.state.referCursor}
                {this.state.mouseCursor}
                {this.state.overlayChartLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {
                    this.props.updateDrawing && this.props.updateDrawing.isHidingDrawing
                        ? <></>
                        : this.state.drawingLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)
                }
                {this.state.indicatorLabels && this.state.indicatorLabels.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.state.sketching}
            </g >
        )
    }
}

