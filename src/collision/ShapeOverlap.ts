import { Vector } from '../types'
import {
  ProjectionOverlap,
  Shape,
  Circle,
  ConvexPolygon,
  hasProjectionOverlap,
  overlapDepth,
  ProjectionRange,
} from '../geometry'

export class ShapeOverlap {
  _depth = 0
  readonly _normal = new Vector()

  protected readonly _negNormal = new Vector()

  protected props = {
    v: new Vector(),
    prs: [
      { min: 0, max: 0 },
      { min: 0, max: 0 },
    ] as [ProjectionRange, ProjectionRange],
    po: { depth: 0, axis: new Vector() } as ProjectionOverlap,
  }

  get hasOverlap(): boolean {
    return this._depth >= 0
  }

  static _from(a: Shape, b: Shape, out_sp?: ShapeOverlap): ShapeOverlap {
    out_sp ??= new ShapeOverlap()
    out_sp._depth = -Infinity

    if (a.hasAABB(b)) {
      if (a instanceof Circle) {
        if (b instanceof Circle) {
          this.fromCircleToCircle(a, b, out_sp)
        } else if (b instanceof ConvexPolygon) {
          this.fromCircleToPolygon(a, b, out_sp)
        }
      } else if (a instanceof ConvexPolygon) {
        if (b instanceof Circle) {
          this.fromPolygonToCircle(a, b, out_sp)
        } else if (b instanceof ConvexPolygon) {
          this.fromPolygonToPolygon(a, b, out_sp)
        }
      } else {
        throw new Error('Undefined overlap')
      }
    }

    out_sp._normal.multiplyByScalar(-1, out_sp._negNormal)
    return out_sp
  }

  private static fromCircleToCircle(a: Circle, b: Circle, so: ShapeOverlap) {
    const radii = a.radius + b.radius
    const abvec = b._center.subtract(a._center, so.props.v)
    const distSqrd = abvec.magnitudeSquared()
    if (distSqrd >= radii * radii) {
      return
    }
    const dist = Math.sqrt(distSqrd)
    so._depth = radii - dist
    so._normal.copyFrom(abvec.divideByScalar(dist, abvec))
  }

  private static fromCircleToPolygon(a: Circle, b: ConvexPolygon, so: ShapeOverlap) {
    const v = b._vertices[b.getClosestVertexIndex(a._center)]
    let axis = v.subtract(a._center, so.props.v)
    axis.normalize(axis)

    let proj_a = a.getProjectionRange(axis, so.props.prs[0])
    let proj_b = b.getProjectionRange(axis, so.props.prs[1])
    if (!hasProjectionOverlap(proj_a, proj_b)) {
      return
    }
    const po = so.props.po
    po.depth = overlapDepth(proj_a, proj_b)
    axis = po.axis.copyFrom(axis)
    if (!b.hasProjectionOverlap(a, po)) {
      return
    }
    this.correctDirectionIfNeeded(a, b, axis)

    so._depth = po.depth
    so._normal.copyFrom(axis)
  }

  private static fromPolygonToCircle(a: ConvexPolygon, b: Circle, so: ShapeOverlap) {
    this.fromCircleToPolygon(b, a, so)
    if (so.hasOverlap) {
      this.correctDirectionIfNeeded(a, b, so._normal)
    }
  }

  private static fromPolygonToPolygon(a: ConvexPolygon, b: ConvexPolygon, so: ShapeOverlap) {
    const po = so.props.po
    po.depth = Infinity

    if (!a.hasProjectionOverlap(b, po) || !b.hasProjectionOverlap(a, po)) {
      return
    }
    this.correctDirectionIfNeeded(a, b, po.axis)

    so._depth = po.depth
    so._normal.copyFrom(po.axis)
  }

  private static correctDirectionIfNeeded(a: Shape, b: Shape, normal: Vector) {
    if (b._center.subtract(a._center).dot(normal) < 0) {
      normal.multiplyByScalar(-1, normal)
    }
  }
}
