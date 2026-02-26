import { ChartXControl } from "../view/ChartXControl";
import { ChartYControl } from "../view/ChartYControl";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";

type Props = {
    x: number,
    y: number,
    width: number,
    height: number,
    xc: ChartXControl,
    yc: ChartYControl
}

const AxisY = (props: Props) => {
    const { x, y, height, xc, yc } = props;

    const chart = plot();

    function plot() {
        const vTicks = yc.vTicks;

        const gridPath = new Path;
        const tickPath = new Path;
        const tickTexts = new Texts;

        // draw axis-y line */
        tickPath.moveto(0, 0)
        tickPath.lineto(0, height)

        const wTick = 4;
        for (let i = 0; i < vTicks.length; i++) {
            let vTick = vTicks[i];
            const yTick = Math.round(yc.yv(vTick))

            if (yc.shouldNormScale && yTick > yc.hCanvas - 10) {
                // skip to leave space for normMultiple text 

            } else {
                tickPath.moveto(0, yTick)
                tickPath.lineto(wTick, yTick)

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
        tickPath.moveto(0, 0);
        tickPath.lineto(8, 0);

        if (yc.valueScalar.kind !== 'Linear') {
            tickTexts.text(-1, -8, yc.valueScalar.kind)
        }

        return { tickPath, tickTexts, gridPath };
    }

    const transform = `translate(${x} ${y})`;
    return (
        <>
            <g transform={transform} className="axis" >
                {chart.tickPath.render()}
                {chart.tickTexts.render()}
            </g>
            <g transform={transform} className="grid" >
                {chart.gridPath.render()}
            </g>
        </>
    );
}

export default AxisY;
