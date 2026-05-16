import { Point, PointData } from 'pixi.js'
import { BoundingBox, ProjectionRange } from '.'
import { EMath } from '../extras'

export const toDegrees = (radians: number) => (radians * 180) / Math.PI
export const toRadians = (degrees: number) => (degrees * Math.PI) / 180

export const isAABB = (a: BoundingBox, b: BoundingBox): boolean => {
  return !(a.max.x < b.min.x || a.max.y < b.min.y || b.max.x < a.min.x || b.max.y < a.min.y)
}

export const hasProjectionOverlap = (a: ProjectionRange, b: ProjectionRange): boolean => {
  return !(a.max <= b.min || b.max <= a.min)
}

export const overlapDepth = (a: ProjectionRange, b: ProjectionRange): number => {
  return Math.min(a.max - b.min, b.max - a.min)
}

export function getClosestPoint(
  at: PointData[],
  from: PointData,
): [index: number, point: PointData] | undefined {
  let dx: number,
    dy: number,
    distSq: number,
    minDistSq = Infinity,
    index = -1

  for (let i = 0; i < at.length; i++) {
    dx = at[i]!.x - from.x
    dy = at[i]!.y - from.y
    distSq = dx * dx + dy * dy
    if (distSq < minDistSq) {
      minDistSq = distSq
      index = i
    }
  }
  return index >= 0 ? [index, at[index]] : undefined
}

/* 
  Calculation of centroid following 'integraph of a polygon' technique: 
  https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
  
  For the area, using 'shoelace' formula: https://en.wikipedia.org/wiki/Shoelace_formula
*/
export function calculatePolygonAttributes(vertices: PointData[]): { area: number; center: Point } {
  const center = new Point()
  let v0: PointData, v1: PointData
  let paralleloArea: number
  let area = 0

  for (let i = 0; i < vertices.length; i++) {
    v0 = vertices[i]!
    v1 = vertices[(i + 1) % vertices.length]!
    paralleloArea = EMath.cross(v0, v1)
    center.x += (v0.x + v1.x) * paralleloArea
    center.y += (v0.y + v1.y) * paralleloArea
    area += paralleloArea * 0.5 // = triangle area
  }
  center.divideByScalar(6 * area, center)

  return { area, center }
}
