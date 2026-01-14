import { Component } from '../core'
import { Collider } from '../collision'

export class CollisionSensor extends Component implements Collider {
  readonly collidedIds = new Set<number>()
  layer = 1

  constructor(public readonly shape: Collider.Shape) {
    super()
  }
}
