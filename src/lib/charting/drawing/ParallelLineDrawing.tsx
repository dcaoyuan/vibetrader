import { Drawing, Handle, type TPoint } from "./Drawing"
import { Path } from "../../svg/Path";


export class ParallelLineDrawing extends Drawing {
    isExtended: boolean = true;

    init() {
        this.nHandles = 3;
    }

    point1: TPoint
    point2: TPoint
    point3: TPoint

    setModel(handles: Handle[]) {
        this.point1 = handles[0].point;
        this.point2 = handles[1].point;
        this.point3 = handles[2].point;
    }

    hits(x: number, y: number): boolean {
        return false;
    }

    plotDrawing() {
        const path = new Path()

        const x1 = this.xc.xb(this.xc.bt(this.point1.time))
        const x2 = this.xc.xb(this.xc.bt(this.point2.time))
        const x3 = this.xc.xb(this.xc.bt(this.point3.time))

        const y1 = this.yc.yv(this.point1.value)
        const y2 = this.yc.yv(this.point2.value)
        const y3 = this.yc.yv(this.point3.value)

        const dx = x2 - x1
        const dy = y2 - y1

        const k = dx === 0 ? 1 : dy / dx

        const distance = Math.abs(k * x3 - y3 + y1 - k * x1) / Math.sqrt(k * k + 1)


        if (this.isExtended) {
            this.plotLine(x1, y1, k, path);

            if (distance >= 1) {
                this.plotLine(x3, y3, k, path)
            }

        } else {
            path.moveto(x1, y1);
            path.lineto(x2, y2);

            if (distance > 1) {
                const y4 = (x2 - x3) * k + y3

                path.moveto(x3, y3)
                path.lineto(x2, y4)
            }
        }

        return [path];
    }


}


