import { Path } from "../../svg/Path"
import { Drawing } from "./Drawing"

export class PolylineDrawing extends Drawing {
    isExtended: boolean = true

    override init() {
        this.nHandles = undefined;
    }

    override hits(x: number, y: number): boolean {
        let i = 0
        while (i < this.handles.length - 1) {
            const x0 = this.xt(this.handles[i])
            const x1 = this.xt(this.handles[i + 1])

            const y0 = this.yv(this.handles[i])
            const y1 = this.yv(this.handles[i + 1])

            const dx = x1 - x0
            const dy = y1 - y0
            const k = dx === 0 ? 1 : dy / dx

            const distance = this.distanceToLine(x, y, x0, y0, k)

            if (distance <= 4) {
                return true
            }

            i++
        }

        return false
    }

    override plotDrawing() {
        const path = new Path()

        let i = 0
        while (i < this.handles.length - 1) {
            const x0 = this.xt(this.handles[i])
            const x1 = this.xt(this.handles[i + 1])

            const y0 = this.yv(this.handles[i])
            const y1 = this.yv(this.handles[i + 1])

            path.moveto(x0, y0);
            path.lineto(x1, y1);

            i++
        }

        return [path];
    }

}

