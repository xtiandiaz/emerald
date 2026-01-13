import { Collider, Collision, Entity, System, World, type SignalBus } from '../core'

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
      A.shape.setTransform(entity.position, entity.rotation)

      for (let j = i + 1; j < sensors.length; j++) {
        const [idB, B] = sensors[j]!

        entity = world.getEntity(idB)!
        B.shape.setTransform(entity.position, entity.rotation)

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

  private isTrigger(A: Collider, B: Collider) {
    return (
      Collision.findContactIfCanCollide(
        A,
        B,
        (lA, lB) => Collision.canCollide(lA, lB, this.options.collisionLayerMap),
        false,
      ) != undefined
    )
  }
}
