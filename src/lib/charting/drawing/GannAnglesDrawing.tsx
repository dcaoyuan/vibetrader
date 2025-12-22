import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Drawing } from "./Drawing"

export class GannAnglesDrawing extends Drawing {

    override init() {
        this.nHandles = 2;
    }

    override hits(x: number, y: number) {
        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])

        return (
            this.#inFrame(x, y, x0, x1, y0, y1) && (
                this.#hitFrame(x, y, x0, x1, y0, y1) ||
                this.#hitOneDirection(x, y, x0, x1, y0, y1) ||
                this.#hitOneDirection(x, y, x1, x0, y0, y1) ||
                this.#hitOneDirection(x, y, x0, x1, y1, y0) ||
                this.#hitOneDirection(x, y, x1, x0, y1, y0)
            )
        )
    }

    #inFrame(x: number, y: number, x0: number, x1: number, y0: number, y1: number) {
        return (
            x > Math.min(x0, x1) - 4 &&
            x < Math.max(x0, x1) + 4 &&
            y > Math.min(y0, y1) - 4 &&
            y < Math.max(y0, y1) + 4
        )
    }

    #hitFrame(x: number, y: number, x0: number, x1: number, y0: number, y1: number) {
        let k: number
        let distance: number

        // diannol 
        k = x1 - x0 === 0 ? 1 : (y1 - y0) / (x1 - x0)
        distance = this.distanceToLine(x, y, x0, y0, k)
        if (distance <= 4) {
            return true
        }

        k = x1 - x0 === 0 ? 1 : (y0 - y1) / (x1 - x0)
        distance = this.distanceToLine(x, y, x0, y1, k)
        if (distance <= 4) {
            return true
        }

        // horizontal lines
        if (Math.abs(y - y0) <= 4 || Math.abs(y - y1) <= 4) {
            return true;
        }

        // vertical lines 
        if (Math.abs(x - x0) <= 4 || Math.abs(x - x1) <= 4) {
            return true
        }

        return false;
    }

    #hitOneDirection(x: number, y: number, x0: number, x1: number, y0: number, y1: number) {

        const k = x1 - x0 === 0 ? 1 : (y1 - y0) / (x1 - x0)

        let distance: number

        let xn: number
        let yn: number
        let n = 2
        while (n < 4) {
            xn = this.xOnLine(y1, x0, y0, k * n)
            yn = this.yOnLine(xn, x0, y0, k * n)

            distance = this.distanceToLine(x, y, x0, y0, k * n)
            if (distance <= 4) {
                return true
            }

            distance = this.distanceToLine(x, y, x0, y0, k / n)
            if (distance <= 4) {
                return true
            }

            n++
        }

        return false;
    }

    override plotDrawing() {
        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])

        const path = new Path()
        const texts = new Texts()

        this.#plotFrame(x0, x1, y0, y1, true, true, true, path)

        this.#plotOneDirection(x0, x1, y0, y1, path)
        this.#plotOneDirection(x1, x0, y0, y1, path)
        this.#plotOneDirection(x0, x1, y1, y0, path)
        this.#plotOneDirection(x1, x0, y1, y0, path)

        return [path, texts]
    }

    #plotFrame(
        x0: number, x1: number, y0: number, y1: number,
        drawDiagnol: boolean, drawHorizontal: boolean, drawVertical: boolean,
        path: Path
    ) {
        // main angle
        if (drawDiagnol) {
            path.moveto(x0, y0)
            path.lineto(x1, y1)

            path.moveto(x0, y1)
            path.lineto(x1, y0)
        }

        // horizontal lines
        if (drawHorizontal) {
            path.moveto(x0, y0)
            path.lineto(x1, y0)

            path.moveto(x0, y1)
            path.lineto(x1, y1)
        }

        // vertical lines 
        if (drawVertical) {
            path.moveto(x0, y0)
            path.lineto(x0, y1)

            path.moveto(x1, y0)
            path.lineto(x1, y1)
        }
    }

    #plotOneDirection(x0: number, x1: number, y0: number, y1: number, path: Path) {

        const k = x1 - x0 === 0 ? 1 : (y1 - y0) / (x1 - x0)

        let xn: number
        let yn: number
        let n = 2
        while (n < 4) {
            xn = this.xOnLine(y1, x0, y0, k * n)
            yn = this.yOnLine(xn, x0, y0, k * n)
            path.moveto(x0, y0)
            path.lineto(xn, yn)


            yn = this.yOnLine(x1, x0, y0, k / n)
            xn = this.xOnLine(yn, x0, y0, k / n)
            path.moveto(x0, y0)
            path.lineto(x1, yn)

            n++
        }
    }
}



