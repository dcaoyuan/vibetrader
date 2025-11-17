import { Chart } from "../chart/Chart"
import { ChartXControl } from "./ChartXControl"
import { ChartView } from "./ChartView"

export interface ClassOfChartViewContainer {
  new(): ChartViewContainer;
}

export class ChartViewContainer {
  //private descriptorToSlaveView = new Map<IndicatorDescriptor, ChartView>()
  control: ChartXControl
  masterView: ChartView

  width: number;
  height: number;

  /**
   * init this viewContainer instance. binding with control (so, MasterSer and Descriptor) here
   */
  constructor(control: ChartXControl, masterView: ChartView) {
    this.control = control;
    this.masterView = masterView;

    this.initComponents();
  }


  /**
   * each viewContainer can only contains one selectedChart, so we define it here instead of
   * on ChartView or ChartPane;
   */
  private _selectedChart?: Chart;
  private _selectedView?: ChartView;
  private _isInteractive = true;
  private _isPinned = false;

  paint() {
    //super.paint(g)
  }

  protected initComponents() {

  }

  /**
   * It's just an interactive hint, the behave for interactive will be defined
   * by ChartView(s) and its Pane(s).
   *
   * @return true if the mouse will work interacticely, false else.
   */
  get isInteractive() {
    return this._isInteractive;
  }
  set isInteractive(b: boolean) {
    this.masterView.isInteractive = b

    // for (let view of descriptorToSlaveView.valuesIterator) {
    //   view.isInteractive = b
    // }

    this.isInteractive = b
  }

  get isPinned() {
    return this._isPinned;
  }
  pin() {
    this.masterView.pin()
    this._isPinned = true
  }

  unPin() {
    this.masterView.unPin()
    this._isPinned = false
  }

  adjustViewsHeight(increment: number) {
    /**
     * @TODO
     * Need implement adjusting each views' height ?
     */

    let numSlaveViews = 0
    let sumSlaveViewsHeight = 0.0
    // for (let view of descriptorToSlaveView.valuesIterator if view != masterView) {
    //   /** overlapping view is also in masterView, should ignor it */
    //   sumSlaveViewsHeight += view.getHeight
    //   numSlaveViews++ 
    // }

    if (numSlaveViews == 1 && sumSlaveViewsHeight == 0) {
      /** first slaveView added */
      sumSlaveViewsHeight = 0.382 * this.masterView.height
    }

    //setVisible(false)

    // const gbl = getLayout.asInstanceOf[GridBagLayout]
    // const adjustHeight = increment
    // const gbc = GBC(0).setFill(GridBagConstraints.BOTH).setWeight(100, _masterView.getHeight + adjustHeight)

    /**
     * We need setConstraints and setSize together to take the effect
     * according to GridBagLayout's behave.
     * We can setSize(new Dimension(0, 0)) and let GridBagLayout arrange
     * the size according to weightx and weighty, but for performence issue,
     * we'd better setSize() to the actual size that we want.
     */
    // gbl.setConstraints(_masterView, gbc)
    // this.masterView.setSize(new DOMRect(this.masterView.getWidth, gbc.weighty.toInt))
    // for (let view of descriptorToSlaveView.valuesIterator if view ne masterView) {
    //   /** average assigning */
    //   gbc.weighty = (sumSlaveViewsHeight - adjustHeight) / numSlaveViews
    //   /*-
    //    * proportional assigning
    //    * gbc.weighty = v.getHeight() - adjustHeight * v.getHeight() / iHeight;
    //    */
    //   gbl.setConstraints(view, gbc)
    //   view.setSize(new Dimension(view.getWidth, gbc.weighty.toInt))
    // }

    // setVisible(true)
  }

  protected setMasterView(masterView: ChartView) {
    this.masterView = masterView;
    //add(masterView);
  }

  // addSlaveView(descriptor: IndicatorDescriptor, ser: TSer, _gbc: GridBagConstraints): ChartView = {
  //   if (!this.descriptorToSlaveView.contains(descriptor)) {
  //     val view = if (ser.isOverlapping) {
  //       val view = masterView
  //       view.addOverlappingCharts(ser)
  //       view
  //     } else {
  //       val view = new IndicatorChartView(control, ser)
  //       val gbc = if (_gbc == null) {
  //         GBC(0).setFill(GridBagConstraints.BOTH)
  //       } else _gbc
  //       add(view, gbc)
  //       view
  //     }
  //     descriptorToSlaveView.put(descriptor, view)
  //     selectedView = view
  //     view 
  //   } else null
  // }

  // removeSlaveView(descriptor: IndicatorDescriptor) {
  //   lookupChartView(descriptor) match {
  //     case Some(view) if view eq masterView =>
  //       view.removeOverlappingCharts(descriptor.createdServerInstance)
  //     case Some(view) =>
  //       remove(view)
  //       adjustViewsHeight(0)
  //       view.allSers.clear
  //       repaint()
  //     case None =>
  //   }
  //   descriptorToSlaveView.remove(descriptor)
  // }

  // slaveViews() {
  //   return this.descriptorToSlaveView.valuesIterator;
  // }

  get selectedView(): ChartView {
    return this._selectedView;
  }
  set selectedView(view: ChartView) {
    if (this._selectedView !== undefined) {
      this._selectedView.isSelected = false
    }

    if (view !== undefined) {
      this._selectedView = view
      this._selectedView.isSelected = true

    } else {
      this._selectedView = undefined
    }
  }

  get selectedChart(): Chart {
    return this._selectedChart;
  }

  /**
   * @param chart the chart to be set as selected, could be <b>undefined</b>
   */
  set selectedChart(chart: Chart) {
    if (this._selectedChart !== undefined) {
      this._selectedChart.isSelected = false
    }

    if (chart !== undefined) {
      this._selectedChart = chart
      this._selectedChart.isSelected = true
    } else {
      this._selectedChart = undefined
    }

    //repaint()
  }

  // lookupIndicatorDescriptor(view: ChartView): Option[IndicatorDescriptor] = {
  //   descriptorToSlaveView find {case (descriptor, aView) => (aView ne null) && (aView eq view)} map (_._1)
  // }

  // lookupChartView(descriptor: IndicatorDescriptor): Option[ChartView] = {
  //   descriptorToSlaveView.get(descriptor)
  // }

  // def getDescriptorsWithSlaveView: mutable.Map[IndicatorDescriptor, ChartView] = {
  //   descriptorToSlaveView
  // }

  getFocusableParent(): any {
    return this._parent;
  }

  // def saveToCustomSizeImage(file: File, fileFormat: String, width: Int, height: Int) {
  //   /** backup: */
  //   val backupRect = getBounds()

  //   setBounds(0, 0, width, height)
  //   validate

  //   saveToImage(file, fileFormat)

  //   /** restore: */
  //   setBounds(backupRect)
  //   validate
  // }

  // def saveToCustomSizeImage(file: File, fileFormat: String, fromTime: Long, toTime: Long, height: Int) {
  //   val begPos = control.baseSer.rowOfTime(fromTime)
  //   val endPos = control.baseSer.rowOfTime(toTime)
  //   val nBars = endPos - begPos
  //   val width = (nBars * control.wBar).toInt

  //   /** backup: */
  //   val backupRightCursorPos = control.rightSideRow
  //   val backupReferCursorPos = control.referCursorRow

  //   control.setCursorByRow(backupReferCursorPos, endPos, true)

  //   saveToCustomSizeImage(file, fileFormat, width, height)

  //   /** restore: */
  //   control.setCursorByRow(backupReferCursorPos, backupRightCursorPos, true)
  // }

  // @throws(classOf[Exception])
  // def saveToImage(file: File, fileFormat: String) {
  //   val fileName = (file.toString + ".png")

  //   if (_masterView.xControlPane != null) {
  //     _masterView.xControlPane.setVisible(false)
  //   }

  //   if (_masterView.yControlPane != null) {
  //     _masterView.yControlPane.setVisible(false)
  //   }

  //   val image = paintToImage

  //   ImageIO.write(image, fileFormat, file)

  //   if (_masterView.xControlPane != null) {
  //     _masterView.xControlPane.setVisible(true)
  //   }

  //   if (_masterView.yControlPane != null) {
  //     _masterView.yControlPane.setVisible(true)
  //   }
  // }

  // @throws(classOf[Exception])
  // def paintToImage: RenderedImage = {
  //   val renderImage = new BufferedImage(getWidth, getHeight, BufferedImage.TYPE_INT_RGB)

  //   val gImg = renderImage.createGraphics
  //   try {
  //     paint(gImg)
  //   } catch {case ex: Exception => throw ex
  //   } finally {gImg.dispose}

  //   renderImage
  // }

  // @throws(classOf[Throwable])
  // override 
  // protected def finalize {
  //   descriptorToSlaveView.clear
  //   super.finalize
  // }
}
