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

	static readonly #shortNamePattern = /([0-9]+)(mo|[sSmhHDdWwMYy])/;

	static ofName(shortName: string): TFrame | undefined {
		const match = shortName.match(TFrame.#shortNamePattern);
		if (match && match.length > 2) {
			const nUnits = parseInt(match[1]);
			const unit = match[2] === 'mo'
				? TUnit.Month
				: TUnit.withShortName(match[2]);
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

	nextTime(time: number, tzone: string): number {
		// For sub-daily intervals, pure math is still faster and perfectly accurate
		if (this.unit.interval < TUnit.ONE_DAY) {
			return time + this.interval;
		}

		// For Calendar units (Day, Week, Month, Year), use Temporal to avoid drift
		const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);

		switch (this.unit) {
			case TUnit.Year:
				return dt.add({ years: this.nUnits }).epochMilliseconds;

			case TUnit.Month:
				return dt.add({ months: this.nUnits }).epochMilliseconds;

			case TUnit.Week:
				return dt.add({ weeks: this.nUnits }).epochMilliseconds;

			case TUnit.Day:
				return dt.add({ days: this.nUnits }).epochMilliseconds;

			default:
				return time + this.interval; // Fallback
		}
	}

	prevTime(time: number, tzone: string): number {
		if (this.unit.interval < TUnit.ONE_DAY) {
			return time - this.interval;
		}

		const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);

		switch (this.unit) {
			case TUnit.Year:
				return dt.subtract({ years: this.nUnits }).epochMilliseconds;
			case TUnit.Month:
				return dt.subtract({ months: this.nUnits }).epochMilliseconds;
			case TUnit.Week:
				return dt.subtract({ weeks: this.nUnits }).epochMilliseconds;
			case TUnit.Day:
				return dt.subtract({ days: this.nUnits }).epochMilliseconds;
			default:
				return time - this.interval; // Fallback
		}
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
	 * Truncates a Temporal.ZonedDateTime to the start of the timeframe interval.
	 * Accounts for calendar boundaries (Months/Years) and nUnits multipliers.
	 */
	truncDateTime(dt: Temporal.ZonedDateTime): number {
		switch (this.unit) {
			case TUnit.Year: {
				const yearDiff = dt.year - 1970;
				const truncatedYear = 1970 + Math.floor(yearDiff / this.nUnits) * this.nUnits;
				return dt.with({
					year: truncatedYear, month: 1, day: 1,
					hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0
				}).epochMilliseconds;
			}

			case TUnit.Month: {
				const monthIndex = dt.month - 1;
				const truncatedMonthIndex = Math.floor(monthIndex / this.nUnits) * this.nUnits;
				return dt.with({
					month: truncatedMonthIndex + 1, day: 1,
					hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0
				}).epochMilliseconds;
			}

			case TUnit.Week: {
				const daysToSubtract = dt.dayOfWeek - 1; // Align to Monday
				const startOfWeek = dt.subtract({ days: daysToSubtract }).with({
					hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0
				});

				if (this.nUnits === 1) return startOfWeek.epochMilliseconds;

				// For multi-week, align based on weeks elapsed since Unix Epoch
				const epochWeeks = Math.floor(startOfWeek.epochMilliseconds / TUnit.ONE_WEEK);
				const truncatedWeeks = Math.floor(epochWeeks / this.nUnits) * this.nUnits;
				return truncatedWeeks * TUnit.ONE_WEEK;
			}

			case TUnit.Day: {
				const startOfDay = dt.with({
					hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0
				});

				if (this.nUnits === 1) return startOfDay.epochMilliseconds;

				// For multi-day, align based on days elapsed since Unix Epoch
				const epochDays = Math.floor(startOfDay.epochMilliseconds / TUnit.ONE_DAY);
				const truncatedDays = Math.floor(epochDays / this.nUnits) * this.nUnits;
				return truncatedDays * TUnit.ONE_DAY;
			}

			default:
				// Mathematical truncation for fixed sub-daily units (Hours, Minutes, Seconds)
				return Math.floor(dt.epochMilliseconds / this.interval) * this.interval;
		}
	}

	trunc(time: number, tzone: string = "UTC"): number {
		const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
		return this.truncDateTime(dt);
	}

	/**
	 * Ceils a Temporal.ZonedDateTime to the next timeframe interval boundary.
	 * If the time is exactly on a boundary, it returns that time.
	 */
	ceilDateTime(dt: Temporal.ZonedDateTime): number {
		const truncated = this.truncDateTime(dt);

		// If the timestamp is exactly on the interval boundary, no need to ceil
		if (truncated === dt.epochMilliseconds) {
			return truncated;
		}

		// Otherwise, add nUnits of the current unit to the truncated boundary
		const truncDt = new Temporal.ZonedDateTime(BigInt(truncated) * TUnit.NANO_PER_MILLI, dt.timeZoneId);

		switch (this.unit) {
			case TUnit.Year:
				return truncDt.add({ years: this.nUnits }).epochMilliseconds;
			case TUnit.Month:
				return truncDt.add({ months: this.nUnits }).epochMilliseconds;
			case TUnit.Week:
				return truncDt.add({ weeks: this.nUnits }).epochMilliseconds;
			case TUnit.Day:
				return truncDt.add({ days: this.nUnits }).epochMilliseconds;
			default:
				return truncated + this.interval;
		}
	}

	ceil(time: number, tzone: string = "UTC"): number {
		const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
		return this.ceilDateTime(dt);
	}

	/**
	 * Checks if two timestamps fall within the exact same timeframe interval bucket.
	 */
	sameInterval(timeA: number, timeB: number, tzone: string): boolean {
		const dtA = new Temporal.ZonedDateTime(BigInt(timeA) * TUnit.NANO_PER_MILLI, tzone);
		const dtB = new Temporal.ZonedDateTime(BigInt(timeB) * TUnit.NANO_PER_MILLI, tzone);

		// Because truncDateTime handles Calendar alignments and nUnits perfectly,
		// two times are in the same interval if they share the exact same truncated boundary.
		return this.truncDateTime(dtA) === this.truncDateTime(dtB);
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
