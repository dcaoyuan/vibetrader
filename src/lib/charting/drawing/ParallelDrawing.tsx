import { Drawing } from "./Drawing"
import { Path } from "../../svg/Path";


export class ParallelDrawing extends Drawing {
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

        const distance1 = this.distanceToLine(x, y, x0, y0, k)
        const distance2 = this.distanceToLine(x, y, x2, y2, k)

        return distance1 <= 4 || distance2 <= 4
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

        const distance = this.distanceToLine(x2, y2, x0, y0, k)

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


