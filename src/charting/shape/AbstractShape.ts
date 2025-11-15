import { Shape, Model } from "./Shape";

abstract class AbstractShape<M extends Model> implements Shape<M> {
  public static readonly HIT_TEST_SQUARE_RADIUS = 2;

  protected abstract createModel(): M;
  protected abstract plotWidget(): void;
  protected abstract renderWidget(): void;

  isOpaque = false;
  isFilled = false;

  /** override it if only contains children (plotWidget() do noting) */
  isContainerOnly = false;

  foreground = "#000000";
  background?: string;

  location = new DOMPoint(0, 0);

  bounds = new DOMRect(0, 0, 0, 0);

  #model?: M;

  #colorToPathPair: Map<string, [string, string]> = new Map();

  #children: Shape<Model>[] = [];

  children(): Shape<Model>[] {
    return this.#children;
  }

  containsPoint(point: DOMPoint): boolean {
    return Shape.containsPoint(this.bounds, point);
  }

  contains(rect: DOMRect): boolean {
    if (this.isOpaque) {
      return Shape.intersectsRect(this.bounds, rect)

    } else {
      if (this.isContainerOnly) {
        return this.childrenContain(rect);

      } else {
        return this.widgetContains(rect) || this.childrenIntersect(rect)
      }
    }
  }

  protected widgetContains(rect: DOMRect): boolean {
    return Shape.containsRect(this.bounds, rect);
  }

  protected childrenContain(rect: DOMRect): boolean {
    return this.#children.some((x) => x.contains(rect));
  }

  intersects(rect: DOMRect): boolean {
    if (this.isOpaque) {
      return Shape.intersectsRect(this.bounds, rect);

    } else {
      if (this.isContainerOnly) {
        return this.childrenIntersect(rect);

      } else {
        return this.widgetIntersects(rect) || this.childrenIntersect(rect)
      }
    }
  }

  protected abstract widgetIntersects(rect: DOMRect): boolean;

  protected childrenIntersect(rect: DOMRect): boolean {
    if (this.#children == null) return false

    return this.#children.some((x) => x.intersects(rect));
  }

  hits(point: DOMPoint): boolean {
    return this.intersects(
      new DOMRect(
        point.x - AbstractShape.HIT_TEST_SQUARE_RADIUS,
        point.y - AbstractShape.HIT_TEST_SQUARE_RADIUS,
        2 * AbstractShape.HIT_TEST_SQUARE_RADIUS,
        2 * AbstractShape.HIT_TEST_SQUARE_RADIUS));
  }

  model(): M {
    if (this.#model === undefined) {
      this.#model = this.createModel();
    }

    return this.#model;
  }

  plot() {
    this.reset();
    this.plotWidget();
  }


  render() {
    let backupTransform = g.getTransform
    if (!(this.location.x == 0 && this.location.y == 0)) {
      g.translate(this.location.x, this.location.y)
    }

    let backupClip = g.getClip
    g.clip(this.bounds)

    let clipBounds = g.getClipBounds
    if (this.intersects(clipBounds) ||
      clipBounds.contains(this.bounds) ||
      this.bounds.height == 1 ||
      this.bounds.width == 1) {
      if (this.isOpaque) {
        g.setPaint(this.background)
        g.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height)
      }

      this.renderWidget();
      this.renderChildren();
    }

    g.setClip(backupClip)
    g.setTransform(backupTransform)
  }

  protected renderChildren() {
    if (this.#children == null) return

    let clipBounds = g.getClipBounds
    for (let child of this.#children) {
      if (child.intersects(clipBounds) ||
        clipBounds.contains(child.bounds) ||
        child.bounds.height == 1 ||
        child.bounds.width == 1) {
        switch (child.kind) {
          case 'PathShape':
            let color = child.foreground
            let [pathToDraw, pathToFill] = this.#colorToPathPair.get(color).getOrElse(() => {
              let toDraw = borrowPath
              let toFill = borrowPath
              colorToPathPair.put(color, (toDraw, toFill))
              [toDraw, toFill]
            });

            let path = x.getPath
            let location = child.getLocation
            let shape = if (location.x == 0 && location.y == 0) {
              let transform = AffineTransform.getTranslateInstance(location.x, location.y)
              path.createTransformedShape(transform)
            } else path

            if (x.isFilled) {
              pathToFill.append(shape, false)
            } else {
              pathToDraw.append(shape, false)
            }
            break;
          default: child.render(g);
        }
      }
    }

    if (this.#colorToPathPair != null) {
      for (let (color, (pathToDraw, pathToFill)) of this.#colorToPathPair) {
        g.setColor(color)

        if (pathToDraw != null) {
          g.draw(pathToDraw)
          returnPath(pathToDraw)
        }

        if (pathToFill != null) {
          g.draw(pathToFill) // g.fill only fills shape's interior, we need draw shape too
          g.fill(pathToFill)
          returnPath(pathToFill);
        }
      }

      this.#colorToPathPair.clear()
    }
  }

  addChild<T extends Shape<Model>>(child: T): T {
    this.#children.push(child)
    return child;
  }

  removeChild(child: Shape<Model>) {
    const index = this.#children.indexOf(child);
    if (index >= 0) {
      this.#children.splice(index, 1);
    }
  }

  getChildren(): Shape<Model>[] {
    return this.#children;
  }

  resetChildren() {
    for (let child of this.#children) {
      child.reset();
    }
  }

  clearChildren() {
    this.#children.length = 0;
  }

  lookupChildren<T extends Shape<Model>>(shapeType: Class[T], foreground: Color): T[] {
    let result: T[] = [];

    for (let child of this.#children) {
      if (shapeType.isInstance(child) && child.foreground == foreground) {
        result.push(child);
      }
    }

    return result;
  }

  lookupFirstChild<T extends Shape<Model>>(shapeType: Class<T>, foreground: Color): Option<T> {
    return this.#children.find(x => shapeType.isInstance(x) && x.foreground == foreground);
  }

  reset() {
    for (let child of this.#children) {
      child.reset();
    }
    this.#children.length = 0;
  }

}