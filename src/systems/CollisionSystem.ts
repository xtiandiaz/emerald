import { type Disconnectable, Entity, Stage, System } from '../core'
import { Collider, type Components } from '../components'
import type { Signals } from '../signals'
import { Collision } from '../collision'
import { Debug } from '../debug'

export class CollisionSystem<C extends Components, S extends Signals> extends System<C, S> {
  private collisions: CollisionSystem.Instance[] = []
  private debugGraphics?: Debug.Graphics

  constructor(private options: CollisionSystem.Options) {
    super()
  }

  init(stage: Stage<C>, toolkit: System.InitToolkit<S>): Disconnectable[] {
    this.initDebugIfNeeded(stage, toolkit.signals)

    return []
  }

  prepareCollider(collider: Collider, entity: Entity<C>, dT: number): void {
    collider._transform.setFromMatrix(entity.getGlobalTransform())
  }

  fixedUpdate(stage: Stage<C>, toolkit: System.UpdateToolkit<S>, dT: number): void {
    const colliders = stage._colliders

    this.collisions.length = 0

    this.debugGraphics?.clear()

    for (let i = 0; i < colliders.length; i++) {
      const [id, collider] = colliders[i]!

      collider.contacts.clear()

      this.prepareCollider(collider, stage.getEntity(id)!, dT)

      this.debugGraphics?.drawCollider(collider)
    }

    for (let i = 0; i < colliders.length - 1; i++) {
      const [idA, A] = colliders[i]!

      A.contacts.clear()

      for (let j = i + 1; j < colliders.length; j++) {
        const [idB, B] = colliders[j]!

        if (!A.canCollide(B, this.options.layerMap)) {
          continue
        }

        const contact = A.findContact(B, this.options.findsContactPoints)
        if (contact) {
          A.contacts.set(idB, contact)

          this.collisions.push({ idA, idB, contact })
        }
      }
    }

    if (this.resolveCollision) {
      for (let i = 0; i < this.collisions.length; i++) {
        this.resolveCollision(this.collisions[i]!, stage)
      }
    }
  }

  resolveCollision?(collision: CollisionSystem.Instance, stage: Stage<C>): void

  protected initDebugIfNeeded(stage: Stage<C>, signals: Signals.Bus<S>) {
    if (!this.options.debug?.rendersColliders) {
      return
    }

    this.debugGraphics = new Debug.Graphics()
    stage.addChild(this.debugGraphics)
    stage.getLayer(Stage.Layer.DEBUG).attach(this.debugGraphics)
  }
}

export namespace CollisionSystem {
  export interface Options {
    findsContactPoints: boolean
    layerMap?: Collision.LayerMap
    debug?: Debug.Options.CollisionSystem
  }

  export interface Instance {
    idA: number
    idB: number
    contact: Collider.Contact
  }
}
