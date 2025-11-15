
export namespace Geometry {
  export function hOne(vRange: number, hRange: number): number {
    return vRange === 0 ? 1.0 : hRange / vRange;
  }

  export function yv(v: number, hOne: number, vMin: number, yLower: number): number {
    return -((hOne * (v - vMin) - yLower));
  }

  export function vy(y: number, hOne: number, vMin: number, yLower: number): number {
    return -((y - yLower) / hOne - vMin);
  }

  export function yOfLine(x: number, baseX: number, baseY: number, k: number): number {
    return (baseY + (x - baseX) * k);
  }

  /**
   * @param x
   * @param xCenter center point x of arc
   * @param yCenter center point y of arc
   * @return y or Null.Double
   */
  export function yOfCircle(x: number, xCenter: number, yCenter: number, radius: number, positiveSide: boolean): number {
    const dx = x - xCenter;
    const dy = Math.sqrt(radius * radius - dx * dx);
    return positiveSide ? yCenter + dy : yCenter - dy;
  }

  // export function yOfCircle(x: number, circle: Arc2D, positiveSide: Boolean): number {
  //   const xCenter = circle.getCenterX
  //   const yCenter = circle.getCenterY
  //   const radius  = circle.getHeight / 2.0
  //   return yOfCircle(x, xCenter, yCenter, radius, positiveSide)
  // }

  // export function distanceToCircle(x: number, y: number, circle: Arc2D): number  {
  //   const xCenter = circle.getCenterX
  //   const yCenter = circle.getCenterY
  //   const radius  = circle.getHeight / 2.0
  //   const dx = x - xCenter
  //   const dy = y - yCenter
  //   return (Math.sqrt(dx * dx + dy * dy) - radius)
  // }

  export function samePoint(x1: number, y1: number, x2: number, y2: number): boolean {
    return Math.round(x1) === Math.round(x2) && Math.round(y1) === Math.round(y2);
  }
}
