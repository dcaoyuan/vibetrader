import { forwardRef, Fragment, useImperativeHandle, useRef, useState, type JSX, type SetStateAction } from "react";
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


    const mouseDownHitDrawing = useRef<number>(undefined);

    // const creatingDrawing = useRef<Drawing>(undefined)
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
            ? valueOrUpdater(selectedDrawing)
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
        setSelectedDrawing(_currentSelected => {
            return undefined;
        });
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
        const hitDrawingIdx = drawings.findLastIndex(drawing => drawing.hits(x, y))
        if (hitDrawingIdx >= 0) {
            // record the mouseDownHitDrawingIdx for dragging decision
            setMouseDownHitDrawing(hitDrawingIdx);

            const selectedOne = drawings[hitDrawingIdx]

            const handleIdx = selectedOne.getHandleIdxAt(x, y)
            if (handleIdx >= 0) {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // delete handle for variable-handle drawing
                    selectedOne.deleteHandleAt(handleIdx)

                    selectedOne.setCurrHandleIdx(-1);

                    setSelectedDrawing(hitDrawingIdx);
                    setCursor(DEFAULT_CURSOR);

                } else {
                    // ready to drag handle 
                    selectedOne.setCurrHandleIdx(handleIdx);

                    setSelectedDrawing(hitDrawingIdx);
                    setCursor(HANDLE_CURSOR);
                }

            } else {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // insert handle for variable-handle drawing
                    const newHandleIdx = selectedOne.insertHandle(p(x, y))

                    selectedOne.setCurrHandleIdx(newHandleIdx);

                    setSelectedDrawing(hitDrawingIdx);

                    setCursor(HANDLE_CURSOR);

                } else {
                    // ready to drag whole drawing
                    selectedOne.recordHandlesWhenMousePressed(p(x, y))

                    selectedOne.setCurrHandleIdx(-1);

                    setSelectedDrawing(hitDrawingIdx);
                    setCursor(GRAB_CURSOR);
                }
            }

        } else {
            // not going to drag drawing (and handle), it's ok to drag any other things if you want

            setMouseDownHitDrawing(undefined)

            if (selectedDrawing !== undefined) {
                drawings[selectedDrawing].setCurrHandleIdx(-1);
            }
        }
    }

    const onMouseMove = (e: React.MouseEvent) => {
        // console.log('mouse move', e.nativeEvent.offsetX, e.nativeEvent.offsetY, createDrawing)
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
            const activeDragIdx = mouseDownHitDrawing.current;

            if (activeDragIdx !== undefined) {
                const selectedOne = drawings[activeDragIdx];

                if (selectedOne.currHandleIdx >= 0) {
                    selectedOne.stretchCurrentHandle(p(x, y));

                } else {
                    selectedOne.dragDrawing(p(x, y));
                }

                setDrawings(prev => [...prev]);
                setCursor(selectedOne.currHandleIdx >= 0 ? HANDLE_CURSOR : GRAB_CURSOR);

            } else {
                setCursor(MOVE_CURSOR);
            }

        } else {
            // Process drawing is hit by mouse. Search backwards so you select the top-most visual layer.
            const hitDrawingIdx = drawings.findLastIndex(drawing => drawing.hits(x, y))
            if (hitDrawingIdx >= 0) {
                // show with handles 
                setMouseMoveHitDrawing(hitDrawingIdx)
                const hitOne = drawings[hitDrawingIdx]

                const handleIdx = hitOne.getHandleIdxAt(x, y)
                const cursor = handleIdx >= 0
                    ? HANDLE_CURSOR
                    : e.ctrlKey ? HANDLE_CURSOR : GRAB_CURSOR
                // ctrl + move means going to insert handle for variable-handle drawing, use HANDLE_CURSOR

                setCursor(cursor);

            } else {
                // previously drawing marked hit? show without handles if it's not the selected one
                if (mouseMoveHitDrawing !== undefined && mouseMoveHitDrawing >= 0 /* && mouseMoveHitDrawingIdx !== selectedDrawing */) {
                    setMouseMoveHitDrawing(undefined);

                    setCursor(DEFAULT_CURSOR);

                } else {
                    setCursor(DEFAULT_CURSOR);
                }

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
            const isCompleted = creating.anchorHandle(p(x, y))

            if (isCompleted || e.ctrlKey) {
                // is it a variable-handle drawing and ctrl + clicked? complete it 
                if (creating.nHandles === undefined && e.ctrlKey) {
                    creating.setIsCompleted(true);
                    creating.setIsAnchored(false);
                    creating.setCurrHandleIdx(-1);
                    // drop pre-created next handle, see anchorHandle(...)
                    creating.handles.pop()
                }

                const newDrawings = [...drawings, creating];
                setDrawings(newDrawings);

                callback.resetDrawingIdsToCreate();

                // reset creating
                creating = undefined;

                // set it as new selected one
                setSelectedDrawing(newDrawings.length - 1);
            }

            setSketching(creating);

            // Force React to re-render so it picks up the mutated ref
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

                const newDrawings = [...drawings, sketching];
                setDrawings(newDrawings);

                callback.resetDrawingIdsToCreate();
                setSketching(undefined);
                setSelectedDrawing(newDrawings.length - 1);
                setSketchTick(tick => tick + 1);
            }
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

    const sketchingLines = (sketching && !sketching.isCompleted)
        ? sketching.renderDrawingWithHandles("sketching")
        : <></>;

    // console.log("DrawingLayer Render Cycle! Selected is now:", selectedDrawing, mouseMoveHitDrawing);

    return (
        <g
            onDoubleClick={onMouseDoubleClick}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
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

export default DrawingLayer