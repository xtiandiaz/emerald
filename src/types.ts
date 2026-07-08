import { Point, type PointData } from 'pixi.js'
import { DIRECTION } from './constants'

export { Point as Vector, type PointData as VectorData }

export type ComponentConstructor<T extends Object> = new (...params: any[]) => T

export type DirectionKey = (typeof DIRECTION)[keyof typeof DIRECTION]

export interface Range {
  min: number
  max: number
}

export interface Transform {
  position: Point
  rotation: number
  angle: number
  scale: PointData
}

export interface Disconnectable {
  disconnect: () => void
}
