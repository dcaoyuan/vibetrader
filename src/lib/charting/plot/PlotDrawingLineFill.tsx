import { Path } from "../../svg/Path";
import type { PlotProps } from "./Plot";
import type { LineObject, LinefillObject } from "../../domain/PineData";
import { xOnLine, yOnLine } from "../utils";

const PlotDrawingLineFill = ({ xc, yc, tvar, atIndex }: PlotProps) => {

    const chartWidth = xc.wChart;
    const chartHeight = yc.hChart;

    function getBoundedPoint(targetX: number, targetY: number, refX: number, refY: number, k: number) {
        if (k === 0) return { x: targetX, y: targetY };

        if (targetY > chartHeight) {
            return { x: xOnLine(chartHeight, refX, refY, k), y: chartHeight };

        } else if (targetY < 0) {

            return { x: xOnLine(0, refX, refY, k), y: 0 };

        } else {
            return { x: targetX, y: targetY };
        }
    }

    // Calculates the final screen coordinates for a single line
    function getLineCoords(line: LineObject) {
        const { x1, y1, x2, y2, xloc, extend } = line;

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

        const yPos1 = yc.yv(y1);
        const yPos2 = yc.yv(y2);

        const dx = xPos2 - xPos1;
        const dy = yPos2 - yPos1;

        if (dx === 0) {
            let startY = yPos1;
            let endY = yPos2;
            if (extend === 'b') { // both
                startY = 0;
                endY = chartHeight;
            }
            return {
                startX: xPos1,
                startY: Math.max(0, Math.min(chartHeight, startY)),
                endX: xPos2,
                endY: Math.max(0, Math.min(chartHeight, endY))
            };
        }

        const k = dy / dx;
        const isP1Left = xPos1 < xPos2;
        const leftX = isP1Left ? xPos1 : xPos2;
        const leftY = isP1Left ? yPos1 : yPos2;
        const rightX = isP1Left ? xPos2 : xPos1;
        const rightY = isP1Left ? yPos2 : yPos1;

        let startX = xPos1, startY = yPos1, endX = xPos2, endY = yPos2;

        switch (extend) {
            case 'r': { // right
                startX = leftX; startY = leftY;
                const tempY = yOnLine(chartWidth, leftX, leftY, k);
                const bounded = getBoundedPoint(chartWidth, tempY, leftX, leftY, k);
                endX = bounded.x; endY = bounded.y;
                break;
            }
            case 'l': { // left
                const tempY = yOnLine(0, leftX, leftY, k);
                const bounded = getBoundedPoint(0, tempY, leftX, leftY, k);
                startX = bounded.x; startY = bounded.y;
                endX = rightX; endY = rightY;
                break;
            }
            case 'b': { // both
                const tempLeftY = yOnLine(0, leftX, leftY, k);
                const boundedLeft = getBoundedPoint(0, tempLeftY, leftX, leftY, k);
                startX = boundedLeft.x; startY = boundedLeft.y;

                const tempRightY = yOnLine(chartWidth, leftX, leftY, k);
                const boundedRight = getBoundedPoint(chartWidth, tempRightY, leftX, leftY, k);
                endX = boundedRight.x; endY = boundedRight.y;
                break;
            }
        }

        return { startX, startY, endX, endY };
    }

    function plot() {
        const fills = new Map<number, Path>();

        const datas = tvar.getByIndex(0);
        const data = datas ? datas[atIndex] : undefined;

        // Assuming your PineData payload contains arrays for both lines and fills
        const linefillObjects = data?.value as LinefillObject[];
        if (linefillObjects !== undefined) {
            for (let i = 0; i < linefillObjects.length; i++) {
                const linefillObject = linefillObjects[i];

                const { id, line1, line2, color } = linefillObject;

                if (!line1 || !line2) {
                    continue;
                }

                const coords1 = getLineCoords(line1);
                const coords2 = getLineCoords(line2);

                let path = fills.get(id);
                if (!path) {
                    path = new Path();
                    fills.set(id, path);
                }

                // Draw the polygon: Start1 -> End1 -> End2 -> Start2 -> Close
                path.moveto(coords1.startX, coords1.startY)
                    .lineto(coords1.endX, coords1.endY)
                    .lineto(coords2.endX, coords2.endY)
                    .lineto(coords2.startX, coords2.startY);
                // In a standard SVG Path class, there might be a close() or Z() method. 
                // If not, just lineTo back to the start:
                path.lineto(coords1.startX, coords1.startY);

                path.fill = color;
                path.stroke = 'none'; // Fills usually don't have borders themselves
            }
        }

        return fills;
    }

    const fills = plot();

    return (
        <>
            {Array.from(fills.entries()).map(([id, path]) => path.render({ key: `fill-${id}` }))}
        </>
    );
}

export default PlotDrawingLineFill;