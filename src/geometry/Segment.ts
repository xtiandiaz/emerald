import { Point } from 'pixi.js'
import { Vector, VectorData } from '../types'

export class Segment {
  readonly _p0 = new Point()
  readonly _p1 = new Point()
  readonly _vector = new Vector()

  private readonly props = {
    point: new Point(),
  }

  static from(p0: Point, p1: Point): Segment {
    const s = new this()
    s.reset(p0, p1)
    return s
  }

  static getMostPerpendicular(a: Segment, b: Segment, axis: VectorData): Segment {
    return Math.abs(a._vector.dot(axis)) <= Math.abs(b._vector.dot(axis)) ? a : b
  }

  reset(p0: Point, p1: Point): Segment {
    this._p0.copyFrom(p0)
    this._p1.copyFrom(p1)
    p1.subtract(p0, this._vector)
    return this
  }

  resetVector() {}

  copyFrom(other: Segment) {
    this._p0.copyFrom(other._p0)
    this._p1.copyFrom(other._p1)
    this._vector.copyFrom(other._vector)
  }

  getClosestPoint(to: Point, out_point?: Point): Point {
    out_point ??= new Point()
    const targetVector = to.subtract(this._p0)

    return this.getPointAtNormalizedDistance(
      targetVector.dot(this._vector) / this._vector.magnitudeSquared(),
      out_point,
    )
  }

  projectAndClipByMargin(axis: Vector, margin: number) {
    const p0_mproj = axis.dot(this._p0) - margin
    const p1_mproj = axis.dot(this._p1) - margin

    if (p0_mproj * p1_mproj < 0) {
      this.getPointAtNormalizedDistance(p0_mproj / (p0_mproj - p1_mproj), this.props.point)
      if (p0_mproj < 0) {
        this.reset(this.props.point, this._p1)
      } else {
        this.reset(this._p0, this.props.point)
      }
    }
  }

  private getPointAtNormalizedDistance(normDist: number, out_point?: Point): Point {
    out_point ??= new Point()
    if (normDist <= 0) {
      out_point.copyFrom(this._p0)
    } else if (normDist >= 1) {
      out_point.copyFrom(this._p1)
    } else {
      return this._p0.add(this._vector, out_point).multiplyByScalar(normDist, out_point)
    }
    return out_point
  }
}
