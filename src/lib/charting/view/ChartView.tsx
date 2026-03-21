import { TVar } from "../../timeseris/TVar";
import { ChartXControl } from "./ChartXControl";
import { ChartYControl } from "./ChartYControl";
import { Component, type JSX, type RefObject } from "react";

import React from "react";

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


/**
 * All ChartViews shares the same x-control, have the same cursor behaves.
 *
 */
export abstract class ChartView<P extends ViewProps, S extends ViewState> extends Component<P, S> {
    static readonly AXISY_WIDTH = 55
    static readonly CONTROL_HEIGHT = 12
    static readonly TITLE_HEIGHT_PER_LINE = 14

    yc: ChartYControl;

    ref: RefObject<SVGAElement>;
    font: string;

    // share same xc through all views that are in the same viewcontainer.
    constructor(props: P) {
        super(props)

        this.yc = new ChartYControl(props.xc.baseSer, props.height);

        this.ref = React.createRef();
    }

    /**
     * What may affect the geometry:
     * 1. the size of this component changed;
     * 3. the ser's value changed or items added, which need computeMaxMin();
     *
     * The control only define wBar (the width of each bar), this component
     * will calculate number of bars according to its size. If you need more
     * bars to display, such as an appointed newNBars, you should compute the size of
     * this's container, and call container.setBounds() to proper size, then, the
     * layout manager will layout the size of its ChartView instances automatically,
     * and if success, the newNBars computed here will equals the newNBars you want.
     */
    protected computeGeometry(atleastMinValue?: number) {
        const [maxValue, minValue] = this.computeMaxValueMinValue();

        // compute y-geometry according to maxmin
        this.yc.computeGeometry(maxValue, atleastMinValue !== undefined ? Math.min(minValue, atleastMinValue) : minValue)
    }

    wChart(): number {
        return this.props.width - ChartView.AXISY_WIDTH;
    }

    computeMaxValueMinValue() {
        // if no need maxValue/minValue, don't let them all equal 0, just set to 1 and 0 
        return [1, 0];
    }

    // return `value !== undefined` to show cursor value of time
    abstract valueAtTime(time: number): number

    override componentDidMount(): void {
        if (this.ref.current) {
            const computedStyle = window.getComputedStyle(this.ref.current);
            const fontSize = computedStyle.getPropertyValue('font-size');
            const fontFamily = computedStyle.getPropertyValue('font-family');

            this.font = fontSize + ' ' + fontFamily;
        }
    }
}

