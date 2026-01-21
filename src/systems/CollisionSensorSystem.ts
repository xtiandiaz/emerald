import { Entity, Stage, System } from '../core'
import { Collision, Collider } from '../collision'
import { Components } from '../components'
import { Signals } from '../signals'

export interface CollisionSensorSystemOptions {
  usesOnlyAABBIntersectionForCollisionDetection: boolean
  collisionLayerMap?: Collision.LayerMap
}

export class CollisionSensorSystem<Cs extends Components, Ss extends Signals> extends System<
  Cs,
  Ss
> {
  private options: CollisionSensorSystemOptions

  constructor(options?: Partial<CollisionSensorSystemOptions>) {
    super()

    this.options = {
      usesOnlyAABBIntersectionForCollisionDetection: false,
      ...options,
    }
  }

  fixedUpdate(stage: Stage<Cs>, signals: Signals.Emitter<Ss>, dT: number): void {
    const sensors = stage._collisionSensors
    const bodies = stage._bodies
    let entity: Entity<Cs>

    for (let i = 0; i < sensors.length; i++) {
      const [idA, A] = sensors[i]!

      A.collidedIds.clear()

      entity = stage.getEntity(idA)!
      A._updateTransform(entity.position, entity.rotation, entity.scale.x)

      for (let j = i + 1; j < sensors.length; j++) {
        const [idB, B] = sensors[j]!

        entity = stage.getEntity(idB)!
        B._updateTransform(entity.position, entity.rotation, entity.scale.x)

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
      ((this.options.usesOnlyAABBIntersectionForCollisionDetection &&
        A.shape.hasAABBIntersection(B.shape)) ||
        A.shape.findContact(B.shape, false) != undefined)
    )
  }
}
