import { Path } from "../../svg/Path"
import { distanceToInfiniteLine, distanceToSegment } from "../utils";
import { Drawing } from "./Drawing"

export class LineDrawing extends Drawing {
    isExtended: boolean = true

    override init() {
        this.nHandles = 2;
    }

    override hits(x: number, y: number): boolean {
        if (x > this.xc.wChart) return false;

        const x0 = this.xt(this.handles[0]);
        const x1 = this.xt(this.handles[1]);
        const y0 = this.yv(this.handles[0]);
        const y1 = this.yv(this.handles[1]);

        const distFunc = this.isExtended ? distanceToInfiniteLine : distanceToSegment;
        return distFunc(x, y, x0, y0, x1, y1) <= 4;
    }

    override plotDrawing() {
        const path = new Path();
        const x0 = this.xt(this.handles[0]);
        const x1 = this.xt(this.handles[1]);
        const y0 = this.yv(this.handles[0]);
        const y1 = this.yv(this.handles[1]);

        if (this.isExtended) {
            const dx = x1 - x0;
            if (dx === 0) {
                this.plotVerticalLine(this.bt(this.handles[0]), path);
            } else {
                const k = (y1 - y0) / dx;
                this.plotLine(x0, y0, k, path);
            }
        } else {
            path.moveto(x0, y0);
            path.lineto(x1, y1);
        }
        return [path];
    }

}

