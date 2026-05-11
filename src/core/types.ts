import { Container, ContainerChild, Point, type PointData } from 'pixi.js'

export { Point as Vector, type PointData as VectorData }

export interface Range {
  min: number
  max: number
}
export namespace Range {
  export const point = (minAndMax: number) => ({ min: minAndMax, max: minAndMax })
}

export interface Disconnectable {
  disconnect: () => void
}

export interface Component {
  readonly key: string
}

export class ContainerComponent extends Container implements Component {
  readonly container = this

  constructor(
    public readonly key: string,
    ...children: ContainerChild[]
  ) {
    super()

    this.addChild(...children)
  }
}

export interface Entity {
  readonly id: number
  components: Map<string, Component>
  tag?: string
}
