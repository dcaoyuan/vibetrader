import { Temporal } from "temporal-polyfill";

/**
 * As Unit is enum, which actually is a kind of singleton, so delcare a
 * none static Calendar instance here also means an almost static instance,
 * so, if we declare class scope instance of Calendar in enum, we should also
 * synchronized each method that uses this instance or declare the cal
 * instance as volatile to share this instance by threads.
 */
export class TUnit {
    static readonly NANO_PER_MILLI = BigInt(1000000);

    /**
     * Interval of each Unit
     */
    static readonly ONE_SECOND = 1000;
    static readonly ONE_MINUTE = 60 * TUnit.ONE_SECOND;
    static readonly ONE_HOUR = 60 * TUnit.ONE_MINUTE;
    static readonly ONE_DAY = 24 * TUnit.ONE_HOUR;
    static readonly ONE_WEEK = 7 * TUnit.ONE_DAY;
    static readonly ONE_MONTH = 30 * TUnit.ONE_DAY;
    static readonly ONE_YEAR = Math.floor(365.24 * TUnit.ONE_DAY);

    static readonly Second = new TUnit(TUnit.ONE_SECOND, "Second", "s", "Sec", "Second");
    static readonly Minute = new TUnit(TUnit.ONE_MINUTE, "Minute", "m", "Min", "Minute");
    static readonly Hour = new TUnit(TUnit.ONE_HOUR, "Hour", "h", "Hour", "Hourly");
    static readonly Day = new TUnit(TUnit.ONE_DAY, "Day", "D", "Day", "Daily");
    static readonly Week = new TUnit(TUnit.ONE_WEEK, "Week", "W", "Week", "Weekly");
    static readonly Month = new TUnit(TUnit.ONE_MONTH, "Month", "M", "Month", "Monthly");
    static readonly Year = new TUnit(TUnit.ONE_YEAR, "Year", "Y", "Year", "Yearly");

    static readonly values = [
        TUnit.Second,
        TUnit.Minute,
        TUnit.Hour,
        TUnit.Day,
        TUnit.Week,
        TUnit.Month,
        TUnit.Year,
    ];

    static withName(name: string) {
        switch (name) {
            case "Second": return TUnit.Second;
            case "Minute": return TUnit.Minute;
            case "Hour": return TUnit.Hour;
            case "Day": return TUnit.Day;
            case "Week": return TUnit.Week;
            case "Month": return TUnit.Month;
            case "Year": return TUnit.Year;
            default: return null;
        }
    }

    static withShortName(shortName: string): TUnit | undefined {
        switch (shortName) {
            case "s": return TUnit.Second;
            case "m": return TUnit.Minute;
            case "h": return TUnit.Hour;
            case "D": return TUnit.Day;
            case "W": return TUnit.Week;
            case "M": return TUnit.Month;
            case "Y": return TUnit.Year;
            default: return undefined;
        }
    }

    constructor(
        public readonly interval: number,
        public readonly name: string,
        public readonly shortName: string,
        public readonly compactName: string,
        public readonly longName: string,
    ) { }

    /**
     * round time to unit's begin 0
     * @param time time in milliseconds from the epoch (1 January 1970 0:00 UTC) 
     * timezone is independent when unit less than day.
     */
    trunc(time: number) {
        //return (time + offsetToUTC / getInterval()) * getInterval() - offsetToUTC
        return Math.floor(time as number / this.interval) * this.interval;
    }

    truncDateTime(dt: Temporal.ZonedDateTime): number {
        switch (this) {
            case TUnit.Day:
                return this.#roundToDay(dt);

            case TUnit.Week:
                /**
                 * set the time to this week's first day of one week
                 *     int dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
                 *     calendar.add(Calendar.DAY_OF_YEAR, -(dayOfWeek - Calendar.SUNDAY))
                 *
                 * From stebridev@users.sourceforge.net:
                 * In some place of the world the first day of month is Monday,
                 * not Sunday like in the United States. For example Sunday 14
                 * of August of 2003 is the week 33 in Italy and not week 34
                 * like in US, while Thursday 18 of August is in the week 34 in
                 * boot Italy and US.
                 */

                //  1-based day index in the week of this date
                return this.#roundToDay(dt.subtract({ days: dt.dayOfWeek - 1 }));

            case TUnit.Month:
                // 1-based day index in the month of this date
                return this.#roundToDay(dt.subtract({ days: dt.day - 1 }));

            case TUnit.Year:
                // 1-based day index in the year of this date
                return this.#roundToDay(dt.subtract({ days: dt.dayOfYear - 1 }));

            default:
                return this.trunc(dt.epochMilliseconds);
        }
    }

    #roundToDay(dt: Temporal.ZonedDateTime): number {
        return dt.round("day").epochMilliseconds;
    }

    nUnitsBetween(fromTime: number, toTime: number, tzone: string): number {
        switch (this) {
            case TUnit.Week:
                return this.#nWeeksBetween(fromTime, toTime, tzone);

            case TUnit.Month:
                return this.#nMonthsBetween(fromTime, toTime, tzone);

            default:
                return Math.floor((toTime - fromTime) / this.interval);
        }
    }

    #nWeeksBetween(fromTime: number, toTime: number, tzone: string): number {
        const between = Math.floor((toTime - fromTime) / TUnit.ONE_WEEK);

        /**
         * If between >= 1, between should be correct.
         * Otherwise, the days between fromTime and toTime is <= 6,
         * we should consider it as following:
         */
        if (Math.abs(between) < 1) {
            const dtA = new Temporal.ZonedDateTime(BigInt(fromTime) * TUnit.NANO_PER_MILLI, tzone);
            const weekOfYearA = dtA.weekOfYear;
            const dtB = new Temporal.ZonedDateTime(BigInt(fromTime) * TUnit.NANO_PER_MILLI, tzone);
            const weekOfYearB = dtB.weekOfYear;

            /** if is in same week, between = 0, else between = 1 */
            return weekOfYearA === weekOfYearB ? 0 : (between > 0 ? 1 : -1);

        } else {
            return between;
        }
    }

    #nMonthsBetween(fromTime: number, toTime: number, tzone: string): number {
        const dtA = new Temporal.ZonedDateTime(BigInt(fromTime) * TUnit.NANO_PER_MILLI, tzone);
        const dtB = new Temporal.ZonedDateTime(BigInt(toTime) * TUnit.NANO_PER_MILLI, tzone);

        const monthOfYearA = dtA.month;
        const monthOfYearB = dtB.month;
        const yearA = dtA.year;
        const yearB = dtB.year;

        /** here we assume each year has 12 months */
        return (yearB * 12 + monthOfYearB) - (yearA * 12 + monthOfYearA);
    }

    timeAfterNUnits(fromTime: number, nUnits: number, tzone: string): number {
        switch (this) {
            case TUnit.Week:
                return this.#timeAfterNWeeks(fromTime, nUnits, tzone);

            case TUnit.Month:
                return this.#timeAfterNMonths(fromTime, nUnits, tzone);

            default:
                return fromTime + nUnits * this.interval;
        }
    }

    /** snapped to first day of the week */
    #timeAfterNWeeks(fromTime: number, nWeeks: number, tzone: string): number {
        const dt = new Temporal.ZonedDateTime(BigInt(fromTime) * TUnit.NANO_PER_MILLI, tzone);

        /** set the time to first day of this week first */
        return dt.subtract({ days: dt.dayOfWeek - 1 }).add({ weeks: nWeeks }).epochMilliseconds;
    }

    /** snapped to 1st day of the month */
    #timeAfterNMonths(fromTime: number, nMonths: number, tzone: string): number {
        const dt = new Temporal.ZonedDateTime(BigInt(fromTime) * TUnit.NANO_PER_MILLI, tzone);

        /** set the time to this month's 1st day */
        return dt.subtract({ days: dt.day - 1 }).add({ months: nMonths }).epochMilliseconds;
    }

    beginTimeOfUnitThatIncludes(time: number, tzone: string): number {
        const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, tzone);
        return this.truncDateTime(dt);
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
     * 
     * @param dt 
     * @param tzone 
     * @returns 
     */
    formatNormalDate(dt: Temporal.ZonedDateTime, tzone: string): string {
        let df;
        switch (this) {
            case TUnit.Second:
                // "13:31:26"
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    hourCycle: "h24",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
                break;

            case TUnit.Minute:
                // "13:31"
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    hourCycle: "h24",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                break;

            case TUnit.Hour:
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    hourCycle: "h24",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                break;

            case TUnit.Day:
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                });
                break;

            case TUnit.Week:
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                });
                break;

            default:
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                });
        }

        return df.format(new Date(dt.epochMilliseconds));
    }

    formatStrideDate(dt: Temporal.ZonedDateTime, tzone: string): string {
        let df;
        switch (this) {
            case TUnit.Second:
                // "13:31:26"
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    hourCycle: "h24",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
                break;

            case TUnit.Minute:
                // "13:31"
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    hourCycle: "h24",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                break;

            case TUnit.Hour:
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    hourCycle: "h24",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                break;

            case TUnit.Day:
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                });
                break;

            case TUnit.Week:
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                });
                break;

            default:
                df = new Intl.DateTimeFormat("en-US", {
                    timeZone: tzone,
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                });
        }

        return df.format(new Date(dt.epochMilliseconds));
    }

    //   override 
    //   equals(o: Any): Boolean = {
    //     o match {
    //       case x: TUnit => x.interval == this.interval
    //       case _ => false
    //     }
    //   }

    //   override 
    //   hashCode: Int = {
    //     /** should let the equaled timeframes have the same hashCode, just like a Primitive type */
    //     (interval ^ (interval >>> 32)).toInt
    //   }
}

