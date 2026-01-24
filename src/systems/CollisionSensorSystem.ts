import { Entity, Stage, System, Screen, Vector } from '../core'
import { Collision, Collider } from '../collision'
import { Components } from '../components'
import { Signals } from '../signals'
import { Geometry } from '../geometry'
import { Matrix, Point } from 'pixi.js'

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
    let contact: Collider.Contact | undefined
    let transform = new Matrix()
    let ray: Collision.Ray | undefined

    for (let i = 0; i < sensors.length; i++) {
      const [idA, A] = sensors[i]!

      A.collisions.clear()

      entity = stage.getEntity(idA)!
      entity.getGlobalTransform(transform)
      A.collider._transform.setFromMatrix(transform)

      for (let j = i + 1; j < sensors.length; j++) {
        const [idB, B] = sensors[j]!

        entity = stage.getEntity(idB)!
        entity.getGlobalTransform(transform)
        B.collider._transform.setFromMatrix(transform)

        contact = this.findContact(A.collider, B.collider)
        if (contact) {
          A.collisions.set(idB, Collision.instance(idB, contact, true))
          B.collisions.set(idA, Collision.instance(idA, contact, false))
        }
      }
      for (let k = 0; k < bodies.length; k++) {
        const [idC, C] = bodies[k]!

        contact = this.findContact(A.collider, C.collider)
        if (contact) {
          A.collisions.set(idC, Collision.instance(idC, contact, true))
          C.collisions.set(idA, Collision.instance(idA, contact, false))
        }
      }
    }
  }

  private findContact(A: Collider, B: Collider): Collider.Contact | undefined {
    if (
      !Collider.canCollide(A, B, this.options.collisionLayerMap) ||
      (this.options.usesOnlyAABBIntersectionForCollisionDetection && !A.hasAABBIntersection(B))
    ) {
      return
    }
    return A.findContact(B, false)
  }
}
