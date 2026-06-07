import { Point, PointData } from 'pixi.js'
import { Vector, VectorData } from '../types'

export class Segment {
  _vector = new Vector()
  private _points: [Point, Point] = [new Point(), new Point()]

  get p0(): Point {
    return this._points[0]
  }
  get p1(): Point {
    return this._points[1]
  }

  static from(p0: PointData, p1: PointData): Segment {
    const s = new Segment()
    s.reset(p0, p1)
    return s
  }

  static getMostPerpendicular(a: Segment, b: Segment, to: VectorData): Segment {
    return Math.abs(a._vector.dot(to)) <= Math.abs(b._vector.dot(to)) ? a : b
  }

  reset(p0: PointData, p1: PointData) {
    this.p0.copyFrom(p0)
    this.p1.copyFrom(p1)
    this.p1.subtract(this.p0, this._vector)
  }

  copyFrom(other: Segment) {
    this.p0.copyFrom(other.p0)
    this.p1.copyFrom(other.p1)
    this._vector.copyFrom(other._vector)
  }

  getClosestPoint(to: Point, out_point?: Point): Point {
    out_point ??= new Point()
    return this.getPointAlongAtNormalizedDistance(
      to.subtract(this.p0).dot(this._vector) / this._vector.magnitudeSquared(),
      out_point,
    )
  }

  getPointAlongAtNormalizedDistance(normDist: number, out_point?: Point): Point {
    out_point ??= new Point()
    if (normDist <= 0) {
      out_point.copyFrom(this.p0)
    } else if (normDist >= 1) {
      out_point.copyFrom(this.p1)
    } else {
      this._vector.multiplyByScalar(normDist, out_point)
      out_point.add(this.p0, out_point)
    }
    return out_point
  }

  clipByMarginAlongRef(margin: number, ref: Vector) {
    const d0 = ref.dot(this.p0) - margin
    const d1 = ref.dot(this.p1) - margin
    if (d0 * d1 >= 0) {
      return
    }
    const p = this.getPointAlongAtNormalizedDistance(d0 / (d0 - d1))
    if (d0 < 0) {
      this.p0.copyFrom(p)
    } else {
      this.p1.copyFrom(p)
    }
    this.p1.subtract(this.p0, this._vector)
  }
}
