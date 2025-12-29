import { TUnit } from "../../timeseris/TUnit";
import { ChartXControl } from "../view/ChartXControl";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Temporal } from "temporal-polyfill";
import { Component, type JSX, type RefObject, } from "react";
import type { UpdateEvent } from "../view/ChartView";
import { textMetrics } from "../view/Format";
import React from "react";

const MIN_TICK_SPACING = 100 // in pixels

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

const locatorDict = {
	year: [
		[0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
		[0, 2, 4, 6, 8],
		[0, 5, 10],
		[0, 5],
	],
	month: [
		[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		[4, 7, 10],
		[6],
	],
	week: [
		[0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
		[0, 2, 4, 6, 8],
		[0, 5, 10],
		[0, 5],
	],
	day: [
		[5, 10, 15, 20, 25],
		[10, 20],
		[15],
	],
	hour: [
		[3, 6, 9, 12, 15, 18, 21],
		[6, 12, 18],
		[12],
	],
	minute: [
		[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
		[10, 20, 30, 40, 50, 60],
		[15, 30, 45, 60],
		[30, 60],
	],
}

type Tick = {
	dt: Temporal.ZonedDateTime,
	x: number,
	kind: "year" | "month" | "week" | "day" | "hour" | "minute"
}

function fillTicks(existedTicks: Tick[], newTicks: Tick[], level: string, wChart: number): Tick[] {
	const nTicks = Math.round(wChart / MIN_TICK_SPACING);

	// Find the lowest level ticks first 
	if (existedTicks.length < 2) {
		const locators = locatorDict[level]
		let i = 0;
		while (i < locators.length) {
			const locator = locators[i]
			let count = 0
			for (const tick of newTicks) {
				const value = level === "year" || level === "week"
					? tick.dt[level] % 10
					: tick.dt[level]

				if (locator.includes(value)) {
					count++
				}
			}

			if (count < nTicks) {
				for (const tick of newTicks) {
					const value = level === "year" || level === "week"
						? tick.dt[level] % 10
						: tick.dt[level]

					if (locator.includes(value)) {
						existedTicks.push(tick)
					}

				}
				break
			}

			i++
		}

	} else {
		// just dump upper level ticks after lowest found.
		existedTicks = existedTicks.concat(newTicks)
	}

	return existedTicks.sort((a, b) => a.x - b.x);
}

class AxisX extends Component<Props, State> {
	ref: RefObject<SVGAElement>;
	font: string;

	dfY: Intl.DateTimeFormat
	dfYM: Intl.DateTimeFormat
	dfMD: Intl.DateTimeFormat
	dfD: Intl.DateTimeFormat
	dfH: Intl.DateTimeFormat
	dfm: Intl.DateTimeFormat

	dfCursor: Intl.DateTimeFormat

	constructor(props: Props) {
		super(props);

		this.ref = React.createRef();

		const tzone = props.xc.baseSer.timezone
		const tframe = props.xc.baseSer.timeframe

		this.dfY = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
			year: "numeric",
		});

		this.dfYM = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
			year: "numeric",
			month: "short",
		});

		this.dfMD = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
			month: "short",
			day: "numeric",
		});

		this.dfD = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
			day: "numeric",
		});

		this.dfH = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		this.dfm = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		switch (tframe.unit.shortName) {
			case "m":
			case "h":
				this.dfCursor = new Intl.DateTimeFormat("en-US", {
					timeZone: tzone,
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				});

				break

			case "D":
			case "W":
			case "M":
			case "Y":
				this.dfCursor = new Intl.DateTimeFormat("en-US", {
					timeZone: tzone,
					year: "numeric",
					month: "short",
					day: "numeric",
				});

		}

		const chart = this.plot();
		this.state = { chart, referCursor: <></>, mouseCursor: <></> };

		console.log("AxisX render");
	}


	plot() {
		const nBars = this.props.xc.nBars

		const tzone = this.props.xc.baseSer.timezone;
		const tframe = this.props.xc.baseSer.timeframe.shortName;
		let prevDt: Temporal.ZonedDateTime;

		const yTicks: Tick[] = []
		const MTicks: Tick[] = []
		const WTicks: Tick[] = []
		const dTicks: Tick[] = []
		const hTicks: Tick[] = []
		const mTicks: Tick[] = []

		const minute_locator = locatorDict['minute'][0]
		for (let i = 1; i <= nBars; i++) {
			const time = this.props.xc.tb(i)
			const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
			const x = this.props.xc.xb(i);

			if (prevDt !== undefined) {
				if (dt.year !== prevDt.year) {
					yTicks.push({ dt, x, kind: "year" })

				} else if (dt.month !== prevDt.month) {
					MTicks.push({ dt, x, kind: "month" })

				} else if (dt.day !== prevDt.day) {
					dTicks.push({ dt, x, kind: "day" })

				} else if (dt.hour !== prevDt.hour) {
					hTicks.push({ dt, x, kind: "hour" })

				} else if (dt.minute !== prevDt.minute && minute_locator.includes(dt.minute)) {
					mTicks.push({ dt, x, kind: "minute" })
				}

				if (tframe === '1W') {
					if (dt.weekOfYear !== prevDt.weekOfYear) {
						WTicks.push({ dt, x, kind: "week" })
					}
				}
			}

			prevDt = dt;
		}

		let ticks: Tick[] = []
		if (tframe !== "1W") {
			ticks = fillTicks(ticks, mTicks, "minute", this.props.xc.wChart);
			ticks = fillTicks(ticks, hTicks, "hour", this.props.xc.wChart);
			ticks = fillTicks(ticks, dTicks, "day", this.props.xc.wChart);

		} else {
			ticks = fillTicks(ticks, WTicks, "week", this.props.xc.wChart);
		}

		ticks = fillTicks(ticks, MTicks, "month", this.props.xc.wChart);
		ticks = fillTicks(ticks, yTicks, "year", this.props.xc.wChart);

		// --- path and texts
		const hFont = 16;

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

		const hTick = 4;
		prevDt = undefined
		for (let i = 0; i < ticks.length; i++) {
			const { dt, x, kind } = ticks[i]
			if (this.props.up) {
				path.moveto(x, hFont - 1)
				path.lineto(x, hFont - hTick)

			} else {
				path.moveto(x, 1)
				path.lineto(x, hTick)
			}

			const date = new Date(dt.epochMilliseconds);
			let tickStr: string
			switch (kind) {
				case "year":
					tickStr = this.dfY.format(date);
					break;

				case "month":
					tickStr = this.dfYM.format(date);
					break;

				case "week":
				case "day":
					tickStr = this.dfD.format(date);
					break

				case "hour":
					tickStr = this.dfH.format(date);
					break

				case "minute":
					tickStr = this.dfm.format(date);
					break

				default:
					tickStr = this.dfm.format(date);
			}

			const wTickStr = textMetrics(tickStr, this.font).width;
			const xText = x - Math.round(wTickStr / 2);

			if (this.props.up) {
				texts.text(xText, hFont - hTick, tickStr);

			} else {
				texts.text(xText, hFont + 1, tickStr);
			}

			prevDt = dt
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
		const xc = this.props.xc;

		if (this.props.xc.isReferCursorEnabled) {
			const time = xc.tr(xc.referCursorRow)
			if (xc.occurred(time)) {
				const cursorX = xc.xr(xc.referCursorRow)

				referCursor = this.#plotCursor(cursorX, time, 'annot-refer')
			}
		}

		if (xc.isMouseCursorEnabled) {
			const time = xc.tr(xc.mouseCursorRow)
			const cursorX = xc.xr(xc.mouseCursorRow)
			mouseCursor = this.#plotCursor(cursorX, time, 'annot-mouse')
		}

		this.setState({ ...state, referCursor, mouseCursor })
	}

	#plotCursor(x: number, time: number, className: string) {
		const h = 13; // annotation height

		const dtStr = this.dfCursor.format(new Date(time))

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		ctx.font = this.font;
		const metrics = ctx.measureText(dtStr);
		const w = metrics.width + 3
		const x0 = x - w / 2;

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
		axisxTexts.text(x0 + 2, this.props.up ? h - 1 : h + 4, dtStr);

		return (
			<g className={className}>
				{axisxPath.render()}
				{axisxTexts.render()}
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
