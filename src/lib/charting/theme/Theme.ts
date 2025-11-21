import { QuoteChartKind } from "../chart/Kinds";

export class Theme {
  private static current: Theme

  static now(): Theme {
    if (Theme.current === undefined) {
      Theme.current = new Theme();
    }
    return Theme.current;
  }

  static update(colorTheme: Theme) {
    Theme.current = colorTheme
  }

  static compareColor(c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }): number {
    const R1 = c1.r
    const G1 = c1.g
    const B1 = c1.b

    const R2 = c2.r
    const G2 = c2.g
    const B2 = c2.b

    return Math.sqrt(((R1 - R2) * (R1 - R2) + (G1 - G2) * (G1 - G2) + (B1 - B1) * (B1 - B2)))
  }

  isPositiveNegativeColorReversed = false;
  quoteChartType: QuoteChartKind = QuoteChartKind.Ohlc;
  isThinVolumeBar = false;
  isAutoHideScroll = false;
  isAllowMultipleIndicatorOnQuoteChartView = false;
  isFillBar = true;

  protected readonly monthColors: string[]
  protected readonly planetColors: string[];
  protected readonly chartColors: string[];

  protected readonly positiveColor = "#FF0000";
  protected readonly negativeColor = "#00FF00";
  protected readonly positiveBgColor = "";
  protected readonly negativeBgColor: string;
  protected readonly neutralColor: string;
  protected readonly neutralBgColor: string;
  /** scrolling control colors */
  protected readonly trackColor: string //= backgroundColor
  protected readonly thumbColor: string //= backgroundColor

  readonly axisFont: string
  readonly defaultFont: string;//new Font("Dialog Input", Font.PLAIN, 10)
  readonly systemBackgroundColor: string
  readonly nameColor: string
  readonly backgroundColor: string
  readonly infoBackgroundColor: string;
  readonly heavyBackgroundColor: string;
  readonly axisBackgroundColor: string;
  readonly stickChartColor: string;
  readonly borderColor: string;
  readonly axisColor = "#FF0000";
  /** same as new Color(0.0f, 0.0f, 1.0f, 0.382f) */
  readonly referCursorColor: string; //new Color(0.5f, 0.0f, 0.5f, 0.618f); //new Color(0.0f, 0.0f, 1.0f, 0.618f);
  //new Color(131, 129, 221);
  /** same as new Color(1.0f, 1.0f, 1.0f, 0.618f) */
  readonly mouseCursorColor: "#F0F0F0";
  //new Color(239, 237, 234);
  readonly mouseCursorTextColor: string;
  readonly mouseCursorTextBgColor: string;
  readonly referCursorTextColor: string;
  readonly referCursorTextBgColor: string;
  readonly drawingMasterColor: string; // new Color(128, 128, 255); //new Color(128, 0, 128);
  readonly drawingColor: string; // new Color(128, 128, 255); //new Color(128, 0, 128);
  readonly drawingColorTransparent: string; //new Color(128, 0, 128);
  readonly handleColor: string; // new Color(128, 128, 255); //new Color(128, 0, 128);
  readonly astrologyColor: string;

  getGradientColor(depth: number, beginDepth: number): { r: number, g: number, b: number } {
    const steps = Math.abs(depth - beginDepth);
    const alpha = Math.pow(0.618, steps);

    //        Color color = Color.RED;
    //        int r = alpha * color.getRed();
    //        int g = alpha * color.getGreen();
    //        int b = alpha * color.getBlue();

    //        return new Color(r * alpha, g * alpha, b * alpha);
    return { r: 0.0 * alpha, g: 1.0 * alpha, b: 1.0 * alpha };
  }

  //    public Color getGradientColor(int depth) {
  //        double steps = math.abs((depth - AbstractPart.DEPTH_GRADIENT_BEGIN));
  //        float  alpha = (float)math.pow(0.618d, steps);
  //
  //        Color color = Color.RED;
  //        for (int i = 0; i < steps; i++) {
  //            color.brighter().brighter();
  //        }
  //
  //        return color;
  //    }
  getChartColor(depth: number): string {
    const multiple = Math.floor(depth / this.chartColors.length)
    const remainder = depth % this.chartColors.length
    const color = this.chartColors[remainder]
    let i = 1
    while (i <= multiple) {
      //color = color.darker();
      i++;
    }
    return color;
  }

  getPositiveColor() {
    return this.isPositiveNegativeColorReversed ? this.negativeColor : this.positiveColor;
  }

  getNegativeColor() {
    return this.isPositiveNegativeColorReversed ? this.positiveColor : this.negativeColor;
  }

  getPositiveBgColor() {
    return this.isPositiveNegativeColorReversed ? this.negativeBgColor : this.positiveBgColor;
  }

  getNegativeBgColor() {
    return this.isPositiveNegativeColorReversed ? this.positiveBgColor : this.negativeBgColor;
  }

  getMonthColor(month: number) {
    return this.monthColors[month]
  }

  getPlanetColor(planet: number) {
    return this.planetColors[planet]
  }

  getTrackColor() {
    return this.trackColor === undefined ? this.axisColor : this.trackColor;
  }

  getThumbColor() {
    return this.thumbColor === undefined ? this.axisColor : this.thumbColor;
  }

}
