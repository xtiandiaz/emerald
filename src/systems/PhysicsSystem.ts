import { Entity, Stage, Vector } from '../core'
import { CollisionSystem } from '.'
import { Components, Collider } from '../components'
import { Signals } from '../signals'
import { Collision } from '../collision'
import { Physics, PhysicsEngine } from '../physics'
import { Debug } from '../debug'

export class PhysicsSystem<Cs extends Components, Ss extends Signals> extends CollisionSystem<
  Cs,
  Ss
> {
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

  prepareCollider(collider: Collider, entity: Entity<Cs>, dT: number): void {
    const body = entity.getComponent('rigid-body')
    if (!body || body.isStatic) {
      super.prepareCollider(collider, entity, dT)
      return
    }

    this.engine.stepBody(body, this.gravity, this.PPM, dT)

    collider._transform.setFromMatrix(body._transform.matrix)
    entity.setFromMatrix(body._transform.matrix)
  }

  fixedUpdate(stage: Stage<Cs>, signals: Signals.Emitter<Ss>, dT: number): void {
    dT /= this.iterations
    for (let it = 0; it < this.iterations; it++) {
      super.fixedUpdate(stage, signals, dT)
    }
  }

  resolveCollision(collision: CollisionSystem.Instance, stage: Stage<Cs>): void {
    const bodyA = stage.getComponent('rigid-body', collision.idA)
    const bodyB = stage.getComponent('rigid-body', collision.idB)
    if (bodyA && bodyB) {
      this.engine.resolveCollision(bodyA, bodyB, collision.contact)
    }
  }

  protected initDebugIfNeeded(stage: Stage<Cs>, signals: Signals.Bus<Ss>): void {
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
