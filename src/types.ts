import { Point, type PointData } from 'pixi.js'

export { Point as Vector, type PointData as VectorData }

export interface Range {
  min: number
  max: number
}

export type ComponentConstructor<T extends Object> = new (...params: any[]) => T

export interface Transform {
  position: Point
  rotation: number
  angle: number
  scale: PointData
}

export interface Disconnectable {
  disconnect: () => void
}
