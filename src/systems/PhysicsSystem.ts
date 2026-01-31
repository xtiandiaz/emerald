import { Entity, Stage, System, Vector } from '../core'
import { CollisionSystem } from '.'
import { type Components, Collider } from '../components'
import type { Signals } from '../signals'
import { Collision } from '../collision'
import { Physics, PhysicsEngine } from '../physics'
import { Debug } from '../debug'

export class PhysicsSystem<C extends Components, S extends Signals> extends CollisionSystem<C, S> {
  gravity: Physics.Gravity = {
    vector: new Vector(0, 1),
    value: 9.81, // m/s^2
  }
  PPM = 10 // Pixels Per Meter
  protected iterations = 4
  private engine = new PhysicsEngine()

  constructor(options?: Partial<PhysicsSystem.Options>) {
    super({ findsContactPoints: true, layerMap: options?.collisionLayerMap, debug: options?.debug })

    if (options?.gravity) this.gravity = options.gravity
    if (options?.PPM != undefined) this.PPM = options.PPM
    if (options?.iterations) this.iterations = options.iterations
  }

  prepareCollider(collider: Collider, entity: Entity<C>, dT: number): void {
    const body = entity.getComponent('rigid-body')
    if (!body) {
      super.prepareCollider(collider, entity, dT)
      return
    }

    this.engine.stepBody(body, this.gravity, this.PPM, dT)

    collider._transform.setFromMatrix(body._transform.matrix)

    // TODO univify the transform if possible, or move the update of the entity's transform to somewhere else
    entity.setFromMatrix(body._transform.matrix)
  }

  fixedUpdate(stage: Stage<C>, toolkit: System.UpdateToolkit<S>, dT: number): void {
    dT /= this.iterations
    for (let it = 0; it < this.iterations; it++) {
      super.fixedUpdate(stage, toolkit, dT)
    }
  }

  resolveCollision(collision: CollisionSystem.Instance, stage: Stage<C>): void {
    const bodyA = stage.getComponent('rigid-body', collision.idA)
    const bodyB = stage.getComponent('rigid-body', collision.idB)
    if (bodyA && bodyB) {
      this.engine.resolveCollision(bodyA, bodyB, collision.contact)
    }
  }

  protected initDebugIfNeeded(stage: Stage<C>, signals: Signals.Bus<S>): void {
    super.initDebugIfNeeded(stage, signals)

    signals.emit('debug-physics-enabled', { iterations: this.iterations })
  }
}

export namespace PhysicsSystem {
  export interface Options {
    gravity: Physics.Gravity
    iterations: number
    PPM: number // Pixels Per Meter
    collisionLayerMap?: Collision.LayerMap
    debug?: Debug.Options.CollisionSystem
  }
}
