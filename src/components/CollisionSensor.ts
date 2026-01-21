import { Component } from '../core'
import { Collider } from '../collision'

export class CollisionSensor implements Component {
  readonly collidedIds = new Set<number>()

  constructor(
    public readonly collider: Collider,
    options?: Partial<CollisionSensor.Options>,
  ) {
    if (options?.layer) collider.layer = options.layer
  }
}

export namespace CollisionSensor {
  export interface Options {
    layer: number
  }
}
