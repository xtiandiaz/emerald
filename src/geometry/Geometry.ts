import { Point, type PointData } from 'pixi.js'
import type { Vector, Range, VectorData } from '../core/types'

export namespace Geometry {
  export class Segment {
    get vector(): Vector {
      return this.b.subtract(this.a)
    }

    get magnitudeSqrd(): number {
      return this.vector.magnitudeSquared()
    }

    constructor(
      public a = new Point(),
      public b = new Point(),
    ) {}

    getPointAtNormalizedDistance(normDist: number, out_point?: Point): Point {
      if (normDist <= 0) {
        return this.a
      } else if (normDist >= 1) {
        return this.b
      } else {
        out_point ??= new Point()
        return this.a.add(this.vector.multiplyScalar(normDist, out_point), out_point)
      }
    }

    getClosestPoint(to: Point, out_closestPoint?: Point): Point {
      const targetVector = to.subtract(this.a)
      out_closestPoint ??= new Point()

      return this.getPointAtNormalizedDistance(
        targetVector.dot(this.vector) / this.magnitudeSqrd,
        out_closestPoint,
      )
    }

    projectAndClipByMargin(axis: Vector, margin: number) {
      const aProjByMargin = axis.dot(this.a) - margin
      const bProjByMargin = axis.dot(this.b) - margin

      if (aProjByMargin * bProjByMargin < 0) {
        const newPoint = new Point()
        this.getPointAtNormalizedDistance(aProjByMargin / (aProjByMargin - bProjByMargin), newPoint)
        if (aProjByMargin < 0) {
          this.a = newPoint
        } else {
          this.b = newPoint
        }
      }
    }
  }

  export type AABB = {
    min: PointData
    max: PointData
  }

  export function isAABBIntersection(a: AABB, b: AABB): boolean {
    return !(a.max.x < b.min.x || a.max.y < b.min.y || b.max.x < a.min.x || b.max.y < a.min.y)
  }

  export function hasProjectionOverlap(a: Range, b: Range): boolean {
    return !(a.max <= b.min || b.max <= a.min)
  }

  export interface ProjectionOverlap {
    depth: number
    normal: Vector
  }

  export function evaluateProjectionOverlap(
    projA: Range,
    projB: Range,
    axis: VectorData,
    out_overlap: ProjectionOverlap,
  ): boolean {
    if (!Geometry.hasProjectionOverlap(projA, projB)) {
      return false
    }
    const depth = Math.min(projA.max - projB.min, projB.max - projA.min)
    if (depth < out_overlap.depth) {
      out_overlap.depth = depth
      out_overlap.normal.copyFrom(axis)
    }
    return true
  }

  export namespace Circle {
    export const area = (radius: number) => Math.PI * radius * radius

    export function getProjectionRange(position: PointData, radius: number, axis: Vector): Range {
      const dot = axis.x * position.x + axis.y * position.y
      const projs: [number, number] = [dot - radius, dot + radius]

      return projs[0] < projs[1]
        ? { min: projs[0], max: projs[1] }
        : { min: projs[1], max: projs[0] }
    }
  }

  export namespace ConvexPolygon {
    /* 
    Following 'integraph' of a polygon technique: https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
  */
    export function calculateCentroid(vertices: number[]) {
      const c = new Point()
      let x0: number, y0: number, x1: number, y1: number
      let doubleTotalArea = 0
      let crossProdSignedParalleloArea: number
      for (let i = 0; i < vertices.length; i += 2) {
        x0 = vertices[i]!
        y0 = vertices[i + 1]!
        x1 = vertices[(i + 2) % vertices.length]!
        y1 = vertices[(i + 3) % vertices.length]!
        crossProdSignedParalleloArea = x0 * y1 - x1 * y0
        c.x += (x0 + x1) * crossProdSignedParalleloArea
        c.y += (y0 + y1) * crossProdSignedParalleloArea
        doubleTotalArea += crossProdSignedParalleloArea
      }
      c.x /= 6 * 0.5 * doubleTotalArea
      c.y /= 6 * 0.5 * doubleTotalArea

      return c
    }

    export function getProjectionRange(vertices: Point[], axis: VectorData): Range {
      const range: Range = { min: Infinity, max: -Infinity }
      let proj: number

      for (let i = 0; i < vertices.length; i++) {
        proj = vertices[i]!.dot(axis)
        range.min = Math.min(range.min, proj)
        range.max = Math.max(range.max, proj)
      }
      return range
    }

    export function getVertexIndexWithMaxProjection(vertices: Point[], axis: VectorData): number {
      let maxProjection = -Infinity
      let index = -1

      for (let i = 0; i < vertices.length; i++) {
        const proj = vertices[i]!.dot(axis)
        if (proj > maxProjection) {
          maxProjection = proj
          index = i
        }
      }
      return index
    }

    export function getEdgeAcrossNormal(vertices: Point[], normal: VectorData): Segment {
      const vi = getVertexIndexWithMaxProjection(vertices, normal)
      const v = vertices[vi]!
      const prev_v = vertices[(vi == 0 ? vertices.length : vi) - 1]!
      const next_v = vertices[(vi + 1) % vertices.length]!
      // Prev. and next order are assumed clockwise,
      // albeit the vertices of the segments are set in a linear order, 'a' to 'b',
      // which at the vertices order is counter-clockwise
      const prevEdge = new Segment(v, prev_v)
      const nextEdge = new Segment(next_v, v)
      // We want the most perpendicular edge to the normal, thus that with the smaller projection
      return Math.abs(prevEdge.vector.dot(normal)) <= Math.abs(nextEdge.vector.dot(normal))
        ? prevEdge
        : nextEdge
    }

    export function getClosestVertexIndexToPoint(point: PointData, vertices: Point[]): number {
      let index = -1
      let distSqrd = Infinity

      for (let i = 0; i < vertices.length; i++) {
        const dSq = vertices[i]!.subtract(point).magnitudeSquared()
        if (dSq < distSqrd) {
          distSqrd = dSq
          index = i
        }
      }
      return index
    }
  }
}
