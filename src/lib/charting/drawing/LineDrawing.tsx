import { Path } from "../../svg/Path"
import { Drawing, Handle, type TPoint } from "./Drawing"

export class LineDrawing extends Drawing {
    isExtended: boolean = true

    point1: TPoint
    point2: TPoint

    init() {
        this.nHandles = 2;
    }

    setModel(handles: Handle[]) {
        this.point1 = handles[0].point;
        this.point2 = handles[1].point;
    }

    hits(x: number, y: number): boolean {
        if (this.point1 === undefined || this.point2 === undefined) {
            return;
        }

        const x1 = this.xc.xb(this.xc.bt(this.point1.time))
        const x2 = this.xc.xb(this.xc.bt(this.point2.time))

        const y1 = this.yc.yv(this.point1.value)
        const y2 = this.yc.yv(this.point2.value)

        const dx = x2 - x1
        const dy = y2 - y1
        const k = dx === 0 ? 1 : dy / dx

        // k = (y - y1) / (x - x1)
        const yHit = (x - x1) * k + y1

        return Math.abs(yHit - y) <= 2
    }

    plotDrawing() {
        const path = new Path()

        const x1 = this.xc.xb(this.xc.bt(this.point1.time))
        const x2 = this.xc.xb(this.xc.bt(this.point2.time))

        const y1 = this.yc.yv(this.point1.value)
        const y2 = this.yc.yv(this.point2.value)

        if (this.isExtended) {
            const dx = x2 - x1
            const dy = y2 - y1
            const k = dx === 0 ? 1 : dy / dx

            this.plotLine(x1, y1, k, path)

        } else {
            path.moveto(x1, y1);
            path.lineto(x2, y2);
        }

        return [path];
    }

}

