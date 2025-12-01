import { TUnit } from "../../timeseris/TUnit";
import { ChartXControl } from "../view/ChartXControl";
import { Theme } from "../theme/Theme";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";
import { Component, createRef, useEffect, type JSX, type Ref, type RefObject, } from "react";
import type { RefreshCursor } from "../view/ChartView";
import { textMetrics } from "../view/Format";
import React from "react";

const MIN_TICK_SPACING = 60 // in pixels

type Props = {
	id: number,
	x: number,
	y: number,
	xc: ChartXControl,
	width: number,
	height: number,
	refreshChart: number,
	refreshCursors: RefreshCursor,
	up?: boolean
}

type State = {
	chart: JSX.Element,

	referCursor: JSX.Element,
	mouseCursor: JSX.Element,
}

class AxisX extends Component<Props, State> {
	xc: ChartXControl;
	x: number;
	y: number;
	width: number;
	height: number;
	ref: RefObject<SVGAElement>;
	font: string;

	constructor(props: Props) {
		super(props);
		this.xc = props.xc;
		this.x = props.x || 0;
		this.y = props.y;
		this.width = props.width;
		this.height = props.height;

		this.ref = React.createRef();

		const chart = this.plot();
		this.state = { chart, referCursor: <></>, mouseCursor: <></> };

		console.log("AxisX render");
	}

	plot() {
		const hFont = 16;
		const nBars = this.xc.nBars

		const color = Theme.now().axisColor;
		const path = new Path(color);
		const texts = new Texts(color);

		// draw axis-x line 
		if (this.props.up) {
			path.moveto(0, this.height)
			path.lineto(this.width, this.height)

		} else {
			path.moveto(0, 0)
			path.lineto(this.width, 0)
		}

		const tzone = this.xc.baseSer.timezone;
		let prevDt: Temporal.ZonedDateTime;
		let currDt: Temporal.ZonedDateTime;
		let prevXTick: number;
		let currXTick: number;

		const dfYM = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
			year: "numeric",
			month: "short",
		});

		const dfY = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
			year: "numeric",
		});


		const hTick = 4;
		for (let i = 1; i <= nBars; i++) {
			const time = this.xc.tb(i)
			currDt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
			if (prevDt !== undefined && (currDt.month !== prevDt.month || currDt.year !== prevDt.year)) {
				// new month begins
				const xTick = this.xc.xb(i);
				currXTick = xTick;

				if (prevXTick === undefined || currXTick - prevXTick > MIN_TICK_SPACING) {
					if (this.props.up) {
						path.moveto(xTick, hFont - 1)
						path.lineto(xTick, hFont - hTick)

					} else {
						path.moveto(xTick, 1)
						path.lineto(xTick, hTick)
					}

					const date = new Date(currDt.epochMilliseconds);
					const tickStr = (currDt.year !== prevDt.year) ? dfY.format(date) : dfYM.format(date);
					const wTickStr = textMetrics(tickStr, this.font).width;
					const xText = xTick - Math.round(wTickStr / 2);

					if (this.props.up) {
						texts.text(xText, hFont - hTick, tickStr);

					} else {
						texts.text(xText, hFont + 1, tickStr);
					}

					prevXTick = currXTick;
				}
			}

			prevDt = currDt;
		}

		// draw end line
		if (this.props.up) {
			path.moveto(0, this.height);
			path.lineto(0, this.height - 8);

		} else {
			path.moveto(0, 0);
			path.lineto(0, 8);
		}

		return (
			<>
				<g shapeRendering="crispEdges" >
					{path.render('axisx-tick')}
				</g>
				<g key='texts'>
					{texts.render('axisx-text')}
				</g>
			</>
		);
	}

	protected updateChart() {
		// clear mouse cursor and prev value
		this.xc.isMouseCuroseVisible = false;

		const chart = this.plot();
		this.updateState({ chart });
	}

	protected updateCursors() {
		this.updateState({});
	}

	protected updateState(state: object) {
		let referCursor = <></>
		let mouseCursor = <></>
		const referColor = '#00F0F0'; // 'orange'
		const mouseColor = '#00F000';

		if (this.xc.isReferCuroseVisible) {
			const time = this.xc.tr(this.xc.referCursorRow)
			if (this.xc.occurred(time)) {
				const cursorX = this.xc.xr(this.xc.referCursorRow)

				referCursor = this.#plotCursor(cursorX, time, referColor)
			}
		}

		if (this.xc.isMouseCuroseVisible) {
			const time = this.xc.tr(this.xc.mouseCursorRow)
			if (this.xc.occurred(time)) {
				const cursorX = this.xc.xr(this.xc.mouseCursorRow)

				mouseCursor = this.#plotCursor(cursorX, time, mouseColor)
			}
		}

		this.setState({ ...state, referCursor, mouseCursor })
	}

	#plotCursor(x: number, time: number, color: string) {
		const w = 50; // annotation width
		const h = 13; // annotation height

		const x0 = x - 24;

		const tzone = this.xc.baseSer.timezone;
		const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
		const dtStr = this.xc.baseSer.timeframe.unit.formatNormalDate(dt, tzone)


		const axisxText = new Texts('#000000')
		const axisxPath = new Path(color, color);
		const y0 = this.props.up ? 1 : 6;
		// draw arrow
		axisxPath.moveto(x - 3, y0);
		axisxPath.lineto(x, 0);
		axisxPath.lineto(x + 3, y0)

		axisxPath.moveto(x0, y0);
		axisxPath.lineto(x0 + w, y0);
		axisxPath.lineto(x0 + w, y0 + h);
		axisxPath.lineto(x0, y0 + h);
		axisxPath.closepath();
		axisxText.text(x0 + 1, this.props.up ? h - 1 : h + 4, dtStr);

		return (
			<g>
				{axisxPath.render('axisx-tick')}
				{axisxText.render('axisx-annot')}
			</g>
		)
	}

	render() {
		const transform = `translate(${this.x} ${this.y})`;

		return (
			<g transform={transform} ref={this.ref}>
				{this.state.chart}
				{this.state.referCursor}
				{this.state.mouseCursor}
			</g >
		)
	}

	// Code to run after initial render, equivalent to useEffect with an 
	// empty dependency array ([])
	override componentDidMount() {
		if (this.ref.current) {
			const computedStyle = window.getComputedStyle(this.ref.current);
			const fontSize = computedStyle.getPropertyValue('font-size');
			const fontFamily = computedStyle.getPropertyValue('font-family');

			this.font = fontSize + ' ' + fontFamily;
		}
	}

	// Important: Be careful when calling setState within componentDidUpdate
	// Ensure you have a conditional check to prevent infinite re-renders.
	// If setState is called unconditionally, it will trigger another update,
	// potentially leading to a loop.
	override componentDidUpdate(prevProps: Props, prevState: State) {
		if (this.props.refreshChart !== prevProps.refreshChart) {
			this.updateChart();
		}

		if (this.props.refreshCursors.changed !== prevProps.refreshCursors.changed) {
			this.updateCursors();
		}
	}
}

export default AxisX;
