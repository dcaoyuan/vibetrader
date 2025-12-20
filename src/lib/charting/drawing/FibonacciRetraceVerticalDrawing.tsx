import { Path } from "../../svg/Path"
import { Texts } from "../../svg/Texts";
import { Drawing } from "./Drawing"

const FN = [
    0.000,
    0.382,
    0.500,
    0.618,
    1.000,
    1.236,
    1.618,
    2.000,
    2.618,
    3.000
]

export class FibonacciRetraceVerticalDrawing extends Drawing {

    override init() {
        this.nHandles = 2;
    }

    override hits(x: number, y: number): boolean {
        const b0 = this.bt(this.handles[0])
        const b1 = this.bt(this.handles[1])
        const interval = b1 - b0

        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])

        let i = 0
        while (i < FN.length) {
            const n = FN[i];
            const b = Math.round(b0 + interval * n)
            const xn = this.xc.xb(b);

            if (xn > this.xc.wChart) {
                break;
            }

            if (Math.abs(x - xn) <= 4) {
                return true;
            }

            i++
        }

        return false;
    }

    override plotDrawing() {
        const b0 = this.bt(this.handles[0])
        const b1 = this.bt(this.handles[1])
        const interval = b1 - b0

        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])


        const path = new Path()
        const texts = new Texts()

        let i = 0
        while (i < FN.length) {
            const n = FN[i];
            const bn = Math.round(b0 + interval * n)
            const xn = this.xc.xb(bn);

            if (xn > this.xc.wChart) {
                break;
            }

            path.moveto(xn, 0)
            path.vertical_lineto(this.yc.hCanvas)

            texts.text(xn + 2, this.yc.hCanvas, (n * 100).toFixed(1) + '%')

            i++
        }

        return [path, texts];
    }

}

