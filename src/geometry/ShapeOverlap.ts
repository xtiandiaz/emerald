import { Point, PointData } from 'pixi.js'
import { ProjectionOverlap, ProjectionRange } from './types'
import { Shape } from '..'
import { Circle, ConvexPolygon } from './shapes'
import { hasProjectionOverlap, overlapDepth } from './utils'
import { Vector } from '../types'

export class ShapeOverlap {
  constructor(
    public depth: number,
    public normal: Vector,
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

  static fromCircleToCircle(a: Circle, b: Circle): ShapeOverlap | undefined {
    const radii = a.radius + b.radius
    const diffPos = b.center.subtract(a.center)
    const distSqrd = diffPos.magnitudeSquared()
    if (distSqrd >= radii * radii) {
      return
    }
    const dist = Math.sqrt(distSqrd)
    return new this(radii - dist, diffPos.divideByScalar(dist))
  }

  static fromCircleToPolygon(a: Circle, b: ConvexPolygon): ShapeOverlap | undefined {
    const cv = b.getClosestVertex(a.center)![1]
    const axis = new Point(cv.x - a.center.x, cv.y - a.center.y)
    axis.normalize(axis)
    let proj_a = a.getProjectionRange(axis)
    let proj_b = b.getProjectionRange(axis)
    if (!hasProjectionOverlap(proj_a, proj_b)) {
      return
    }
    const projOverlap: ProjectionOverlap = { depth: overlapDepth(proj_a, proj_b), axis }

    if (
      !this.hasVerticesProjectionOverlap(
        b._vertices,
        (axis) => b.getProjectionRange(axis),
        (axis) => a.getProjectionRange(axis),
        projOverlap,
      )
    ) {
      return
    }
    this.correctDirectionIfNeeded(a, b, projOverlap.axis)

    return this.fromProjectionOverlap(projOverlap)
  }

  static fromPolygonToCircle(a: ConvexPolygon, b: Circle): ShapeOverlap | undefined {
    const overlap = this.fromCircleToPolygon(b, a)
    overlap?.normal.multiplyScalar(-1, overlap.normal)

    return overlap
  }

  static fromPolygonToPolygon(a: ConvexPolygon, b: ConvexPolygon): ShapeOverlap | undefined {
    const projOverlap: ProjectionOverlap = { depth: Infinity, axis: new Point() }

    if (
      !this.hasVerticesProjectionOverlap(
        a._vertices,
        (axis) => a.getProjectionRange(axis),
        (axis) => b.getProjectionRange(axis),
        projOverlap,
      ) ||
      !this.hasVerticesProjectionOverlap(
        b._vertices,
        (axis) => b.getProjectionRange(axis),
        (axis) => a.getProjectionRange(axis),
        projOverlap,
      )
    ) {
      return
    }
    this.correctDirectionIfNeeded(a, b, projOverlap.axis)

    return this.fromProjectionOverlap(projOverlap)
  }

  private static hasVerticesProjectionOverlap(
    vertices_a: Point[],
    proj_a: (axis: PointData) => ProjectionRange,
    proj_b: (axis: PointData) => ProjectionRange,
    result: ProjectionOverlap,
  ): boolean {
    const axis = new Point()
    let range_a: ProjectionRange,
      range_b: ProjectionRange,
      depth = Infinity

    for (let i = 0; i < vertices_a.length; i++) {
      vertices_a[(i + 1) % vertices_a.length]!.subtract(vertices_a[i]!, axis)
        .orthogonalize(axis)
        .normalize(axis)
      range_a = proj_a(axis)
      range_b = proj_b(axis)

      if (!hasProjectionOverlap(range_a, range_b)) {
        return false
      }
      depth = overlapDepth(range_a, range_b)
      if (depth < result.depth) {
        result.depth = depth
        result.axis.copyFrom(axis)
      }
    }
    return true
  }

  private static correctDirectionIfNeeded(a: Shape, b: Shape, normal: Vector) {
    if (b.center.subtract(a.center).dot(normal) < 0) {
      normal.multiplyByScalar(-1, normal)
    }
  }

  private static fromProjectionOverlap(projOverlap: ProjectionOverlap): ShapeOverlap {
    return new this(projOverlap.depth, projOverlap.axis.clone())
  }
}
