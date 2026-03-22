import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import { KVAR_NAME, type Kline, } from "../../domain/Kline";
import type { Seg } from "../../svg/Seg";
import { Circle } from "../../svg/Circle";
import { stringMetrics } from "../../utils";
import { Texts } from "../../svg/Texts";
import type { PlotProps } from "./Plot";

const PlotShape = (props: PlotProps) => {
    const { xc, yc, tvar, atIndex, options: { color, style, shape, location, text } } = props;

    const font = '12px "Roboto", "Helvetica", "Arial", sans-serif'

    const kvar = xc.baseSer.varOf<Kline>(KVAR_NAME);

    function plot() {
        const r = 4;
        const d = r * 2

        const path = new Path()
        const segs: Seg[] = [path]
        let fill: string = 'none'
        let opacity: number

        for (let bar = 1; bar <= xc.nBars; bar += xc.nBarsCompressed) {
            // use `undefined` to test if value has been set at least one time
            let high = Number.NEGATIVE_INFINITY;
            let low = Number.POSITIVE_INFINITY
            let v = false
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const datas = tvar.getByTime(time);
                    const data = datas ? datas[atIndex] : undefined;
                    v = v || data ? (data.value as boolean) : v;

                    if (xc.occurred(time)) {
                        const kline = kvar.getByTime(time);
                        if (kline) {
                            high = Math.max(high, kline.high)
                            low = Math.min(low, kline.low)
                        }
                    }
                }
            }

            if (v) {
                const x = xc.xb(bar)

                // x, y is the center at bottom for all shapes
                let y: number
                let below: boolean
                let h = d;
                switch (location) {
                    case 'AboveBar':
                        below = false
                        y = yc.yv(high) - 3
                        break;

                    case 'BelowBar':
                        below = true
                        y = yc.yv(low) + 3
                        break

                    case 'Top':
                        below = false
                        y = 0
                        break

                    case 'Bottom':
                    default:
                        below = true
                        y = yc.hCanvas
                }

                switch (shape) {
                    case 'shape_xcross':
                        y = below ? y + h : y

                        path.moveto(x - r, y)
                        path.lineto(x + r, y - d)
                        path.moveto(x - r, y - d)
                        path.lineto(x + r, y)
                        break

                    case 'shape_cross':
                        y = below ? y + h : y

                        path.moveto(x, y)
                        path.lineto(x, y - d - 2)
                        path.moveto(x - r - 1, y - r - 1)
                        path.lineto(x + r + 1, y - r - 1)
                        break

                    case 'shape_circle':
                        fill = color
                        opacity = 0.7

                        y = below ? y + h : y

                        segs.push(new Circle(x, y - r, r))
                        break

                    case 'shape_triangle_up':
                        fill = color
                        opacity = 0.7

                        y = below ? y + h : y

                        path.moveto(x - r, y)
                        path.lineto(x, y - d)
                        path.lineto(x + r, y)
                        path.lineto(x - r, y)
                        break;

                    case 'shape_triangle_down':
                        fill = color
                        opacity = 0.7

                        y = below ? y + h : y

                        path.moveto(x, y)
                        path.lineto(x - r, y - d)
                        path.lineto(x + r, y - d)
                        path.lineto(x, y)
                        break;

                    case 'shape_arrow_up':
                        fill = color
                        opacity = 0.7

                        y = below ? y + h : y

                        path.moveto(x - r + 2, y)
                        path.lineto(x - r + 2, y - r)
                        path.lineto(x - r, y - r)
                        path.lineto(x, y - d)
                        path.lineto(x + r, y - r)
                        path.lineto(x + r - 2, y - r)
                        path.lineto(x + r - 2, y)
                        path.closepath()
                        break

                    case 'shape_arrow_down':
                        fill = color
                        opacity = 0.7

                        y = below ? y + h : y

                        path.moveto(x, y)
                        path.lineto(x - r, y - r)
                        path.lineto(x - r + 2, y - r)
                        path.lineto(x - r + 2, y - d)
                        path.lineto(x + r - 2, y - d)
                        path.lineto(x + r - 2, y - r)
                        path.lineto(x + r, y - r)
                        path.closepath()
                        break

                    case 'shape_label_up': {
                        console.log("fsdhfsdf")
                        fill = color
                        opacity = 0.5

                        const a = 6 // arrow height
                        let wHalf: number
                        if (text) {
                            const [wText, hText] = calcStringWidthHeight(text)

                            wHalf = Math.floor((wText + 6) / 2)
                            h = a + hText + 8

                        } else {
                            wHalf = r - 1;
                            h = 14
                        }

                        y = below ? y + h : y

                        // y should have been calculated 
                        if (text) {
                            const texts = new Texts;
                            segs.push(texts)
                            texts.text(x - wHalf + 3, y - 4, text, 'black')
                        }

                        path.moveto(x - wHalf, y)
                        path.lineto(x - wHalf, y - h + a)
                        path.lineto(x - a, y - h + a)
                        path.lineto(x, y - h)
                        path.lineto(x + a, y - h + a)
                        path.lineto(x + wHalf, y - h + a)
                        path.lineto(x + wHalf, y)
                        path.closepath()
                        break
                    }

                    case 'shape_label_down': {
                        fill = color
                        opacity = 0.5

                        const a = 6 // arrow height
                        let wHalf: number
                        if (text) {
                            const [wText, hText] = calcStringWidthHeight(text)

                            wHalf = Math.floor((wText + 6) / 2)
                            h = a + hText + 8

                        } else {
                            wHalf = r - 1;
                            h = 14
                        }

                        // y should have been calculated 
                        y = below ? y + h : y

                        if (text) {
                            const texts = new Texts;
                            segs.push(texts)
                            texts.text(x - wHalf + 3, y - a - 4, text, 'black')
                        }

                        path.moveto(x, y)
                        path.lineto(x - a, y - a)
                        path.lineto(x - wHalf, y - a)
                        path.lineto(x - wHalf, y - h)
                        path.lineto(x + wHalf, y - h)
                        path.lineto(x + wHalf, y - a)
                        path.lineto(x + a, y - a)
                        path.closepath()
                        break
                    }

                    case 'shape_flag':
                        fill = color
                        opacity = 0.7

                        y = below ? y + h : y

                        path.moveto(x - r + 1, y)
                        path.lineto(x - r + 1, y - d)
                        path.lineto(x + r - 1, y - d)
                        path.lineto(x + r - 1, y - r)
                        path.lineto(x - r + 1, y - r)
                        break;

                    case 'shape_square':
                        fill = color
                        opacity = 0.7

                        y = below ? y + h : y

                        path.moveto(x - r + 1, y - d + 2)
                        path.lineto(x - r + 1, y)
                        path.lineto(x + r - 1, y)
                        path.lineto(x + r - 1, y - d + 2)
                        path.closepath()
                        break

                    case 'shape_diamond':
                        fill = color
                        opacity = 0.7

                        y = below ? y + h : y

                        path.moveto(x, y - d)
                        path.lineto(x + r, y - r)
                        path.lineto(x, y)
                        path.lineto(x - r, y - r)
                        path.closepath()
                        break;

                    default: // shape_xcross
                        y = below ? y + h : y

                        path.moveto(x - r, y)
                        path.lineto(x + r, y - d)
                        path.moveto(x - r, y - d)
                        path.lineto(x + r, y)
                }
            }
        }

        return { segs, fill, opacity }
    }

    function calcStringWidthHeight(text: string) {
        const metrics = stringMetrics(text, font)
        const width = metrics.width;
        const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        return [width, height]
    }

    const { segs, fill, opacity } = plot();

    return (
        segs.map((seg, n) => seg.render({ key: 'seg-' + n, style: { stroke: color, fill, opacity } }))
    )
}

export default PlotShape;