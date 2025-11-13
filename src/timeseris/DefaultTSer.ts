import { AbstractTSer } from "./AbstractTSer";
import { TFreq } from "./TFreq";
import { TVal } from "./TVal";
import { TVar } from "./TVar";
import { ValueList } from "../collection/ValueList";
import { TStamps } from "./TStamps";

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
export class DefaultTSer extends AbstractTSer {
  valuesCapacity: number;

  protected holders: ValueList<boolean>; // a place holder plus flag

  constructor(freq: TFreq, valuesCapacity: number, timeZone: string, timestamps: TStamps) {
    super(freq, timeZone, timestamps);

    //assert valuesCapacity >= 2 : "valuesCapacity must >= 2, so as to record and get prev one";
    this.valuesCapacity = valuesCapacity;
    this.holders = new ValueList(valuesCapacity);
  }


  protected lname = ""; // Long description 
  protected sname = ""; // Short description

  private tsLogCheckedCursor = 0;
  private tsLogCheckedSize = 0;

  /**
   * @return @todo, holder.size or timestamps.size ?
   */
  size(): number {
    return this.holders.size();
  }

  exists(time: number): boolean {
    /**
     * @NOTE: 
     * Should only get index from timestamps which has the proper position <-> time <-> item mapping
     */
    const idx = this._timestamps.indexOfOccurredTime(time);
    return idx >= 0 && idx < this.holders.size();
  }

  protected assignValue(tval: TVal): void {
    // todo
  }

  longName = this.lname
  shortName = this.sname
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
  //               i += 1;
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
  //               i += 1;
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

    const count = this.holders.size() - fromIdx;
    this.holders.removeMultiple(fromIdx, count);

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

  protected TVar<V>(name: string, kind: TVar.Kind): TVar<V> {
    return new DefaultTSer.InnerTVar<V>(this, name, kind);
  }

  /**
   * Define inner Var class -----------------------------------------------------------------------
   * Horizontal view of DefaultSer. It's a ref of one of the field vars. InnerVar can only
   * live in DefaultSer.
   *
   * <p>We define it as inner class of DefaultSer, to avoid bad usage, especially when its values is
   * also managed by DefaultSer. We should make sure the operation on values, including add, delete
   * to be consistent by cooperating with DefaultSer.
   *
   * @param <V>
   */
  private static InnerTVar = class <V> extends TVar<V> {
    #outer: DefaultTSer;
    readonly kind: TVar.Kind;
    readonly name: string;

    #values: ValueList<V>;

    constructor(outer: DefaultTSer, name: string, kind: TVar.Kind) {
      super();
      this.#outer = outer;
      this.kind = kind;
      this.name = name;
      this.#values = new ValueList<V>(this.#outer.valuesCapacity);
      outer.addVar(this);
    }

    values(): ValueList<V> {
      return this.#values;
    }

    override timestamps(): TStamps {
      return this.#outer.timestamps();
    }

    // @Override
    // public ValueList<V> values() {
    //   return values;
    // }

    override putByTime(time: number, value: V): boolean {
      const idx = this.timestamps().indexOfOccurredTime(time);
      if (idx >= 0) {
        // TODO. for limited capacity values, no change idx == values().size()
        if (idx == this.values().size()) {
          this.values().add(value);

        } else {
          this.values().insert(idx, value);
        }

        return true;

      } else {
        // assert false
        //     : "Fill timestamps first before put an element! "
        //         + ": "
        //         + "idx="
        //         + idx
        //         + ", time="
        //         + time;
        return false;
      }
    }

    override putByIndex(idx: number, value: V): boolean {
      this.values().insert(idx, value);
      return true;
    }

    override add(value: V): boolean {
      return this.values().add(value);
    }

    override getByTime(time: number): V {
      const idx = this.timestamps().indexOfOccurredTime(time);
      return this.values().get(idx);
    }

    override setByTime(time: number, value: V) {
      const idx = this.timestamps().indexOfOccurredTime(time);
      this.values().set(idx, value);
    }

    // plot = Plot.None;
    // layer = -1; // -1 means not set

    // // @todo: timestamps may be null when go here, use lazy val as a quick fix now, shoule review it
    // private _lazy_colors: TStampedMapBasedList<Color> = undefined as any;

    // private get colors(): TStampedMapBasedList<Color> {
    //   if (this._lazy_colors === undefined) {
    //     _lazy_colors = new TStampedMapBasedList<>(Color.class, timestamps);
    //   }
    //   return _lazy_colors;
    // }

    // getColor(idx: number): Color {
    //   return this.colors.get(idx);
    // }

    // setColor(idx: number, color: Color) {
    //   this.colors.set(idx, color);
    // }
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

