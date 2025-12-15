import { Path } from "../../svg/Path"
import { Drawing } from "./Drawing"

export class LineDrawing extends Drawing {
    isExtended: boolean = true

    init() {
        this.nHandles = 2;
    }

    hits(x: number, y: number): boolean {
        if (this.handles.length < this.nHandles) {
            return
        }

        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])

        const dx = x1 - x0
        const dy = y1 - y0
        const k = dx === 0 ? 1 : dy / dx

        // k = (y - y1) / (x - x1)
        const yHit = (x - x0) * k + y0

        return Math.abs(yHit - y) <= 3
    }

    plotDrawing() {
        const path = new Path()

        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])

        if (this.isExtended) {
            const dx = x1 - x0
            const dy = y1 - y0
            const k = dx === 0 ? 1 : dy / dx

            this.plotLine(x0, y0, k, path)

        } else {
            path.moveto(x0, y0);
            path.lineto(x1, y1);
        }

        return [path];
    }

}

