import { PointData } from 'pixi.js'
import { BoundingBox, ProjectionOverlap, ProjectionRange } from '.'

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

export function getMinProjectionOverlapDepth(
  a: ProjectionRange,
  b: ProjectionRange,
  otherDepth: number,
): number {
  if (!hasProjectionOverlap(a, b)) {
    return otherDepth
  }
  const depth = Math.min(a.max - b.min, b.max - a.min)

  return depth < otherDepth ? depth : otherDepth
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
