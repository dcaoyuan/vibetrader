import { TVar } from "../../timeseris/TVar";
import { ChartXControl } from "./ChartXControl";
import { type JSX, } from "react";

import type { PlotOptions } from "../plot/Plot";
import type { PineData } from "../../domain/PineData";
import type { ColorScheme } from "../../../App";
import type { CallbacksToContainer } from "./KlineViewContainer";

export type UpdateEvent = {
    chartUpdateTicker?: number,
    crosshairUpdateTicker?: number,

    xyMouse?: { who: string, x: number, y: number }
    deltaMouse?: { dx: number, dy: number }
    yScalar?: boolean
}

export type Indicator = {
    scriptName: string,
    tvar: TVar<PineData[]>,
    outputs: Output[],
    overlay?: boolean
}

export type Output = {
    atIndex: number,
    title: string,
    options: PlotOptions
}

export type UpdateDrawing = {
    createDrawingId?: string
    isHidingDrawing: boolean;
}

export interface ViewProps {
    name: string;
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    xc: ChartXControl;
    tvar: TVar<unknown>;
    colorScheme: ColorScheme;

    updateEvent: UpdateEvent;
    updateDrawing?: UpdateDrawing;

    // for indicator chart view's main indicator outputs
    mainIndicatorOutputs?: Output[]

    overlayIndicators?: Indicator[];

    callbacksToContainer?: CallbacksToContainer;
}

export interface ViewState {
    mouseCrosshair?: JSX.Element
    referCrosshair?: JSX.Element
}

export const AXISY_WIDTH = 55
export const CONTROL_HEIGHT = 12
export const TITLE_HEIGHT_PER_LINE = 14
