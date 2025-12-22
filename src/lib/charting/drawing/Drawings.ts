import type { ChartXControl } from "../view/ChartXControl"
import type { ChartYControl } from "../view/ChartYControl"
import { FibonacciRetraceDrawing } from "./FibonacciRetraceDrawing"
import { FibonacciRetraceVerticalDrawing } from "./FibonacciRetraceVerticalDrawing"
import { FibonacciTimeZoneDrawing } from "./FibonacciTimeZoneDrawing"
import { GannAnglesDrawing } from "./GannAnglesDrawing"
import { LineDrawing } from "./LineDrawing"
import { ParallelDrawing } from "./ParallelDrawing"
import { PolylineDrawing } from "./PloylineDrawing"

export function createDrawing(id: string, xc: ChartXControl, yc: ChartYControl) {
    switch (id) {
        case 'line':
            return new LineDrawing(xc, yc)

        case 'parallel':
            return new ParallelDrawing(xc, yc)

        case 'polyline':
            return new PolylineDrawing(xc, yc)

        case 'gann_angles':
            return new GannAnglesDrawing(xc, yc)

        case 'fibonacci_retrace':
            return new FibonacciRetraceDrawing(xc, yc)

        case 'fibonacci_retrace_v':
            return new FibonacciRetraceVerticalDrawing(xc, yc)

        case 'fibonacci_timezone':
            return new FibonacciTimeZoneDrawing(xc, yc)

        default:
            return undefined
    }
}

