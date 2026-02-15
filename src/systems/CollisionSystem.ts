import { type Disconnectable, Entity, Stage, System } from '../core'
import { Collider, RayCast, type Components } from '../components'
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

    let rcA: RayCast | undefined, rcB: RayCast | undefined

    this.collisions.length = 0

    this.debugGraphics?.clear()

    for (let i = 0; i < colliders.length; i++) {
      const { entityId: id, component: collider } = colliders[i]!

      collider.collisions.clear()

      this.prepareCollider(collider, stage.getEntity(id)!, dT)

      stage.getComponent('ray-cast', id)?.reset()

      this.debugGraphics?.drawCollider(collider)
    }

    for (let i = 0; i < colliders.length; i++) {
      const { entityId: idA, component: A } = colliders[i]!
      rcA = stage.getComponent('ray-cast', idA)

      for (let j = i + 1; j < colliders.length; j++) {
        const { entityId: idB, component: B } = colliders[j]!

        if (A.canCollide(B, this.options.layerMap)) {
          const contact = A.findContact(B, this.options.findsContactPoints)
          if (contact) {
            A.collisions.set(idB, { colliderId: idB, ...contact })
            B.collisions.set(idA, { colliderId: idA, ...contact })

            this.collisions.push({ idA, idB, contact })
          }
        }

        if (rcA) this.castAndUpdateRays(A, rcA, B)

        rcB = stage.getComponent('ray-cast', idB)
        if (rcB) this.castAndUpdateRays(B, rcB, A)
      }
    }

    if (this.resolveCollision) {
      for (let i = 0; i < this.collisions.length; i++) {
        this.resolveCollision(this.collisions[i]!, stage)
      }
    }
  }

  castAndUpdateRays(A: Collider, rcA: RayCast, B: Collider) {
    for (const [key, _ray] of rcA.rays ?? []) {
      const ray = _ray.transform(A._transform.matrix)
      B.evaluateRayIntersection(ray)

      rcA.casts.set(key, (rcA.casts.get(key) ?? false) || ray.intersects)
      _ray.intersects = ray.intersects
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
