import { System, Vector, Entity, Stage, Disconnectable } from '../core'
import { Components, RigidBody } from '../components'
import { Signals } from '../signals'
import { Physics, PhysicsEngine } from '../physics'
import { Collision } from '../collision'
import { Debug } from '../debug'
import { Input } from '../input'

export interface PhysicsSystemOptions {
  gravity: Physics.Gravity
  iterations: number
  PPM: number // Pixels Per Meter
  collisionLayerMap?: Collision.LayerMap
  debug?: Debug.Options.PhysicsSystem
}

export class PhysicsSystem<Cs extends Components, Ss extends Signals> extends System<Cs, Ss> {
  private engine = new PhysicsEngine()
  private options: PhysicsSystemOptions
  private debugGraphics?: Debug.Graphics

  constructor(options?: Partial<PhysicsSystemOptions>) {
    super()

    this.options = {
      gravity: {
        vector: new Vector(0, 1),
        value: 9.81, // m/s^2
      },
      PPM: 10,
      iterations: 4,
      ...options,
    }
  }

  resetOptions(options: Partial<PhysicsSystemOptions>) {
    this.options = {
      ...this.options,
      ...options,
    }
  }

  init(stage: Stage<Cs>, signals: Signals.Bus<Ss>, _input: Input.Provider): Disconnectable[] {
    this.initDebugIfNeeded(stage, signals)

    return []
  }

  fixedUpdate(stage: Stage<Cs>, _signals: Signals.Emitter<Ss>, dT: number): void {
    const gravity = this.options.gravity
    const PPM = this.options.PPM
    const bodies = stage._bodies
    const separation = new Vector()
    const collisions: Collision[] = []
    // const vectorOne = new Vector(1, 1)
    let contact: Collision.Contact | undefined
    let collision: Collision | undefined
    let entity: Entity<Cs>
    let body: RigidBody

    for (let i = 0; i < bodies.length; i++) {
      bodies[i]![1].collidedIds.clear()
    }

    dT /= this.options.iterations
    for (let it = 0; it < this.options.iterations; it++) {
      this.debugGraphics?.clear()

      collisions.length = 0

      for (let i = 0; i < bodies.length; i++) {
        body = bodies[i]![1]

        this.engine.stepBody(body, gravity, PPM, dT)

        entity = stage.getEntity(bodies[i]![0])!
        entity.position.copyFrom(body.position)
        entity.rotation = body.rotation
        entity.scale.set(body.scale)

        this.debugGraphics?.drawCollider(body)
      }

      for (let i = 0; i < bodies.length - 1; i++) {
        const [idA, A] = bodies[i]!
        for (let j = i + 1; j < bodies.length; j++) {
          const [idB, B] = bodies[j]!

          if (!Collision.canCollide(A.layer, B.layer, this.options.collisionLayerMap)) {
            continue
          }
          contact = A.shape.findContact(B.shape, true)
          if (!contact || !contact.points) {
            continue
          }
          collisions.push({ A, B, points: contact.points, ...contact })

          A.collidedIds.add(idB)
          B.collidedIds.add(idA)
        }
      }

      for (let i = 0; i < collisions.length; i++) {
        collision = collisions[i]!

        this.debugGraphics?.drawCollision(collision)

        this.engine.separateBodies(
          collision.A,
          collision.B,
          collision.normal.multiplyScalar(collision.depth, separation),
        )

        this.engine.resolveCollision(collision)
      }
    }
  }

  private initDebugIfNeeded(stage: Stage<Cs>, signals: Signals.Bus<Ss>) {
    if (!this.options.debug?.rendersCollisions) {
      return
    }

    this.debugGraphics = new Debug.Graphics()
    stage.addChild(this.debugGraphics)
    stage.getLayer(Stage.Layer.DEBUG).attach(this.debugGraphics)

    signals.emit('debug-physics-enabled', { iterations: this.options.iterations })
  }
}
