import { Point, PointData } from 'pixi.js'
import { BoundingBox, ProjectionRange } from '.'

export const degrees = (radians: number) => (radians * 180) / Math.PI
export const radians = (degrees: number) => (degrees * Math.PI) / 180

export const isAABB = (a: BoundingBox, b: BoundingBox): boolean => {
  return !(a.max.x < b.min.x || a.max.y < b.min.y || b.max.x < a.min.x || b.max.y < a.min.y)
}

export const hasProjectionOverlap = (a: ProjectionRange, b: ProjectionRange): boolean => {
  return !(a.max <= b.min || b.max <= a.min)
}

export const overlapDepth = (a: ProjectionRange, b: ProjectionRange): number => {
  return Math.min(a.max - b.min, b.max - a.min)
}

export function getClosestPointIndex(at: PointData[], from: PointData): number {
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
  return index
}
