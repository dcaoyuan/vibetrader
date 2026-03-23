import { Path } from "../../svg/Path";
import type { PlotProps } from "./Plot";
import type { LineObject } from "../../domain/PineData";
import { xOnLine, yOnLine } from "../utils";


const PlotDrawingLine = ({ xc, yc, tvar, atIndex, options }: PlotProps) => {

    const chartWidth = xc.wChart;
    const chartHeight = yc.hChart;

    // Mathematically calculates the intersection if the line shoots past the top or bottom of the chart
    function getBoundedPoint(targetX: number, targetY: number, refX: number, refY: number, k: number) {
        if (k === 0) return { x: targetX, y: targetY }; // Horizontal line, Y won't change

        if (targetY > chartHeight) {
            // Shoots past the bottom
            const y = chartHeight;
            const x = xOnLine(chartHeight, refX, refY, k);

            return { x, y };

        } else if (targetY < 0) {
            // Shoots past the top
            const y = 0;
            const x = xOnLine(0, refX, refY, k);

            return { x, y };

        } else {
            return { x: targetX, y: targetY };
        }
    }

    function plot() {
        const lines = new Map<number, Path>();

        const datas = tvar.getByIndex(0);
        const data = datas ? datas[atIndex] : undefined;
        const lineObjects = data ? data.value as LineObject[] : undefined;

        if (lineObjects !== undefined) {
            for (let i = 0; i < lineObjects.length; i++) {
                const { id, color, x1, y1, x2, y2, style, width: lineWidth, xloc, extend } = lineObjects[i]
                // console.log(x1, x2, y1, y2)

                if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
                    continue;
                }

                let xPos1: number;
                let xPos2: number;

                switch (xloc) {
                    case 'bt': // bar_time
                        xPos1 = xc.xt(x1);
                        xPos2 = xc.xt(x2);
                        break

                    case 'bi': // bar_index
                    default:
                        xPos1 = xc.xt(xc.ti(x1));
                        xPos2 = xc.xt(xc.ti(x2));
                        break
                }

                const yPos1 = yc.yv(y1)
                const yPos2 = yc.yv(y2)

                let path = lines.get(id);
                if (!path) {
                    path = new Path();
                    lines.set(id, path);
                }

                const dx = xPos2 - xPos1;
                const dy = yPos2 - yPos1;

                if (dx === 0) {
                    let startY = yPos1;
                    let endY = yPos2;

                    if (extend === 'b') { // both
                        startY = 0;
                        endY = chartHeight;
                    }

                    // Clamp strictly vertical lines to chart Y bounds
                    startY = Math.max(0, Math.min(chartHeight, startY));
                    endY = Math.max(0, Math.min(chartHeight, endY));

                    path.moveto(xPos1, startY);
                    path.lineto(xPos2, endY);

                } else {
                    const k = dy / dx;

                    const isP1Left = xPos1 < xPos2;
                    const leftX = isP1Left ? xPos1 : xPos2;
                    const leftY = isP1Left ? yPos1 : yPos2;
                    const rightX = isP1Left ? xPos2 : xPos1;
                    const rightY = isP1Left ? yPos2 : yPos1;

                    let startX = xPos1;
                    let startY = yPos1;
                    let endX = xPos2;
                    let endY = yPos2;

                    switch (extend) {
                        case 'r': { // right
                            startX = leftX;
                            startY = leftY;
                            const tempY = yOnLine(chartWidth, leftX, leftY, k);
                            const bounded = getBoundedPoint(chartWidth, tempY, leftX, leftY, k);
                            endX = bounded.x;
                            endY = bounded.y;
                            break;
                        }
                        case 'l': { // left
                            const tempY = yOnLine(0, leftX, leftY, k);
                            const bounded = getBoundedPoint(0, tempY, leftX, leftY, k);
                            startX = bounded.x;
                            startY = bounded.y;
                            endX = rightX;
                            endY = rightY;
                            break;
                        }
                        case 'b': { // both
                            const tempLeftY = yOnLine(0, leftX, leftY, k);
                            const boundedLeft = getBoundedPoint(0, tempLeftY, leftX, leftY, k);
                            startX = boundedLeft.x;
                            startY = boundedLeft.y;

                            const tempRightY = yOnLine(chartWidth, leftX, leftY, k);
                            const boundedRight = getBoundedPoint(chartWidth, tempRightY, leftX, leftY, k);
                            endX = boundedRight.x;
                            endY = boundedRight.y;
                            break;
                        }
                        case 'n': // none
                        default:
                            startX = xPos1;
                            startY = yPos1;
                            endX = xPos2;
                            endY = yPos2;
                            break;
                    }

                    path.moveto(startX, startY);
                    path.lineto(endX, endY);
                }

                path.stroke = color || "#2962FF"; // #2962FF is the default drawing color
                path.strokeWidth = lineWidth;

                switch (style) {
                    case 'style_dashed':
                        path.strokeDasharray = "4 3"
                        break
                    case 'style_dotted':
                        path.strokeDasharray = "1 2"
                        break
                    case "style_solid":
                    default:
                        break;
                }
            }
        }

        return lines;
    }

    const lines = plot();

    return (
        <>
            {Array.from(lines.entries()).map(([id, path]) => path.render({ key: id }))}
        </>
    )
}

export default PlotDrawingLine;