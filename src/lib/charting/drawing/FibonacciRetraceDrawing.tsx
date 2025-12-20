import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Drawing } from "./Drawing"

const FN = [
    0,
    0.236,
    0.382,
    0.500,
    0.618,
    0.763,
    1,
    1.618,
    2.0,
    2.618,
    3.0,
    4.237,
]

export class FibonacciRetraceDrawing extends Drawing {

    override init() {
        this.nHandles = 2;
    }

    override hits(x: number, y: number) {
        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])

        const interval = y1 - y0

        let i = 0
        while (i < FN.length) {
            const n = FN[i];
            const yn = y0 + interval * n

            if (yn > this.yc.hCanvas) {
                break;
            }

            if (Math.abs(y - yn) <= 4 && x >= x0 && x <= x1) {
                return true;
            }
            i++
        }

        return false;
    }

    override plotDrawing() {
        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])

        const interval = y1 - y0

        const path = new Path()
        const texts = new Texts()

        let i = 0
        while (i < FN.length) {
            const n = FN[i];
            const yn = y0 + interval * n
            if (yn > this.yc.hCanvas) {
                break;
            }

            path.moveto(x0, yn)
            path.lineto(x1, yn)

            texts.text(x0 + 1, yn - 4, (n * 100).toFixed(1) + '%');

            i++
        }

        return [path, texts]
    }
}



