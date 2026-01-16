import { Entity, System, World, type SignalBus } from '../core'
import { Collision, Collider } from '../collision'

export interface CollisionSensorSystemOptions {
  collisionLayerMap?: Collision.LayerMap
}

export class CollisionSensorSystem extends System {
  private options: CollisionSensorSystemOptions

  constructor(options?: Partial<CollisionSensorSystemOptions>) {
    super()

    this.options = { ...options }
  }

  fixedUpdate(world: World, signalBus: SignalBus, dT: number): void {
    const sensors = world._collisionSensors
    const bodies = world._bodies
    let entity: Entity

    for (let i = 0; i < sensors.length; i++) {
      const [idA, A] = sensors[i]!

      A.collidedIds.clear()

      entity = world.getEntity(idA)!
      A.shape.transform.setFromMatrix(entity.worldTransform)

      for (let j = i + 1; j < sensors.length; j++) {
        const [idB, B] = sensors[j]!

        entity = world.getEntity(idB)!
        B.shape.transform.setFromMatrix(entity.worldTransform)

        if (this.isTrigger(A, B)) {
          A.collidedIds.add(idB)
          B.collidedIds.add(idA)
        }
      }
      for (let k = 0; k < bodies.length; k++) {
        const [idC, C] = bodies[k]!

        if (this.isTrigger(A, C)) {
          A.collidedIds.add(idC)
          C.collidedIds.add(idA)
        }
      }
    }
  }

  private isTrigger(A: Collider, B: Collider): boolean {
    return (
      Collision.canCollide(A.layer, B.layer, this.options.collisionLayerMap) &&
      A.shape.findContact(B.shape, false) != undefined
    )
  }
}
