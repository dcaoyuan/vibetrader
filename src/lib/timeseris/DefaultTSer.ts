import { TFreq } from "./TFreq";
import { TVal } from "./TVal";
import { TVar } from "./TVar";
import { ValueList } from "../collection/ValueList";
import { TStamps } from "./TStamps";
import type { TSer } from "./TSer";
import type { BaseTSer } from "./BaseTSer";

/**
 * This is the default data container, which is a time sorted data contianer.
 *
 * <p>This container has one copy of 'vars' (without null value) for both compact and natural, and
 * with two time positions: 'timestamps', and 'calendarTimes' the 'timestamps' is actaully with the
 * same idx corresponding to 'vars'
 *
 * <p>This class implements all interface of ser and partly TBaseSer. So you can use it as full
 * series, but don't use those methods of TBaseSer except you sub class this.
 *
 * <p>The max capacity of ONE_MIN for trading is 15000 / 240 = 62.5 days, about 3 months The max
 * capacity of ONE_MIN for calendar is 20160 / 1440 = 14 days, 2 weeks The max capacity of DAILY for
 * trading is 15000/ 250 = 60 years. The max capacity of DAILY for calendar is 20160/ 365 = 55
 * years.
 *
 */
export class DefaultTSer implements TSer {
  freq: TFreq;
  timeZone: string;
  valuesCapacity: number;

  /**
   * we implement occurred timestamps and items in density mode instead of spare mode, to avoid
   * itemOf(time) return null even in case of timestamps has been filled. DefaultItem is a
   * lightweight virtual class, don't worry about the memory occupied.
   *
   * <p>Should only get index from timestamps which has the proper mapping of : position <-> time
   * <-> item
   */
  protected _timestamps: TStamps;


  /** Each var element of array is a Var that contains a sequence of values for one field of Ser. */
  protected _vars: Map<string, TVar<TVal>>

  protected _holders: ValueList<boolean>; // a place holder plus flag

  constructor(freq: TFreq, timeZone: string, timestamps: TStamps, valuesCapacity: number) {
    this.freq = freq;
    this.timeZone = timeZone;
    this.valuesCapacity = valuesCapacity;
    //assert valuesCapacity >= 2 : "valuesCapacity must >= 2, so as to record and get prev one";

    this._vars = new Map<string, TVar<TVal>>();
    this._timestamps = timestamps;
    this._holders = new ValueList(valuesCapacity);
  }

  timestamps() {
    return this._timestamps;
  }

  vars() {
    return this._vars;
  }

  /**
   *  
   * @param name 
   * @returns var of name, will create one if non exist yet.
   */
  varOf(name: string): TVar<TVal> {
    let tvar = this._vars.get(name);
    if (tvar === undefined) {
      tvar = this.TVar(name, TVar.Kind.Accumlate);
    }

    return tvar;
  }

  protected _lname = ""; // Long description 
  protected _sname = ""; // Short description

  #tsLogCheckedCursor = 0;
  #tsLogCheckedSize = 0;

  isOverlapping = false;

  #isInLoading = false;
  #isLoaded = false;

  /**
   * Used only by InnerVar's constructor and AbstractIndicator's functions
   *
   * @param v
   */
  addVar(name: string, v: TVar<TVal>) {
    // v could be added afterwards, should catch up and keep same size as this TSer
    for (let i = 0; i < this.size(); i++) {
      v.addNull();
    }
    this._vars.set(name, v);
  }

  /** --- for charting horizontal grids of this indicator used to draw grid */
  grids: number[] = [];

  get isLoaded() {
    return this.#isLoaded;
  }
  set isLoaded(b: boolean) {
    if (b) {
      this.#isInLoading = false;
    }
    this.isLoaded = b;
  }

  get isInLoading() {
    return this.#isInLoading;
  }
  set isInLoading(b: boolean) {
    if (b) {
      this.isLoaded = false;
    }
    this.#isInLoading = b;
  }

  nonExists(time: number): boolean {
    return !this.exists(time);
  }

  isAscending<V extends TVal>(values: V[]): boolean {
    const size = values.length;
    if (size <= 1) {
      return true;

    } else {
      let i = 0;
      while (i < size - 1) {
        if (values[i].time < values[i + 1].time) {
          return true;

        } else if (values[i].time > values[i + 1].time) {
          return false;
        }

        i++;
      }

      return false;
    }
  }


  /**
   * @return @todo, holder.size or timestamps.size ?
   */
  size(): number {
    return this._holders.size();
  }

  exists(time: number): boolean {
    /**
     * @NOTE: 
     * Should only get index from timestamps which has the proper position <-> time <-> item mapping
     */
    const idx = this._timestamps.indexOfOccurredTime(time);
    return idx >= 0 && idx < this._holders.size();
  }

  protected _assignValue(tval: TVal): void {
    // todo
  }

  longName = this._lname
  shortName = this._sname
  displayName = this.shortName + " - (" + this.longName + ")";

  /**
   * @Note: This function is not thread safe, since tsLogCheckedCursor and tsLogCheckedSize should
   * be atomic accessed/modified during function's running scope so. Should avoid to enter here by
   * multiple actors concurrent
   */
  // validate() {
  //   if (!DefaultTBaseSer.isSupportTStampsLog) {
  //     throw new UnsupportedOperationException(
  //       "Not supported yet until resolve TStampsLog on capacity limited ValueList.");
  //   }
  //   try {
  //     // timestamps.readLock.lock

  //     const tlog = timestamps.log;
  //     const tlogCursor = tlog.logCursor();
  //     var checkingCursor = tsLogCheckedCursor;
  //     while (tlogCursor > -1 && checkingCursor <= tlogCursor) {
  //       boolean cursorMoved;
  //       if (checkingCursor != tsLogCheckedCursor) {
  //         // is checking a new log, should reset tsLogCheckedSize
  //         tsLogCheckedSize = 0;
  //         cursorMoved = true;
  //       } else {
  //         cursorMoved = false;
  //       }

  //       const tlogFlag = tlog.get(checkingCursor);
  //       const tlogCurrSize = tlog.checkSize(tlogFlag);
  //       if (!cursorMoved && tlogCurrSize == tsLogCheckedSize) {
  //         // same log with same size, actually nothing changed
  //       } else {
  //         const logKind = tlog.checkKind(tlogFlag);
  //         switch (logKind) {
  //           case TStampsLog.INSERT: {
  //             const begIdx = tlog.insertIndexOfLog(checkingCursor);

  //             const begIdx1 =
  //               !cursorMoved
  //                 ? // if insert log is a merged one, means the inserts were continually
  //                 // happening one behind one
  //                 begIdx + tsLogCheckedSize
  //                 : begIdx;

  //             const insertSize = !cursorMoved ? tlogCurrSize - tsLogCheckedSize : tlogCurrSize;

  //             const newHolders = new boolean[insertSize];
  //             var i = 0;
  //             while (i < insertSize) {
  //               const time = timestamps.get(begIdx1 + i);
  //               vars().forEach((v) -> v.putNullByTime(time));
  //               newHolders[i] = true; // true
  //               i++;
  //             }
  //             holders.addAll(begIdx1, newHolders, newHolders.length);
  //           }

  //           case TStampsLog.APPEND: {
  //             const begIdx = holders.size();

  //             const appendSize = !cursorMoved ? tlogCurrSize - tsLogCheckedSize : tlogCurrSize;

  //             const newHolders = new boolean[appendSize];
  //             var i = 0;
  //             while (i < appendSize) {
  //               const time = timestamps.get(begIdx + i);
  //               vars().forEach((v) -> v.putNullByTime(time));
  //               newHolders[i] = true; // true
  //               i++;
  //             }
  //             holders.addAll(newHolders, newHolders.length);

  //           }
  //           default: {
  //             assert false : "Unknown log type: " + logKind;
  //           }
  //         }
  //       }

  //       tsLogCheckedCursor = checkingCursor;
  //       tsLogCheckedSize = tlogCurrSize;
  //       checkingCursor = tlog.nextCursor(checkingCursor);
  //     }

  //     // assert timestamps.size() == holders.size()
  //     //     : "Timestamps size="
  //     //         + timestamps.size()
  //     //         + " vs items size="
  //     //         + holders.size()
  //     //         + ", checkedCursor="
  //     //         + tsLogCheckedCursor
  //     //         + ", log="
  //     //         + tlog;

  //   } catch (Throwable ex) {

  //   }
  // }

  clear(fromTime: number) {
    const fromIdx = this._timestamps.indexOrNextIndexOfOccurredTime(fromTime);
    if (fromIdx < 0) {
      return;
    }

    this._vars.forEach((v, _) => v.clearFromIndex(fromIdx));

    const count = this._holders.size() - fromIdx;
    this._holders.removeMultiple(fromIdx, count);

  }

  indexOfOccurredTime(time: number): number {
    return this._timestamps.indexOfOccurredTime(time);
  }

  firstOccurredTime(): number {
    return this._timestamps.firstOccurredTime();
  }

  lastOccurredTime(): number {
    return this._timestamps.lastOccurredTime();
  }

  // toString(): string {
  //   let sb = "";
  //   "${this.shortName}(${this.freq}): size={$this.size()},";

  //   sb = sb + this.shortName + "(" + this.freq + "): size=" + this.size() + ", ";
  //   if (this.timestamps !== undefined && !this.timestamps().isEmpty()) {
  //     const length = this.timestamps().size();

  //     const fst = this.timestamps().get(0);
  //     const lst = this.timestamps().get(length - 1);
  //     const cal = Util.calendarOf();
  //     cal.setTimeInMillis(fst);
  //     sb.append(cal.getTime());
  //     sb.append(" - ");
  //     cal.setTimeInMillis(lst);
  //     sb.append(cal.getTime());
  //     sb.append(", data=(\n");
  //     for (const v: vars()) {
  //       sb.append("  ").append(v).append(", \n");
  //     }
  //   }
  //   sb.append(")");

  //   return sb.toString();
  // }

  /**
   * Ser may be used as the HashMap key, for efficient reason, we define equals and hashCode method
   * as it:
   *
   * @param o
   */
  // equals(o: any): boolean {
  //   if (this == o) {
  //     return true;

  //   } else {
  //     if (o instanceof TSer that) {
  //       return this.getClass() == that.getClass() && this.hashCode() == that.hashCode();

  //     } else {
  //       return false;
  //     }
  //   }
  // }

  // private _hashCode = System.identityHashCode(this);

  // hashCode(): number {
  //   return _hashCode;
  // }

  TVar<V extends TVal>(name: string, kind: TVar.Kind): TVar<V> {
    return new TVar<V>(this as any as BaseTSer, name, kind);
  }

  // @todo SparseTVar
  /* protected class SparseTVar[V: ClassTag](
  name: String, val kind: TVar.Kind, val plot: Plot
  ) extends TVar[V] {
   
     addVar(this)
   
   def timestamps = DefaultTSer.this.timestamps
   
   var layer = -1 // -1 means not set
   // @todo: timestamps may be null when go here, use lazy val as a quick fix now, shoule review it
   private lazy val colors = new TStampedMapBasedList[Color](timestamps)
   def getColor(idx: Int) = colors(idx)
   def setColor(idx: Int, color: Color) {
     colors(idx) = color
   }
   
  // @todo: timestamps may be null when go here, use lazy val as a quick fix now, shoule review it
  lazy val values = new TStampedMapBasedList[V](timestamps)
   
  def put(time: Long, value: V): Boolean = {
  val idx = timestamps.indexOfOccurredTime(time)
  if (idx >= 0) {
  values.add(time, value)
  true
  } else {
  assert(false, "Add timestamps first before add an element! " + ": " + "idx=" + idx + ", time=" + time)
  false
  }
  }
   
  def apply(time: Long): V = values(time)
   
  def update(time: Long, value: V) {
  values(time) = value
  }
   
  // @Note, see https://lampsvn.epfl.ch/trac/scala/ticket/2599
  override
  def apply(idx: Int): V = {
  super.apply(idx)
  }
   
  // @Note, see https://lampsvn.epfl.ch/trac/scala/ticket/2599
  override
  def update(idx: Int, value: V) {
  super.update(idx, value)
  }
  } */

}

