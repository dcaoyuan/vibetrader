import { Path } from "../../svg/Path"
import { Texts } from "../../svg/Texts";
import { Drawing } from "./Drawing"

const FN = calcFN()

function calcFN() {
    const fn = [0, 5, 8]

    let n = 3;
    while (n < 40) {
        fn.push(fn[n - 1] + fn[n - 2])
        n++
    }

    return fn;
}

export class FibonacciTimeZoneDrawing extends Drawing {

    override init() {
        this.nHandles = 1;
    }

    override hits(x: number, y: number): boolean {
        const b0 = this.bt(this.handles[0])

        let i = 0
        while (i < FN.length) {
            const n = FN[i];
            const bn = b0 + n
            const xn = this.xc.xb(bn);

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

        const path = new Path()
        const texts = new Texts()

        let i = 0
        while (i < FN.length) {
            const n = FN[i];
            const bn = b0 + n
            const xn = this.xc.xb(bn);

            if (xn > this.xc.wChart) {
                break;
            }

            path.moveto(xn, 0)
            path.vertical_lineto(this.yc.hCanvas)

            texts.text(xn + 2, this.yc.hCanvas, n + '')

            i++
        }

        return [path, texts];
    }

}

