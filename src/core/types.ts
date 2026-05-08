import { Container, Point, type PointData } from 'pixi.js'

export { Point as Vector, type PointData as VectorData }

export interface Range {
  min: number
  max: number
}
export namespace Range {
  export const point = (minAndMax: number) => ({ min: minAndMax, max: minAndMax })
}

export interface Component {
  key: string
  container?: Container
}

export interface Entity {
  readonly id: number
  components: Map<string, Component>
  tag?: string
}

export interface Disconnectable {
  disconnect(): void
}
