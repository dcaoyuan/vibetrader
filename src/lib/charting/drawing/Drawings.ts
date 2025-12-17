import type { ChartXControl } from "../view/ChartXControl"
import type { ChartYControl } from "../view/ChartYControl"
import { LineDrawing } from "./LineDrawing"
import { ParallelDrawing } from "./ParallelDrawing"

export function createDrawing(id: string, xc: ChartXControl, yc: ChartYControl) {
    switch (id) {
        case 'line':
            return new LineDrawing(xc, yc)

        case 'parallel':
            return new ParallelDrawing(xc, yc)

        default:
            return undefined
    }
}

