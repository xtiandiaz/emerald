import { Point } from 'pixi.js'
import { Vector } from '../types'
import {
  ProjectionOverlap,
  Shape,
  Circle,
  ConvexPolygon,
  hasProjectionOverlap,
  overlapDepth,
} from '../geometry'

export class ShapeOverlap {
  private constructor(
    public readonly depth: number,
    public readonly normal: Vector,
  ) {}

  static from(a: Shape, b: Shape): ShapeOverlap | undefined {
    if (!a.hasAABB(b)) {
      return
    }
    if (a instanceof Circle) {
      if (b instanceof Circle) {
        return this.fromCircleToCircle(a, b)
      } else if (b instanceof ConvexPolygon) {
        return this.fromCircleToPolygon(a, b)
      }
    } else if (a instanceof ConvexPolygon) {
      if (b instanceof Circle) {
        return this.fromPolygonToCircle(a, b)
      } else if (b instanceof ConvexPolygon) {
        return this.fromPolygonToPolygon(a, b)
      }
    }
    throw new Error('Undefined overlap')
  }

  private static fromCircleToCircle(a: Circle, b: Circle): ShapeOverlap | undefined {
    const radii = a.radius + b.radius
    const diffPos = b._center.subtract(a._center)
    const distSqrd = diffPos.magnitudeSquared()
    if (distSqrd >= radii * radii) {
      return
    }
    const dist = Math.sqrt(distSqrd)
    return new this(radii - dist, diffPos.divideByScalar(dist))
  }

  private static fromCircleToPolygon(a: Circle, b: ConvexPolygon): ShapeOverlap | undefined {
    const v = b._vertices[b.getClosestVertexIndex(a._center)]
    const axis = new Point(v.x - a._center.x, v.y - a._center.y)
    axis.normalize(axis)
    let proj_a = a.getProjectionRange(axis)
    let proj_b = b.getProjectionRange(axis)
    if (!hasProjectionOverlap(proj_a, proj_b)) {
      return
    }
    const po: ProjectionOverlap = { depth: overlapDepth(proj_a, proj_b), axis }
    if (!b.hasProjectionOverlap(a, po)) {
      return
    }
    this.correctDirectionIfNeeded(a, b, po.axis)
    return this.fromProjectionOverlap(po)
  }

  private static fromPolygonToCircle(a: ConvexPolygon, b: Circle): ShapeOverlap | undefined {
    const overlap = this.fromCircleToPolygon(b, a)
    overlap?.normal.multiplyScalar(-1, overlap.normal)
    return overlap
  }

  private static fromPolygonToPolygon(
    a: ConvexPolygon,
    b: ConvexPolygon,
  ): ShapeOverlap | undefined {
    const po: ProjectionOverlap = { depth: Infinity, axis: new Point() }
    if (!a.hasProjectionOverlap(b, po) || !b.hasProjectionOverlap(a, po)) {
      return
    }
    this.correctDirectionIfNeeded(a, b, po.axis)
    return this.fromProjectionOverlap(po)
  }

  private static fromProjectionOverlap(projOverlap: ProjectionOverlap): ShapeOverlap {
    return new this(projOverlap.depth, projOverlap.axis.clone())
  }

  private static correctDirectionIfNeeded(a: Shape, b: Shape, normal: Vector) {
    if (b._center.subtract(a._center).dot(normal) < 0) {
      normal.multiplyByScalar(-1, normal)
    }
  }
}
