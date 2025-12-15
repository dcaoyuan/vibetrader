import { Drawing, Handle, type TPoint } from "./Drawing"
import { Path } from "../../svg/Path";


export class ParallelLineDrawing extends Drawing {
    isExtended: boolean = true;

    init() {
        this.nHandles = 3;
    }

    hits(x: number, y: number): boolean {
        if (this.handles.length < this.nHandles) {
            return
        }

        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])
        const x2 = this.xt(this.handles[2])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])
        const y2 = this.yv(this.handles[2])

        const dx = x1 - x0
        const dy = y1 - y0
        const k = dx === 0 ? 1 : dy / dx

        // k = (y - y1) / (x - x1)
        const yHit0 = (x - x0) * k + y0
        const yHit1 = (x - x2) * k + y2

        return Math.abs(yHit0 - y) <= 3 || Math.abs(yHit1 - y) <= 3
    }

    plotDrawing() {
        const path = new Path()

        const x0 = this.xt(this.handles[0])
        const x1 = this.xt(this.handles[1])
        const x2 = this.xt(this.handles[2])

        const y0 = this.yv(this.handles[0])
        const y1 = this.yv(this.handles[1])
        const y2 = this.yv(this.handles[2])

        const dx = x1 - x0
        const dy = y1 - y0

        const k = dx === 0 ? 1 : dy / dx

        const distance = Math.abs(k * x2 - y2 + y0 - k * x0) / Math.sqrt(k * k + 1)

        if (this.isExtended) {
            this.plotLine(x0, y0, k, path);

            if (distance >= 1) {
                this.plotLine(x2, y2, k, path)
            }

        } else {
            path.moveto(x0, y0);
            path.lineto(x1, y1);

            if (distance > 1) {
                const y4 = (x1 - x2) * k + y2

                path.moveto(x2, y2)
                path.lineto(x1, y4)
            }
        }

        return [path];
    }


}


