import { Temporal } from "temporal-polyfill";
import { TUnit } from "./TUnit";

/**
 * Class combining Unit and nUnits.
 * Try to implement a Primitive-like type.
 * Use modifies to define a lightweight class.
 *
 * This class is better to be treated as a <b>value</b> class, so, using:
 *   <code>freq = anotherFreq.clone()</code>
 * instead of:
 *   <code>freq = anotherFreq</code>
 * is always more safe.
 *
 */
export class TFreq {
  static readonly SELF_DEFINED = new TFreq(TUnit.Second, 1);
  static readonly ONE_SEC = new TFreq(TUnit.Second, 1);
  static readonly TWO_SECS = new TFreq(TUnit.Second, 2);
  static readonly THREE_SECS = new TFreq(TUnit.Second, 3);
  static readonly FOUR_SECS = new TFreq(TUnit.Second, 3);
  static readonly FIVE_SECS = new TFreq(TUnit.Second, 5);
  static readonly FIFTEEN_SECS = new TFreq(TUnit.Second, 15);
  static readonly THIRTY_SECS = new TFreq(TUnit.Second, 30);
  static readonly ONE_MIN = new TFreq(TUnit.Minute, 1);
  static readonly TWO_MINS = new TFreq(TUnit.Minute, 2);
  static readonly THREE_MINS = new TFreq(TUnit.Minute, 3);
  static readonly FOUR_MINS = new TFreq(TUnit.Minute, 4);
  static readonly FIVE_MINS = new TFreq(TUnit.Minute, 5);
  static readonly FIFTEEN_MINS = new TFreq(TUnit.Minute, 15);
  static readonly THIRTY_MINS = new TFreq(TUnit.Minute, 30);
  static readonly ONE_HOUR = new TFreq(TUnit.Hour, 1);
  static readonly DAILY = new TFreq(TUnit.Day, 1);
  static readonly TWO_DAYS = new TFreq(TUnit.Day, 2);
  static readonly THREE_DAYS = new TFreq(TUnit.Day, 3);
  static readonly FOUR_DAYS = new TFreq(TUnit.Day, 4);
  static readonly FIVE_DAYS = new TFreq(TUnit.Day, 5);
  static readonly WEEKLY = new TFreq(TUnit.Week, 1);
  static readonly MONTHLY = new TFreq(TUnit.Month, 1);
  static readonly THREE_MONTHS = new TFreq(TUnit.Month, 3);
  static readonly ONE_YEAR = new TFreq(TUnit.Year, 1);

  static readonly PREDEFINED = [
    TFreq.ONE_MIN,
    TFreq.TWO_MINS,
    TFreq.THREE_MINS,
    TFreq.FOUR_MINS,
    TFreq.FIVE_MINS,
    TFreq.FIFTEEN_MINS,
    TFreq.THIRTY_MINS,
    TFreq.DAILY,
    TFreq.TWO_DAYS,
    TFreq.THREE_DAYS,
    TFreq.FOUR_DAYS,
    TFreq.FIVE_DAYS,
    TFreq.WEEKLY,
    TFreq.MONTHLY,
  ];

  static readonly #shortNamePattern = /([0-9]+)([smhDWMY])/g;

  static ofName(shortName: string): TFreq | undefined {
    const match = shortName.match(TFreq.#shortNamePattern);
    if (match && match.length > 2) {
      const nUnits = parseInt(match[1]);
      const unit = TUnit.withShortName(match[2]);
      return new TFreq(unit, nUnits);

    } else {
      return undefined;
    }
  }

  static of(unit: TUnit, nUnit: number) {
    return new TFreq(unit, nUnit);
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

  nextTime(fromTime: number, timeZone: string): number {
    return this.unit.timeAfterNUnits(fromTime, this.nUnits, timeZone);
  }

  prevTime(fromTime: number, timeZone: string): number {
    return this.unit.timeAfterNUnits(fromTime, -this.nUnits, timeZone)
  }

  timeAfterNFreqs(fromTime: number, nFreqs: number, timeZone: string): number {
    return this.unit.timeAfterNUnits(fromTime, this.nUnits * nFreqs, timeZone);
  }

  nFreqsBetween(fromTime: number, toTime: number, timeZone: string): number {
    return Math.floor(this.unit.nUnitsBetween(fromTime, toTime, timeZone) / this.nUnits);
  }

  /**
   * round time to freq's begin 0
   * @param time time in milliseconds from the epoch (1 January 1970 0:00 UTC)
   * @param timeZone string
   */
  trunc(time: number, timeZone: string): number {
    const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
    return this.truncDateTime(dt);
  }

  truncDateTime(dt: Temporal.ZonedDateTime): number {
    const offsetToLocalZeroOfDay = dt.offsetNanoseconds / 1000000; //cal.getTimeZone.getRawOffset + cal.get(Calendar.DST_OFFSET)
    return Math.floor((dt.epochMilliseconds + offsetToLocalZeroOfDay) / this.interval) * this.interval - offsetToLocalZeroOfDay
  }


  ceil(time: number, timeZone: string): number {
    const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
    return this.ceilDateTime(dt);
  }

  ceilDateTime(dt: Temporal.ZonedDateTime): number {
    const trunced = this.truncDateTime(dt);
    return trunced + this.interval - 1;
  }

  /**
   * @param timeA time in milliseconds from the epoch (1 January 1970 0:00 UTC)
   * @param timeB time in milliseconds from the epoch (1 January 1970 0:00 UTC)
   * @param timeZone string
   *
   * @todo use nUnits
   */
  sameInterval(timeA: number, timeB: number, timeZone: string): boolean {
    const dtA = new Temporal.ZonedDateTime(BigInt(timeA) * TUnit.NANO_PER_MILLI, timeZone);
    const dtB = new Temporal.ZonedDateTime(BigInt(timeB) * TUnit.NANO_PER_MILLI, timeZone);

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
  //       case x: TFreq => this.interval == x.interval
  //       case _ => false
  //   }
  // }

  // override 
  //   def hashCode: Int = {
  //     /** should let the equaled frequencies have the same hashCode, just like a Primitive type */
  //     (interval ^ (interval >>> 32)).toInt
  //   }

  // override 
  //   def clone: TFreq = {
  //   try {
  //     super.clone.asInstanceOf[TFreq]
  //   } catch {
  //     case ex: CloneNotSupportedException => ex.printStackTrace; null
  //     }
  // }

  compare(another: TFreq): number {
    if (this.unit.interval < another.unit.interval) {
      return -1;

    } else if (this.unit.interval > another.unit.interval) {
      return 1;

    } else {
      return this.nUnits < another.nUnits ? -1 : this.nUnits === another.nUnits ? 0 : 1;
    }
  }

}
