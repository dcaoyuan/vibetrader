import { forwardRef, Fragment, memo, useImperativeHandle, useRef, useState, type JSX, type SetStateAction } from "react";
import { createDrawing } from "../../drawing/drawings";
import { Drawing } from "../../drawing/Drawing";
import type { ChartXControl } from "../ChartXControl";
import type { ChartYControl } from "../ChartYControl";
import type { CallbacksToContainer } from "../KlineViewContainer";

type DrawingLayerProps = {
    x: number;
    y: number;
    width: number;
    height: number;
    xc: ChartXControl;
    yc: ChartYControl;

    isHidingDrawing: boolean;
    createDrawingId: string;

    callback: CallbacksToContainer;

    chartUpdateTicker: number;
}

export type DrawingState = {
    selectedDrawing?: number;
    mouseDownHitDrawing?: number;
    mouseMoveHitDrawing?: number;
};

// Define the API you want to expose to the parent component
export interface DrawingLayerRef {
    deleteSelected: () => void;
    unselect: () => void;
    cancelSketch: () => void; // Added for the parent to call on 'Escape'
}

const DEFAULT_CURSOR = "default"
const HANDLE_CURSOR = "pointer"
const GRAB_CURSOR = "grab"
const MOVE_CURSOR = "all-scroll" // 'move' doesn't work?

const DrawingLayer = forwardRef<DrawingLayerRef, DrawingLayerProps>(({
    x, y, width, height, xc, yc, createDrawingId, isHidingDrawing, callback
}, ref) => {

    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [sketching, setSketching] = useState<Drawing | undefined>(undefined);
    const [_sketchTick, setSketchTick] = useState(0);
    const [cursor, setCursor] = useState(DEFAULT_CURSOR);

    const [selectedDrawing, setSelectedDrawingNative] = useState<number | undefined>(undefined);
    const [mouseMoveHitDrawing, setMouseMoveHitDrawingNative] = useState<number | undefined>(undefined);

    const mouseDownHitDrawing = useRef<number | undefined>(undefined);
    const isDragging = useRef(false);
    const renderFrameRef = useRef<number | undefined>(undefined);
    const lastPointerUpTime = useRef<number>(0); // Track click timing

    const setSelectedDrawing = (valueOrUpdater: SetStateAction<number | undefined>) => {
        const newValue = typeof valueOrUpdater === 'function'
            ? valueOrUpdater(selectedDrawing)
            : valueOrUpdater;

        setSelectedDrawingNative(newValue);
        callback.updateDrawingState({ selectedDrawing: newValue })
    }

    const setMouseMoveHitDrawing = (valueOrUpdater: SetStateAction<number | undefined>) => {
        const newValue = typeof valueOrUpdater === 'function'
            ? valueOrUpdater(mouseMoveHitDrawing)
            : valueOrUpdater;

        setMouseMoveHitDrawingNative(newValue);
        callback.updateDrawingState({ mouseMoveHitDrawing: newValue })
    }

    const setMouseDownHitDrawing = (idx: number | undefined) => {
        mouseDownHitDrawing.current = idx;
        callback.updateDrawingState({ mouseDownHitDrawing: idx })
    }

    const p = (x: number, y: number) => {
        return { time: xc.tx(x), value: yc.vy(y) }
    }

    // translate offset from [x, y] to svg, to [x, y] to this view
    const translate = (eOnWholeSVG: React.PointerEvent) => {
        return [
            eOnWholeSVG.nativeEvent.offsetX - x,
            eOnWholeSVG.nativeEvent.offsetY - y
        ]
    }

    const deleteSelectedDrawing = () => {
        if (selectedDrawing !== undefined) {
            setDrawings(currentDrawings => [
                ...currentDrawings.slice(0, selectedDrawing),
                ...currentDrawings.slice(selectedDrawing + 1)
            ]);

            setSelectedDrawing(undefined);
            setMouseMoveHitDrawing(undefined);
            setMouseDownHitDrawing(undefined);
        }
    };

    const unselectDrawing = () => {
        setSelectedDrawing(undefined);
    }

    const cancelCurrentSketch = () => {
        if (sketching) {
            setSketching(undefined);
            setCursor(DEFAULT_CURSOR);
            callback.resetDrawingIdsToCreate();
            setSketchTick(t => t + 1);
        }
    }

    const onPointerDown = (e: React.PointerEvent<SVGGElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);

        if (sketching && sketching.isCompleted === false) {
            return;
        }

        isDragging.current = true;
        const [x, y] = translate(e)

        const hitIdx = drawings.findLastIndex(drawing => drawing.hits(x, y))
        if (hitIdx >= 0) {
            setMouseDownHitDrawing(hitIdx);
            const selectedOne = drawings[hitIdx]
            const handleIdx = selectedOne.getHandleIdxAt(x, y)

            if (handleIdx >= 0) {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    selectedOne.deleteHandleAt(handleIdx)
                    selectedOne.setCurrHandleIdx(-1);
                    setSelectedDrawing(hitIdx);
                    setCursor(DEFAULT_CURSOR);

                } else {
                    selectedOne.setCurrHandleIdx(handleIdx);
                    setSelectedDrawing(hitIdx);
                    setCursor(HANDLE_CURSOR);
                }

            } else {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    const newHandleIdx = selectedOne.insertHandle(p(x, y))
                    selectedOne.setCurrHandleIdx(newHandleIdx);
                    setSelectedDrawing(hitIdx);
                    setCursor(HANDLE_CURSOR);

                } else {
                    selectedOne.recordHandlesWhenMousePressed(p(x, y))
                    selectedOne.setCurrHandleIdx(-1);
                    setSelectedDrawing(hitIdx);
                    setCursor(GRAB_CURSOR);
                }
            }

        } else {
            setMouseDownHitDrawing(undefined)
            if (selectedDrawing !== undefined) {
                drawings[selectedDrawing].setCurrHandleIdx(-1);
                setSelectedDrawing(undefined);
            }
        }
    }

    const onPointerMove = (e: React.PointerEvent<SVGGElement>) => {
        e.stopPropagation();

        const [x, y] = translate(e)

        if (sketching && sketching.isCompleted === false) {
            if (sketching.isAnchored) {
                if (renderFrameRef.current !== null) {
                    cancelAnimationFrame(renderFrameRef.current);
                }

                renderFrameRef.current = requestAnimationFrame(() => {
                    sketching.stretchCurrentHandle(p(x, y));
                    setSketchTick(tick => tick + 1);
                    renderFrameRef.current = null;
                });

                setMouseMoveHitDrawing(undefined);
                if (selectedDrawing !== undefined) {
                    console.log("!!!!!!!!!!!!!!!!!!!!!, will you be here ????")
                    setSelectedDrawing(undefined);
                }
                setCursor(DEFAULT_CURSOR);
            }
            return
        }

        if (isDragging.current) {
            if (mouseDownHitDrawing.current !== undefined) {
                const activeOne = drawings[mouseDownHitDrawing.current];
                if (activeOne) {
                    const currentPoint = p(x, y);

                    if (renderFrameRef.current !== null) {
                        cancelAnimationFrame(renderFrameRef.current);
                    }

                    renderFrameRef.current = requestAnimationFrame(() => {
                        if (activeOne.currHandleIdx >= 0) {
                            activeOne.stretchCurrentHandle(currentPoint);
                        } else {
                            activeOne.dragDrawing(currentPoint);
                        }

                        setDrawings(prev => [...prev]);
                        renderFrameRef.current = null;
                    });

                    setCursor(activeOne.currHandleIdx >= 0 ? HANDLE_CURSOR : GRAB_CURSOR);
                }

            } else {
                setCursor(MOVE_CURSOR);
            }

        } else {
            const hoverIdx = drawings.findLastIndex(drawing => drawing.hits(x, y))
            if (hoverIdx >= 0) {
                setMouseMoveHitDrawing(hoverIdx)
                const hoverOne = drawings[hoverIdx]
                const hoverHandle = hoverOne.getHandleIdxAt(x, y)
                const newCursor = hoverHandle >= 0
                    ? HANDLE_CURSOR
                    : e.ctrlKey
                        ? HANDLE_CURSOR
                        : GRAB_CURSOR

                setCursor(newCursor);

            } else {
                setMouseMoveHitDrawing(undefined);
                setCursor(DEFAULT_CURSOR);
            }
        }
    }

    const onPointerUp = (e: React.PointerEvent<SVGGElement>) => {
        isDragging.current = false;

        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        // --- DOUBLE CLICK SAFEGUARD ---
        const now = Date.now();
        const isDoubleClick = e.detail === 2 || (now - lastPointerUpTime.current < 300);
        lastPointerUpTime.current = now;

        // If it's a variable-handle drawing (like Polyline), a double-click finishes the sketch.
        // We MUST intercept the second click so it doesn't anchor an extra handle right before onDoubleClick fires.
        if (isDoubleClick && sketching && sketching.nHandles === undefined) {
            return;
        }
        // ------------------------------

        let currentSketching = sketching;
        if (currentSketching === undefined) {
            if (createDrawingId) {
                currentSketching = createDrawing(createDrawingId, xc, yc);
            }
        }

        const [x, y] = translate(e)

        if (currentSketching && currentSketching.isCompleted === false) {
            const completedNow = currentSketching.anchorHandle(p(x, y))
            if (completedNow) {
                setDrawings(prev => [...prev, currentSketching]);
                callback.resetDrawingIdsToCreate();
                setSelectedDrawing(drawings.length);

                setSketching(undefined);

            } else {
                setSketching(currentSketching);
            }

            setSketchTick(tick => tick + 1);
        }
    }

    const onPointerCancel = (e: React.PointerEvent<SVGGElement>) => {
        isDragging.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        setMouseMoveHitDrawing(undefined);
        setCursor(DEFAULT_CURSOR);
    }

    const onDoubleClick = (e: React.MouseEvent) => {
        if (e.detail === 2) {
            if (sketching && sketching.isCompleted === false && sketching.nHandles === undefined) {
                sketching.setIsCompleted(true);
                sketching.setIsAnchored(false);
                sketching.setCurrHandleIdx(-1);

                if (sketching.handles.length > 1) {
                    // drop pre-created next handle, see anchorHandle(...)
                    sketching.handles.pop();
                }

                setDrawings(prev => [...prev, sketching]);
                callback.resetDrawingIdsToCreate();
                setSketching(undefined);
                setSelectedDrawing(drawings.length); // old drawing length is extract the index of latest drawing
                setSketchTick(tick => tick + 1);
            }
        }
    }

    useImperativeHandle(ref, () => ({
        deleteSelected: () => deleteSelectedDrawing(),
        unselect: () => unselectDrawing(),
        cancelSketch: () => cancelCurrentSketch()
    }));

    const drawingLines = drawings.map((drawing, n) => selectedDrawing === n || mouseMoveHitDrawing === n
        ? drawing.renderDrawingWithHandles("drawing-" + n)
        : drawing.renderDrawing("drawing-" + n))

    const sketchingLines = sketching && !sketching.isCompleted
        ? sketching.renderDrawingWithHandles("sketching")
        : <></>;

    // console.log("DrawingLayer Render Cycle! Selected is now:", selectedDrawing, mouseMoveHitDrawing);

    return (
        <g
            onDoubleClick={onDoubleClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            cursor={cursor}
        >
            {/* Invisible background to capture clicks in empty space */}
            <rect width={width} height={height} fill="transparent" pointerEvents="all" />

            {isHidingDrawing
                ? <></>
                : drawingLines?.map((c, n) => <Fragment key={n}>{c}</Fragment>)
            }
            {sketchingLines}
        </g>
    );
})

export default memo(DrawingLayer)