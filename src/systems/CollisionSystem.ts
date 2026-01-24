import { Disconnectable, Entity, Stage, System } from '../core'
import { Collider, Components } from '../components'
import { Signals } from '../signals'
import { Collision } from '../collision'
import { Debug } from '../debug'
import { Input } from '../input'

export class CollisionSystem<Cs extends Components, Ss extends Signals> extends System<Cs, Ss> {
  private collisions: CollisionSystem.Instance[] = []
  private debugGraphics?: Debug.Graphics

  constructor(private options: CollisionSystem.Options) {
    super()
  }

  init(stage: Stage<Cs>, signals: Signals.Bus<Ss>, input: Input.Provider): Disconnectable[] {
    this.initDebugIfNeeded(stage, signals)

    return []
  }

  prepareCollider(collider: Collider, entity: Entity<Cs>, dT: number): void {
    collider._transform.setFromMatrix(entity.getGlobalTransform())
  }

  fixedUpdate(stage: Stage<Cs>, signals: Signals.Emitter<Ss>, dT: number): void {
    const colliders = stage._colliders

    this.collisions.length = 0

    this.debugGraphics?.clear()

    for (let i = 0; i < colliders.length; i++) {
      const [id, collider] = colliders[i]

      collider.contacts.clear()

      this.prepareCollider(collider, stage.getEntity(id)!, dT)

      this.debugGraphics?.drawCollider(collider)
    }

    for (let i = 0; i < colliders.length - 1; i++) {
      const [idA, A] = colliders[i]

      A.contacts.clear()

      for (let j = i + 1; j < colliders.length; j++) {
        const [idB, B] = colliders[j]

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
        this.resolveCollision(this.collisions[i], stage)
      }
    }
  }

  resolveCollision?(collision: CollisionSystem.Instance, stage: Stage<Cs>): void

  protected initDebugIfNeeded(stage: Stage<Cs>, signals: Signals.Bus<Ss>) {
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
