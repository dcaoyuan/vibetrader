import { Theme } from "./Theme"

export class CityLights extends Theme {
  redColor = '#FF5454'

  constructor() {
    super();
  }
  // const monthColors = Array(
  //   Color.cyan.darker.darker.darker,
  //   Color.cyan.darker.darker,
  //   Color.yellow.darker.darker.darker,
  //   Color.red.darker.darker.darker,
  //   Color.red.darker.darker,
  //   Color.yellow.darker.darker.darker,
  //   Color.white.darker.darker.darker,
  //   Color.white.darker.darker,
  //   Color.yellow.darker.darker.darker,
  //   Color.magenta.darker.darker.darker,
  //   Color.magenta.darker.darker,
  //   Color.yellow.darker.darker.darker
  // )

  // val planetColors = Array(
  //   Color.magenta.darker,
  //   Color.white,
  //   Color.blue,
  //   Color.red,
  //   Color.cyan,
  //   Color.yellow,
  //   Color.orange.darker.darker,
  //   Color.green.darker.darker,
  //   Color.gray.darker.darker,
  //   Color.blue
  // )

  //        chartColors = new Color[] {
  //            Color.BLUE,
  //                    Color.YELLOW,
  //                    Color.CYAN,
  //                    Color.MAGENTA,
  //                    Color.PINK,
  //                    Color.ORANGE,
  //                    Color.WHITE,
  //                    Color.RED.darker,
  //                    Color.GREEN.darker,
  //        };
  chartColors = [
    '#FFFFFF', //darker // white Venus
    "#FFFF00", // yellow Sun
    "#FF00FF", // Magenta Pluto
    "#00FF00", // Green Earth
    "#0000FF", // Blue Mercury
    "#FF0000", // Red Mars
    "#00FFFF", // Cyan, Jupiter
    "#FFC0CB", // Pink, Uranus
    "#FFFF00",// .darker, // yellow Saturn
    "#D2D3D3", // lightgray Neptune
    "#A9A9A9" // darkgray MOON
  ]

  //val axisFont = new Font("Dialog Input", Font.PLAIN, 10)

  //val systemBackgroundColor = new Color(212, 208, 200)

  //val nameColor = Color.WHITE

  // val backgroundColor = Color.BLACK
  // val infoBackgroundColor = backgroundColor
  // val heavyBackgroundColor = backgroundColor

  // val axisBackgroundColor = systemBackgroundColor

  // val stickChartColor = Color.BLUE

  //readonly positiveColor = "GREEN"
  //private const positiveColor2 = new Color(84, 255, 255)
  //readonly negativeColor = "RED"

  // val positiveBgColor = Color.GREEN
  // private val positiveBgColor2 = new Color(84, 255, 255)
  // val negativeBgColor = redColor
  // val neutralBgColor = neutralColor


  // val borderColor = redColor

  /** same as new Color(0.0f, 0.0f, 1.0f, 0.382f) */
  // val referCursorColor = new Color(0.0f, 1.0f, 1.0f, 0.382f) //new Color(0.5f, 0.0f, 0.5f, 0.618f); //new Color(0.0f, 0.0f, 1.0f, 0.618f);
  // //new Color(131, 129, 221);

  // val mouseCursorColor = Color.WHITE.darker
  // //new Color(239, 237, 234);

  // val mouseCursorTextColor = Color.BLACK
  // val mouseCursorTextBgColor = Color.YELLOW
  // val referCursorTextColor = Color.BLACK
  // val referCursorTextBgColor = referCursorColor.darker

  // val drawingMasterColor = Color.white // new Color(128, 128, 255); //new Color(128, 0, 128);
  // val drawingColor = Color.WHITE // new Color(128, 128, 255); //new Color(128, 0, 128);
  // val drawingColorTransparent = new Color(0.0f, 0.0f, 1.f, 0.382f) //new Color(128, 0, 128);
  // val handleColor = Color.WHITE // new Color(128, 128, 255); //new Color(128, 0, 128);

  // val astrologyColor = Color.YELLOW

  // override val axisColor = redColor
  // override val trackColor = Color.BLACK
  // override val thumbColor = redColor

  // override def getPositiveColor: Color = {
  //   if (isPositiveNegativeColorReversed) negativeColor else positiveColor
  // }

  // override def getNegativeColor: Color = {
  //   if (isPositiveNegativeColorReversed) positiveColor2 else negativeColor
  // }

  // override def getPositiveBgColor: Color = {
  //   if (isPositiveNegativeColorReversed) negativeBgColor else positiveBgColor
  // }

  // override def getNegativeBgColor: Color = {
  //   if (isPositiveNegativeColorReversed) positiveBgColor2 else negativeBgColor
  // }

}
