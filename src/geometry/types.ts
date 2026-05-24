import { PointData } from 'pixi.js'
import { Range, Vector } from '../types'

export type BoundingBox = {
  min: PointData
  max: PointData
}

export type ProjectionRange = Range

export interface ProjectionOverlap {
  depth: number
  axis: Vector
}
