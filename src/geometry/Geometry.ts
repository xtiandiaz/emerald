import { Point, type PointData } from 'pixi.js'
import type { Vector, Range, VectorData } from '../core/types'
import { EMath } from '../extras'
import '../augmentations/pixi.augmentations'
import { Physics } from '../physics'

export namespace Geometry {
  export class Segment {
    get vector(): Vector {
      return this.b.subtract(this.a)
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
      const vector = this.vector

      return this.getPointAtNormalizedDistance(
        targetVector.dot(vector) / vector.magnitudeSquared(),
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

  export interface AreaProperties {
    centroid: Point
    physics: Physics.AreaProperties
  }

  export namespace Circle {
    export const area = (radius: number) => Math.PI * radius * radius

    export const projectionRange = (position: PointData, radius: number, axis: Vector): Range => {
      const dot = axis.x * position.x + axis.y * position.y
      const projs: [number, number] = [dot - radius, dot + radius]

      return projs[0] < projs[1]
        ? { min: projs[0], max: projs[1] }
        : { min: projs[1], max: projs[0] }
    }

    export const areaProperties = (
      radius: number,
      density: number = 1,
      localOffset?: PointData,
    ): AreaProperties => {
      const area = Circle.area(radius)
      return {
        centroid: new Point(localOffset?.x, localOffset?.y),
        physics: {
          mass: area * density,
          // Listed in: https://en.wikipedia.org/wiki/List_of_second_moments_of_area
          // where PI * r^4 / 2 = area * r^2 / 2
          momentOfInertia: (area * radius * radius) / 2,
        },
      }
    }
  }

  export namespace Polygon {
    /*
      Using 'shoelace' formula: https://en.wikipedia.org/wiki/Shoelace_formula
    */
    export const area = (vertices: Point[]) => {
      let doubleArea = 0
      let v0: Point, v1: Point

      for (let i = 0; i < vertices.length; i++) {
        v0 = vertices[i]!
        v1 = vertices[(i + 1) % vertices.length]!
        doubleArea += v0.cross(v1)
      }

      return doubleArea * 0.5
    }

    /* 
      Calculation of centroid following 'integraph of a polygon' technique: 
      https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
      
      For the area, using 'shoelace' formula: https://en.wikipedia.org/wiki/Shoelace_formula
    */
    export const areaProperties = (vertices: Point[], density: number = 1): AreaProperties => {
      const centroid = new Point()
      let v0: Point, v1: Point
      let crossProdSignedParalleloArea: number, triangleArea: number
      let area = 0
      let momentOfInertia = 0

      for (let i = 0; i < vertices.length; i++) {
        v0 = vertices[i]!
        v1 = vertices[(i + 1) % vertices.length]!
        crossProdSignedParalleloArea = v0.cross(v1)
        centroid.x += (v0.x + v1.x) * crossProdSignedParalleloArea
        centroid.y += (v0.y + v1.y) * crossProdSignedParalleloArea
        triangleArea = crossProdSignedParalleloArea * 0.5
        area += triangleArea
        // Triangular MoI listed in: https://en.wikipedia.org/wiki/List_of_moments_of_inertia
        momentOfInertia += (triangleArea * density * (v0.dot(v0) + v0.dot(v1) + v1.dot(v1))) / 6
      }
      centroid.divideByScalar(6 * area, centroid)
      // Moment of Inertia (I=mr^2) translated to centroid once calculated
      const mass = area * density
      momentOfInertia -= mass * centroid.dot(centroid)

      return {
        centroid,
        physics: {
          mass,
          momentOfInertia,
        },
      }
    }

    export const projectionRange = (vertices: Point[], axis: VectorData): Range => {
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

    export function createRegularPolygonVertices(radius: number, sides: number): Point[] {
      sides = EMath.clamp(Math.round(sides), 3, 16)
      radius = EMath.clamp(radius, 1, Infinity)
      const vertices: Point[] = []
      const angleStep = (2 * Math.PI) / sides

      for (let i = 0; i < sides; i++) {
        vertices.push(new Point(radius * Math.cos(i * angleStep), radius * Math.sin(i * angleStep)))
      }

      return vertices
    }
  }
}
