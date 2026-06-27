import { Container, PointData } from 'pixi.js'
import { ComponentConstructor, Transform } from '.'

export class Entity extends Container implements Transform {
  components = new Map<string, Object>()
  tag?: string

  constructor(
    public readonly id: number,
    options?: Partial<Entity.Options>,
  ) {
    super()

    this.tag = options?.tag
    if (options?.initialPosition) this.position.copyFrom(options.initialPosition)
  }

  getComponent<T extends Object>(typeValue: ComponentConstructor<T>) {
    return this.components.get(typeValue.name) as T
  }
}

export namespace Entity {
  export interface Options {
    initialPosition: PointData
    tag?: string
  }
}
