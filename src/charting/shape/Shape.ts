

export interface Model {
  // Define properties and methods for the WidgetModel here
}




/**
 * bounds(x, y, width, height) is relative to location(lx, ly), so the final
 * position of widget will be shifted by offset: location(lx, ly upon to
 * (bounds.x, bounds.y). That is, the coordinate (x, y) of bounds' left-top
 * corner relative to origin point(0, 0) will be (x + lx, y + ly).
 *
 * We can use the different bounds + offset(location) combination to define the
 * postion of widget and move it.
 *
 * origin(0,0)
 * +------------------------------------------------------> x
 * |
 * |    * location(lx, ly)
 * |     \
 * |      \
 * |       \ (x + lx, y + ly)
 * |        +------------+  -
 * |        |            |  |
 * |        |   bounds   | height
 * |        |            |  |
 * |        +------------+  _
 * |        |--  width --|
 * |
 * |
 * V
 * y
 *
 */
export interface Shape<M extends Model> {
  kind: 'PathShape' | 'OtherShape';

  isOpaque: boolean;
  isFilled: boolean;
  isContainerOnly: boolean;

  foreground: string;
  background?: string;

  location: DOMPoint;

  bounds: DOMRect;

  containsPoint(point: DOMPoint): boolean;
  contains(rect: DOMRect): boolean;

  intersects(rect: DOMRect): boolean;

  hits(point: DOMPoint): boolean;

  model(): M | undefined;

  plot(): void;
  render(): void;
  reset(): void;

  children(): Shape<Model>[];
  addChild<T extends Shape<Model>>(child: T): T;
  removeChild(child: Shape<Model>): void;
  clearChildren(): void;
  lookupChildren<T extends Shape<Model>>(shapeType: new () => T, foreground: string): T[];
  lookupFirstChild<T extends Shape<Model>>(shapeType: new () => T, foreground: string): undefined | T;
}

export namespace Shape {
  export function intersectsRect(rectA: DOMRect, rectB: DOMRect) {
    return (
      rectA.left < rectB.right &&
      rectA.right > rectB.left &&
      rectA.top < rectB.bottom &&
      rectA.bottom > rectB.top
    );
  }

  export function containsPoint(rect: DOMRect, point: DOMPoint) {
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  }

  export function containsRect(outerRect: DOMRect, innerRect: DOMRect) {
    return (
      outerRect.left <= innerRect.left &&
      outerRect.top <= innerRect.top &&
      outerRect.right >= innerRect.right &&
      outerRect.bottom >= innerRect.bottom
    );
  }


}