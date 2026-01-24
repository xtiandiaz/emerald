import { Point, type PointData } from 'pixi.js'

export { Point as Vector, type PointData as VectorData }

export interface Range {
  min: number
  max: number
}
export namespace Range {
  export const point = (minAndMax: number) => ({ min: minAndMax, max: minAndMax })
}

export interface Component {}

export type EntityComponent<T extends Component> = [entityId: number, component: T]

export interface Disconnectable {
  disconnect(): void
}
