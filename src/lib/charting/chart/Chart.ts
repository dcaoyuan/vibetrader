import { Path } from "../../svg/Path";

//   const BASE_STROKES = [ 
//     new BasicStroke(1.0f),
//     new BasicStroke(2.0f)
//   ]
//   const DASH_PATTERN = [5, 2]
//   const DASH_STROKES = [ 
//     new BasicStroke(1.0f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0f, DASH_PATTERN, 0),
//     new BasicStroke(2.0f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0f, DASH_PATTERN, 0)
//   ]

/**
 * To allow the mouse pick up accurately a chart, we need seperate a chart to
 * a lot of segment, each segment is a shape that could be sensible for the
 * mouse row. The minimum segment's width is defined here.
 *
 * Although we can define it > 1, such as 3 or 5, but, when 2 bars or more
 * are located in the same one segment, they can have only one color,
 * example: two-colors candle chart. So, we just simplely define it as 1.
 *
 * Another solution is define 1 n-colors chart as n 1-color charts (implemented).
 */

export interface Chart {//extends Widget with Ordered[Chart] {

  isFirstPlotting: boolean;
  isSelected: boolean;
  depth: number;
  stroke: string;
  strockWidth: number;

  //plot(): void;
  paths(): Path[];
  reset(): void;
}

export namespace Chart {

  /**
   * To allow the mouse pick up accurately a chart, we need seperate a chart to
   * a lot of segment, each segment is a shape that could be sensible for the
   * mouse row. The minimum segment's width is defined here.
   *
   * Although we can define it > 1, such as 3 or 5, but, when 2 bars or more
   * are located in the same one segment, they can have only one color,
   * example: two-colors candle chart. So, we just simplely define it as 1.
   *
   * Another solution is define 1 n-colors chart as n 1-color charts (implemented).
   */
  export const MIN_SEGMENT_WIDTH = 1;
  export const MARK_INTERVAL = 16;
  export const COLOR_SELECTED = "0x447BCD";
  // const COLOR_HIGHLIGHTED = COLOR_SELECTED.darker;
  // const COLOR_HOVERED = COLOR_SELECTED.brighter;


  // export const BASE_STROKES: BasicStroke[] = [
  //   new BasicStroke(1),
  //   new BasicStroke(2),
  //   new BasicStroke(3),
  //   new BasicStroke(4),
  //   new BasicStroke(5)
  // ];
  // export const DASH_PATTERN = [5, 5];
  // export const DASH_STROKES: BasicStroke[] = [
  //   new BasicStroke(1, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0, DASH_PATTERN, 0),
  //   new BasicStroke(2, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0, DASH_PATTERN, 0),
  //   new BasicStroke(3, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0, DASH_PATTERN, 0),
  //   new BasicStroke(4, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0, DASH_PATTERN, 0),
  //   new BasicStroke(5, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0, DASH_PATTERN, 0)
  // ];
}

export enum StrokeType {
  Base,
  Dash
}





