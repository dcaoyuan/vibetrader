import { Temporal } from "temporal-polyfill";
import { TUnit } from "./TUnit";

/**
 * Timeframe 
 * Class combining Unit and nUnits.
 * Try to implement a Primitive-like type.
 * Use modifies to define a lightweight class.
 *
 */
export class TFrame {
	static readonly SELF_DEFINED = new TFrame(TUnit.Second, 1);
	static readonly ONE_SEC = new TFrame(TUnit.Second, 1);
	static readonly TWO_SECS = new TFrame(TUnit.Second, 2);
	static readonly THREE_SECS = new TFrame(TUnit.Second, 3);
	static readonly FOUR_SECS = new TFrame(TUnit.Second, 3);
	static readonly FIVE_SECS = new TFrame(TUnit.Second, 5);
	static readonly FIFTEEN_SECS = new TFrame(TUnit.Second, 15);
	static readonly THIRTY_SECS = new TFrame(TUnit.Second, 30);
	static readonly ONE_MIN = new TFrame(TUnit.Minute, 1);
	static readonly TWO_MINS = new TFrame(TUnit.Minute, 2);
	static readonly THREE_MINS = new TFrame(TUnit.Minute, 3);
	static readonly FOUR_MINS = new TFrame(TUnit.Minute, 4);
	static readonly FIVE_MINS = new TFrame(TUnit.Minute, 5);
	static readonly FIFTEEN_MINS = new TFrame(TUnit.Minute, 15);
	static readonly THIRTY_MINS = new TFrame(TUnit.Minute, 30);
	static readonly ONE_HOUR = new TFrame(TUnit.Hour, 1);
	static readonly TWO_HOUR = new TFrame(TUnit.Hour, 2);
	static readonly FOUR_HOUR = new TFrame(TUnit.Hour, 4);
	static readonly DAILY = new TFrame(TUnit.Day, 1);
	static readonly TWO_DAYS = new TFrame(TUnit.Day, 2);
	static readonly THREE_DAYS = new TFrame(TUnit.Day, 3);
	static readonly FOUR_DAYS = new TFrame(TUnit.Day, 4);
	static readonly FIVE_DAYS = new TFrame(TUnit.Day, 5);
	static readonly WEEKLY = new TFrame(TUnit.Week, 1);
	static readonly MONTHLY = new TFrame(TUnit.Month, 1);
	static readonly THREE_MONTHS = new TFrame(TUnit.Month, 3);
	static readonly ONE_YEAR = new TFrame(TUnit.Year, 1);

	static readonly PREDEFINED = [
		TFrame.ONE_MIN,
		TFrame.THREE_MINS,
		TFrame.FIVE_MINS,
		TFrame.FIFTEEN_MINS,
		TFrame.THIRTY_MINS,
		TFrame.ONE_HOUR,
		TFrame.TWO_HOUR,
		TFrame.FOUR_HOUR,
		TFrame.DAILY,
		TFrame.WEEKLY,
		TFrame.MONTHLY,
	];

	static readonly #shortNamePattern = /([0-9]+)([sSmhHDdWwMYy])/;

	static ofName(shortName: string): TFrame | undefined {
		const match = shortName.match(TFrame.#shortNamePattern);
		if (match && match.length > 2) {
			const nUnits = parseInt(match[1]);
			const unit = TUnit.withShortName(match[2]);
			return new TFrame(unit, nUnits);

		} else {
			return undefined;
		}
	}

	static of(unit: TUnit, nUnit: number) {
		return new TFrame(unit, nUnit);
	}

	/**
	 * interval in milliseconds
	 */
	readonly interval: number;

	readonly name: string;
	readonly shortName: string;
	readonly compactName: string;


	constructor(
		public readonly unit: TUnit = TUnit.Day,
		public readonly nUnits: number = 1,
	) {
		this.interval = unit.interval * nUnits;
		this.shortName = nUnits + unit.shortName;
		this.compactName = nUnits + unit.compactName;
		if (nUnits === 1) {
			switch (unit) {
				case TUnit.Hour:
				case TUnit.Day:
				case TUnit.Week:
				case TUnit.Month:
				case TUnit.Year:
					this.name = unit.longName;
					break;

				default:
					this.name = nUnits + unit.compactName;
			}
		} else {
			this.name = nUnits + unit.compactName + "s";
		}
	}

	nextTime(fromTime: number, tzone: string): number {
		return this.unit.timeAfterNUnits(fromTime, this.nUnits, tzone);
	}

	prevTime(fromTime: number, tzone: string): number {
		return this.unit.timeAfterNUnits(fromTime, -this.nUnits, tzone)
	}

	timeAfterNTimeframes(fromTime: number, nTFrames: number, tzone: string): number {
		return this.unit.timeAfterNUnits(fromTime, this.nUnits * nTFrames, tzone);
	}

	timeBeforeNTimeframes(toTime: number, nTFrames: number, tzone: string): number {
		return this.unit.timeBeforeNUnits(toTime, this.nUnits * nTFrames, tzone);
	}

	nTimeframesBetween(fromTime: number, toTime: number, tzone: string): number {
		return Math.floor(this.unit.nUnitsBetween(fromTime, toTime, tzone) / this.nUnits);
	}

	/**
	 * round time to timeframe's begin 0
	 * @param time time in milliseconds from the epoch (1 January 1970 0:00 UTC)
	 * @param tzone string
	 */
	trunc(time: number, tzone: string): number {
		const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
		return this.truncDateTime(dt);
	}

	truncDateTime(dt: Temporal.ZonedDateTime): number {
		const offsetToLocalZeroOfDay = dt.offsetNanoseconds / 1000000; //cal.getTimeZone.getRawOffset + cal.get(Calendar.DST_OFFSET)
		return Math.floor((dt.epochMilliseconds + offsetToLocalZeroOfDay) / this.interval) * this.interval - offsetToLocalZeroOfDay
	}


	ceil(time: number, tzone: string): number {
		const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
		return this.ceilDateTime(dt);
	}

	ceilDateTime(dt: Temporal.ZonedDateTime): number {
		const trunced = this.truncDateTime(dt);
		return trunced + this.interval - 1;
	}

	/**
	 * @param timeA time in milliseconds from the epoch (1 January 1970 0:00 UTC)
	 * @param timeB time in milliseconds from the epoch (1 January 1970 0:00 UTC)
	 * @param tzone string
	 *
	 * @todo use nUnits
	 */
	sameInterval(timeA: number, timeB: number, tzone: string): boolean {
		const dtA = new Temporal.ZonedDateTime(BigInt(timeA) * TUnit.NANO_PER_MILLI, tzone);
		const dtB = new Temporal.ZonedDateTime(BigInt(timeB) * TUnit.NANO_PER_MILLI, tzone);

		switch (this.unit) {
			case TUnit.Week:
				return dtA.weekOfYear === dtB.weekOfYear;

			case TUnit.Month:
				return dtA.year === dtB.year && dtA.month === dtB.month;

			case TUnit.Year:
				return dtA.year === dtB.year;

			default:
				return this.truncDateTime(dtA) === this.truncDateTime(dtB);
		}
	}

	//   override 
	//   def equals(o: Any): Boolean = {
	//     o match {
	//       case x: TFrame => this.interval == x.interval
	//       case _ => false
	//   }
	// }

	// override 
	//   def hashCode: Int = {
	//     /** should let the equaled timeframes have the same hashCode, just like a Primitive type */
	//     (interval ^ (interval >>> 32)).toInt
	//   }

	// override 
	//   def clone: TFrame = {
	//   try {
	//     super.clone.asInstanceOf[TFrame]
	//   } catch {
	//     case ex: CloneNotSupportedException => ex.printStackTrace; null
	//     }
	// }

	compare(another: TFrame): number {
		if (this.unit.interval < another.unit.interval) {
			return -1;

		} else if (this.unit.interval > another.unit.interval) {
			return 1;

		} else {
			return this.nUnits < another.nUnits ? -1 : this.nUnits === another.nUnits ? 0 : 1;
		}
	}

}
