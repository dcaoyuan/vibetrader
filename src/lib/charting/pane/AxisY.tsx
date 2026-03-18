import { ChartXControl } from "../view/ChartXControl";
import { ChartYControl } from "../view/ChartYControl";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { styleOfAnnot } from "../../colors";
import { stringMetrics } from "../../utils";
import { ChartView, type UpdateEvent } from "../view/ChartView";
import { Kline } from "../../domain/Kline";
import type { TVar } from "../../timeseris/TVar";
import type { ColorScheme } from "../../../App";
import { Component, type JSX, type RefObject } from "react";
import React from "react";

type Props = {
    x: number,
    y: number,
    height: number,
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown>
    colorScheme: ColorScheme
    latestValue?: { value: number, isRising: boolean, axisyUpdated: number },
}

type State = {
    nothing?: boolean;
}

class AxisY extends Component<Props, State> {
    ref: RefObject<SVGAElement>;
    font: string;

    constructor(props: Props) {
        super(props);

        this.ref = React.createRef();
    }

    plot() {
        const xc = this.props.xc;
        const yc = this.props.yc;

        const vTicks = yc.vTicks;

        const gridPath = new Path;
        const tickPath = new Path;
        const tickTexts = new Texts;

        // draw axis-y line */
        tickPath
            .moveto(0, 0)
            .lineto(0, this.props.height)

        const wTick = 4;
        for (let i = 0; i < vTicks.length; i++) {
            let vTick = vTicks[i];
            const yTick = Math.round(yc.yv(vTick))

            if (yc.shouldNormScale && yTick > yc.hCanvas - 10) {
                // skip to leave space for normMultiple text 

            } else {
                tickPath
                    .moveto(0, yTick)
                    .lineto(wTick, yTick)

                vTick = yc.shouldNormScale
                    ? vTick / yc.normScale
                    : vTick;

                const vStr = parseFloat(vTick.toFixed(4)).toString();
                const yText = yTick + 4

                tickTexts.text(8, yText, vStr);

                gridPath.moveto(-xc.wChart, yTick);
                gridPath.lineto(0, yTick);
            }
        }

        if (yc.shouldNormScale) {
            tickTexts.text(8, yc.hCanvas, yc.normMultiple);
        }

        // draw end line 
        tickPath
            .moveto(0, 0)
            .lineto(8, 0);

        if (yc.valueScalar.kind !== 'Linear') {
            tickTexts.text(-1, -8, yc.valueScalar.kind)
        }

        const lastestValue = this.props.latestValue ? this.plotLatestValue() : <></>

        return (
            <>
                <g className="axis" >
                    {tickPath.render({ style: { stroke: '#393939', fill: '#393939', strokeWidth: '0.7px' } })}
                    {tickTexts.render({ style: { fill: '#393939', fontSize: '12px' } })}
                </g>
                <g className="grid" >
                    {gridPath.render({ style: { stroke: '#39393959', fill: '#39393959', strokeWidth: '0.5px' } })}
                </g>
                <g>
                    {lastestValue}
                </g>
            </>)
    }

    plotLatestValue() {
        const yc = this.props.yc;

        if (this.props.latestValue) {
            let value = this.props.latestValue.value
            const className = this.props.latestValue.isRising ? "annot-positive" : "annot-negative"

            const y = yc.yv(value);
            if (yc.shouldNormScale) {
                value /= yc.normScale
            }

            return this.plotYValueLabel(y, value, className)
        }

        return <></>
    }

    plotYValueLabel(y: number, value: number, className: string) {
        const pathStyle = styleOfAnnot(className, this.props.colorScheme);
        const textStyle = styleOfAnnot(className, this.props.colorScheme, true);

        const valueStr = value.toFixed(3);

        const metrics = stringMetrics(valueStr, this.font)
        const wLabel = metrics.width + 4
        const hLabel = 13;

        const axisyTexts = new Texts
        const axisyPath = new Path
        const y0 = y + 6
        const x0 = 6

        // draw arrow
        axisyPath.moveto(6, y - 3)
            .lineto(0, y)
            .lineto(6, y + 3);

        axisyPath.moveto(x0, y0)
            .lineto(x0 + wLabel, y0)
            .lineto(x0 + wLabel, y0 - hLabel)
            .lineto(x0, y0 - hLabel)
            .closepath()

        axisyTexts.text(8, y0 - 2, valueStr);

        return (
            // pay attention to the order to avoid text being overlapped
            <g className={className}>
                {axisyPath.render({ style: pathStyle })}
                {axisyTexts.render({ style: textStyle })}
            </g>
        )
    }


    render() {
        const axis = this.plot();

        const transform = `translate(${this.props.x} ${this.props.y})`;

        return (
            <g transform={transform} ref={this.ref}>
                {axis}
            </g >
        );
    }

    override componentDidMount() {
        if (this.ref.current) {
            const computedStyle = window.getComputedStyle(this.ref.current);
            const fontSize = computedStyle.getPropertyValue('font-size');
            const fontFamily = computedStyle.getPropertyValue('font-family');

            this.font = fontSize + ' ' + fontFamily;
        }
    }
}

export default AxisY;
