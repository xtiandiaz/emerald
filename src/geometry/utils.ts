import { BoundingBox } from './types'

export const isAABB = (a: BoundingBox, b: BoundingBox): boolean => {
  return !(a.max.x < b.min.x || a.max.y < b.min.y || b.max.x < a.min.x || b.max.y < a.min.y)
}
