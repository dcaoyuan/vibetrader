import { ChartXControl } from "../view/ChartXControl";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Component, type JSX, type RefObject, } from "react";
import type { UpdateEvent } from "../view/chartviews";
import React from "react";
import { stringMetrics } from "../../utils";
import { H_HEADER, H_SPACING } from "../view/KlineViewContainer";

type Props = {
	id: string,
	x: number,
	y: number,
	xc: ChartXControl,
	width: number,
	height: number,
	up?: boolean
}

type State = {
	nothing?: boolean
}

class AxisX extends Component<Props, State> {
	ref: RefObject<SVGAElement>;
	font: string;

	dfY: Intl.DateTimeFormat
	dfYM: Intl.DateTimeFormat
	dfM: Intl.DateTimeFormat
	dfMD: Intl.DateTimeFormat
	dfD: Intl.DateTimeFormat
	dfH: Intl.DateTimeFormat
	dfm: Intl.DateTimeFormat

	dfCrosshair: Intl.DateTimeFormat

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

		this.dfM = new Intl.DateTimeFormat("en-US", {
			timeZone: tzone,
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
				this.dfCrosshair = new Intl.DateTimeFormat("en-US", {
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
				this.dfCrosshair = new Intl.DateTimeFormat("en-US", {
					timeZone: tzone,
					year: "numeric",
					month: "short",
					day: "numeric",
				});

		}

		console.log("AxisX render");
	}


	plot() {
		const ticks = this.props.xc.xTicks;

		const hFont = 16;

		const gridPath = new Path;
		const tickPath = new Path;
		const tickTexts = new Texts;

		// draw axis-x line 
		if (this.props.up) {
			tickPath
				.moveto(0, this.props.height)
				.lineto(this.props.width, this.props.height)

		} else {
			tickPath
				.moveto(0, 0)
				.lineto(this.props.width, 0)
		}

		const hTick = 4;
		for (let i = 0; i < ticks.length; i++) {
			const { dt, x, level } = ticks[i]
			if (this.props.up) {
				tickPath
					.moveto(x, hFont - 1)
					.lineto(x, hFont - hTick)

			} else {
				tickPath
					.moveto(x, 1)
					.lineto(x, hTick)

				gridPath
					.moveto(x, 0)
					.lineto(x, -this.props.y + H_SPACING + H_HEADER);
			}

			const date = new Date(dt.epochMilliseconds);
			let tickStr: string
			switch (level) {
				case "year":
					tickStr = this.dfY.format(date);
					break;

				case "month":
					tickStr = this.dfM.format(date);
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

			const metrics = stringMetrics(tickStr, this.font)
			const wTickStr = metrics.width;
			const xText = x - Math.round(wTickStr / 2);

			if (this.props.up) {
				tickTexts.text(xText, hFont - hTick, tickStr);

			} else {
				tickTexts.text(xText, hFont + 1, tickStr);
			}

		}

		// draw end line
		if (this.props.up) {
			tickPath
				.moveto(0, this.props.height)
				.lineto(0, this.props.height - 8);

		} else {
			tickPath
				.moveto(0, 0)
				.lineto(0, 8);
		}

		return (
			<>
				<g className="axis">
					{tickPath.render({ style: { stroke: '#393939', fill: '#393939', strokeWidth: '0.7px' } })}
					{tickTexts.render({ style: { fill: '#393939', fontSize: '12px' } })}
				</g>
				<g className="grid" >
					{gridPath.render({ style: { stroke: '#39393959', fill: '#39393959', strokeWidth: '0.5px' } })}
				</g>
			</>
		);
	}

	protected crosshair() {
		let referCrosshair: JSX.Element
		let mouseCrosshair: JSX.Element
		const xc = this.props.xc;

		if (this.props.xc.isReferCrosshairEnabled) {
			const time = xc.tr(xc.referCrosshairRow)
			if (xc.occurred(time)) {
				const crosshairX = xc.xr(xc.referCrosshairRow)

				referCrosshair = this.plotCrosshair(crosshairX, time, 'annot-refer')
			}
		}

		if (xc.isMouseCrosshairEnabled) {
			const time = xc.tr(xc.mouseCrosshairRow)
			const crosshairX = xc.xr(xc.mouseCrosshairRow)
			mouseCrosshair = this.plotCrosshair(crosshairX, time, 'annot-mouse')
		}

		return { referCrosshair, mouseCrosshair };
	}

	plotCrosshair(x: number, time: number, className: string) {
		const h = 13; // annotation height

		const dtStr = this.dfCrosshair.format(new Date(time))

		const metrics = stringMetrics(dtStr, this.font)
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
		const axis = this.plot();

		const { referCrosshair, mouseCrosshair } = this.crosshair()

		const transform = `translate(${this.props.x} ${this.props.y})`;
		return (
			<g transform={transform} ref={this.ref}>
				{axis}
				{referCrosshair}
				{mouseCrosshair}
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
}

export default AxisX;
