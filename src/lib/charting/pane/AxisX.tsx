import { TUnit } from "../../timeseris/TUnit";
import { ChartXControl } from "../view/ChartXControl";
import { Theme } from "../theme/Theme";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Temporal } from "temporal-polyfill";
import { Component, type JSX, type RefObject, } from "react";
import type { UpdateEvent } from "../view/ChartView";
import { textMetrics } from "../view/Format";
import React from "react";

const MIN_TICK_SPACING = 60 // in pixels

type Props = {
	id: string,
	x: number,
	y: number,
	xc: ChartXControl,
	width: number,
	height: number,
	updateEvent: UpdateEvent,
	up?: boolean
}

type State = {
	chart: JSX.Element,

	referCursor: JSX.Element,
	mouseCursor: JSX.Element,
}

class AxisX extends Component<Props, State> {
	ref: RefObject<SVGAElement>;
	font: string;

	constructor(props: Props) {
		super(props);

		this.ref = React.createRef();

		const chart = this.plot();
		this.state = { chart, referCursor: <></>, mouseCursor: <></> };

		console.log("AxisX render");
	}

	plot() {
		const hFont = 16;
		const nBars = this.props.xc.nBars

		const path = new Path;
		const texts = new Texts;

		// draw axis-x line 
		if (this.props.up) {
			path.moveto(0, this.props.height)
			path.lineto(this.props.width, this.props.height)

		} else {
			path.moveto(0, 0)
			path.lineto(this.props.width, 0)
		}

		const tzone = this.props.xc.baseSer.timezone;
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
			const time = this.props.xc.tb(i)
			currDt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
			if (prevDt !== undefined && (currDt.month !== prevDt.month || currDt.year !== prevDt.year)) {
				// new month begins
				const xTick = this.props.xc.xb(i);
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
			path.moveto(0, this.props.height);
			path.lineto(0, this.props.height - 8);

		} else {
			path.moveto(0, 0);
			path.lineto(0, 8);
		}

		return (
			<g className="axis">
				{path.render()}
				{texts.render()}
			</g>
		);
	}

	protected updateChart() {
		const chart = this.plot();
		this.updateState({ chart });
	}

	protected updateCursors() {
		this.updateState({});
	}

	protected updateState(state: object) {
		let referCursor: JSX.Element
		let mouseCursor: JSX.Element
		const referColor = '#00F0F0'; // 'orange'
		const mouseColor = '#00F000';
		const xc = this.props.xc;

		if (this.props.xc.isReferCursorEnabled) {
			const time = xc.tr(xc.referCursorRow)
			if (xc.occurred(time)) {
				const cursorX = xc.xr(xc.referCursorRow)

				referCursor = this.#plotCursor(cursorX, time, referColor)
			}
		}

		if (xc.isMouseCursorEnabled) {
			const time = xc.tr(xc.mouseCursorRow)
			const cursorX = xc.xr(xc.mouseCursorRow)
			mouseCursor = this.#plotCursor(cursorX, time, mouseColor)
		}

		this.setState({ ...state, referCursor, mouseCursor })
	}

	#plotCursor(x: number, time: number, color: string) {
		const w = 50; // annotation width
		const h = 13; // annotation height

		const x0 = x - 24;

		const tzone = this.props.xc.baseSer.timezone;
		const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
		const dtStr = this.props.xc.baseSer.timeframe.unit.formatNormalDate(dt, tzone)


		const axisxPath = new Path;
		const axisxTexts = new Texts
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
		axisxTexts.text(x0 + 1, this.props.up ? h - 1 : h + 4, dtStr);

		return (
			<g>
				{axisxPath.render({ key: 'axisx-tick', style: { stroke: color, fill: color } })}
				{axisxTexts.render({ key: 'axisx-annot', style: { fill: '#000000' } })}
			</g>
		)
	}

	render() {
		const transform = `translate(${this.props.x} ${this.props.y})`;

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
		if (this.props.updateEvent.changed !== prevProps.updateEvent.changed) {
			switch (this.props.updateEvent.type) {
				case 'chart':
					this.updateChart();
					break;

				case 'cursors':
					this.updateCursors();
					break;

				default:
			}
		}

		if (this.props.y !== prevProps.y) {
			this.updateChart();
		}
	}
}

export default AxisX;
