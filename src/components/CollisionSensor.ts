import { Component } from '../core'
import { Collider, Collision } from '../collision'

export class CollisionSensor implements Component, Collision.Tracker {
  readonly collisions = new Map<number, Collision.Instance>()

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
