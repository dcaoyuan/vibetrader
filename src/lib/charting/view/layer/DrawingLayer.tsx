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

    // selectedDrawing, mouseMoveHitDrawing are used for rendering:
    const [selectedDrawing, setSelectedDrawingNative] = useState<number | undefined>(undefined);
    const [mouseMoveHitDrawing, setMouseMoveHitDrawingNative] = useState<number | undefined>(undefined);

    const mouseDownHitDrawing = useRef<number | undefined>(undefined);
    const isDragging = useRef(false);

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

    // translate offset x, y to svg to x, y to this view
    const translate = (eOnWholeSVG: React.MouseEvent) => {
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
            // Force re-render to clear the sketch lines
            setSketchTick(t => t + 1);
        }
    }

    const onMouseDown = (e: React.MouseEvent) => {
        // console.log('mouse down', e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        if (sketching && sketching.isCompleted === false) {
            return;
        }

        isDragging.current = true;

        const [x, y] = translate(e)

        // Select drawing ? Search backwards so you select the top-most visual layer
        const hitIdx = drawings.findLastIndex(drawing => drawing.hits(x, y))
        if (hitIdx >= 0) {
            // record the mouseDownHitDrawingIdx for dragging decision
            setMouseDownHitDrawing(hitIdx);

            const selectedOne = drawings[hitIdx]

            const handleIdx = selectedOne.getHandleIdxAt(x, y)
            if (handleIdx >= 0) {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // delete handle for variable-handle drawing
                    selectedOne.deleteHandleAt(handleIdx)
                    selectedOne.setCurrHandleIdx(-1);
                    setSelectedDrawing(hitIdx);
                    setCursor(DEFAULT_CURSOR);

                } else {
                    // ready to drag handle 
                    selectedOne.setCurrHandleIdx(handleIdx);
                    setSelectedDrawing(hitIdx);
                    setCursor(HANDLE_CURSOR);
                }

            } else {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // insert handle for variable-handle drawing
                    const newHandleIdx = selectedOne.insertHandle(p(x, y))
                    selectedOne.setCurrHandleIdx(newHandleIdx);
                    setSelectedDrawing(hitIdx);
                    setCursor(HANDLE_CURSOR);

                } else {
                    // ready to drag whole drawing
                    selectedOne.recordHandlesWhenMousePressed(p(x, y))
                    selectedOne.setCurrHandleIdx(-1);
                    setSelectedDrawing(hitIdx);
                    setCursor(GRAB_CURSOR);
                }
            }

        } else {
            // not going to drag drawing or handle, it's ok to drag any other things if you want
            setMouseDownHitDrawing(undefined)
            if (selectedDrawing !== undefined) {
                drawings[selectedDrawing].setCurrHandleIdx(-1);
                setSelectedDrawing(undefined);
            }
        }
    }

    const onMouseMove = (e: React.MouseEvent) => {
        // console.log('mouse move', e.nativeEvent.offsetX, e.nativeEvent.offsetY)

        // Safety net: if the user released the mouse outside the browser/element
        // e.buttons === 1 means the primary (left) mouse button is pressed.
        if (isDragging.current && e.buttons !== 1) {
            isDragging.current = false;
            setCursor(DEFAULT_CURSOR);
            return;
        }

        e.stopPropagation();

        const [x, y] = translate(e)

        if (sketching && sketching.isCompleted === false) {
            if (sketching.isAnchored) {
                sketching.stretchCurrentHandle(p(x, y))

                // Force React to re-render so it picks up the mutated ref
                setSketchTick(tick => tick + 1);

                // also reset mouseMoveHitDrawing to avoid render with handles during updateChart()
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

                // Safety check in case state gets out of sync
                if (activeOne) {
                    if (activeOne.currHandleIdx >= 0) {
                        activeOne.stretchCurrentHandle(p(x, y));

                    } else {
                        activeOne.dragDrawing(p(x, y));
                    }
                }

                setDrawings(prev => [...prev]);
                setCursor(activeOne.currHandleIdx >= 0 ? HANDLE_CURSOR : GRAB_CURSOR);

            } else {
                setCursor(MOVE_CURSOR);
            }

        } else {
            // Process hover drawing. Search backwards so you select the top-most visual layer.
            const hoverIdx = drawings.findLastIndex(drawing => drawing.hits(x, y))
            if (hoverIdx >= 0) {
                // show with handles 
                setMouseMoveHitDrawing(hoverIdx)
                const hitOne = drawings[hoverIdx]

                const hoverHandle = hitOne.getHandleIdxAt(x, y)
                const cursor = hoverHandle >= 0
                    ? HANDLE_CURSOR
                    : e.ctrlKey
                        ? HANDLE_CURSOR  // ctrl + move means going to insert handle for variable-handle drawing, use HANDLE_CURSOR
                        : GRAB_CURSOR


                setCursor(cursor);

            } else {
                setMouseMoveHitDrawing(undefined);
                setCursor(DEFAULT_CURSOR);
            }
        }
    }

    // simulate single click only
    const onMouseUp = (e: React.MouseEvent) => {
        // console.log('mouse up', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        isDragging.current = false

        // Prevent the second click of a double-click from adding an extra point
        if (e.detail === 2) {
            return
        }

        const [x, y] = translate(e)

        let creating = sketching;
        if (creating === undefined) {
            if (createDrawingId) {
                creating = createDrawing(createDrawingId, xc, yc);
            }
        }

        if (creating && creating.isCompleted === false) {
            // completing new drawing
            const hasCompleted = creating.anchorHandle(p(x, y))

            if (hasCompleted || e.ctrlKey) {
                // is it a variable-handle drawing and ctrl + clicked? complete it 
                if (creating.nHandles === undefined && e.ctrlKey) {
                    creating.setIsCompleted(true);
                    creating.setIsAnchored(false);
                    creating.setCurrHandleIdx(-1);
                    // drop pre-created next handle, see anchorHandle(...)
                    creating.handles.pop()
                }

                setDrawings(prev => [...prev, creating]);
                setSelectedDrawing(drawings.length); // old drawing length is extract the index of latest drawing

                callback.resetDrawingIdsToCreate();

                setSketching(undefined)

            } else {
                setSketching(creating);
            }

            // Force React to re-render 
            setSketchTick(tick => tick + 1);
        }
    }

    const onMouseDoubleClick = (e: React.MouseEvent) => {
        //console.log('mouse doule clicked', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        if (e.detail === 2) {
            // Logic to finish variable-handle drawings (e.g. Polyline) via Double Click
            if (sketching && sketching.isCompleted === false && sketching.nHandles === undefined) {
                sketching.setIsCompleted(true);
                sketching.setIsAnchored(false);
                sketching.setCurrHandleIdx(-1);

                // Pop the floating preview handle
                if (sketching.handles.length > 1) {
                    sketching.handles.pop();
                }

                setDrawings(prev => [...prev, sketching]);
                setSelectedDrawing(drawings.length); // old drawing length is extract the index of latest drawing

                callback.resetDrawingIdsToCreate();
                setSketching(undefined);
                setSketchTick(tick => tick + 1);
            }
        }
    }

    const onMouseLeave = (_e: React.MouseEvent) => {
        if (!isDragging.current) {
            setMouseMoveHitDrawing(undefined);
            setCursor(DEFAULT_CURSOR);
        }
    }

    // Expose the internal functions to the parent via the ref
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
            onDoubleClick={onMouseDoubleClick}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
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