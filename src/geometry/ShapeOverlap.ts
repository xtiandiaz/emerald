import { Point } from 'pixi.js'
import { ProjectionOverlap } from './types'
import { Circle, Polygon, Shape } from './shapes'
import { hasProjectionOverlap, overlapDepth } from './utils'
import { Vector } from '../types'

export class ShapeOverlap implements ProjectionOverlap {
  constructor(
    public depth: number,
    public normal: Point,
  ) {}

  static from(a: Shape, b: Shape): ShapeOverlap | undefined {
    if (!a.hasAABB(b)) {
      return
    }

    if (a instanceof Circle) {
      if (b instanceof Circle) {
        return this.fromCircleToCircle(a, b)
      } else if (b instanceof Polygon) {
        return this.fromCircleToPolygon(a, b)
      }
    } else if (a instanceof Polygon) {
      if (b instanceof Circle) {
        return this.fromPolygonToCircle(a, b)
      } else if (b instanceof Polygon) {
        return this.fromPolygonToPolygon(a, b)
      }
    }
    return
  }

  static fromCircleToCircle(a: Circle, b: Circle): ShapeOverlap | undefined {
    const radii = a.radius + b.radius
    const diffPos = b.center.subtract(a.center)
    const distSqrd = diffPos.magnitudeSquared()
    if (distSqrd >= radii * radii) {
      return
    }
    const dist = Math.sqrt(distSqrd)

    return new ShapeOverlap(radii - dist, diffPos.divideByScalar(dist))
  }

  static fromCircleToPolygon(a: Circle, b: Polygon): ShapeOverlap | undefined {
    const cv = b.getClosestVertex(a.center)![1]
    let axis = new Point(cv.x - a.center.x, cv.y - a.center.y)
    axis.normalize(axis)
    let proj_a = a.getProjectionRange(axis)
    let proj_b = b.getProjectionRange(axis)
    if (!hasProjectionOverlap(proj_a, proj_b)) {
      return
    }
    let depth = overlapDepth(proj_a, proj_b)

    for (let i = 0; i < b._vertices.length; i++) {
      b._vertices[(i + 1) % b._vertices.length]!.subtract(b._vertices[i]!, axis)
        .orthogonalize(axis)
        .normalize(axis)
      proj_a = a.getProjectionRange(axis)
      proj_b = b.getProjectionRange(axis)
      if (!hasProjectionOverlap(proj_a, proj_b)) {
        return
      }
      depth = Math.min(depth, overlapDepth(proj_a, proj_b))
    }

    this.correctDirectionIfNeeded(a, b, axis)

    return new this(depth, axis)
  }

  static fromPolygonToCircle(a: Polygon, b: Circle): ShapeOverlap | undefined {
    return
  }

  static fromPolygonToPolygon(a: Polygon, b: Polygon): ShapeOverlap | undefined {
    return
  }

  static correctDirectionIfNeeded(a: Shape, b: Shape, normal: Vector) {
    if (b.center.subtract(a.center).dot(normal) < 0) {
      normal.multiplyScalar(-1, normal)
    }
  }
}
