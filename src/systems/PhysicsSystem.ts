import { System, World, Vector, type SignalBus } from '../core'
import { Physics, PhysicsEngine } from '../physics'
import { Collision } from '../collision'
import { DebugSignal } from '../debug/DebugSignal'
import { Debug } from '../debug'

export interface PhysicsSystemOptions {
  gravity: Physics.Gravity
  iterations: number
  PPM: number // Pixels Per Meter
  collisionLayerMap?: Collision.LayerMap
  debug?: {
    rendersCollisions: boolean
  }
}

export class PhysicsSystem extends System {
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

  init(world: World, signalBus: SignalBus): void {
    this.initDebugIfNeeded(world, signalBus)
  }

  fixedUpdate(world: World, signalBus: SignalBus, dT: number): void {
    const gravity = this.options.gravity
    const PPM = this.options.PPM
    const bodies = world._bodies
    const separation = new Vector()
    const collisions: Collision[] = []
    let contact: Collision.Contact | undefined
    let collision: Collision | undefined

    for (let i = 0; i < bodies.length; i++) {
      bodies[i]![1].collidedIds.clear()
    }

    dT /= this.options.iterations
    for (let it = 0; it < this.options.iterations; it++) {
      this.debugGraphics?.clear()

      collisions.length = 0

      for (let i = 0; i < bodies.length; i++) {
        const [entityId, body] = bodies[i]!

        this.engine.stepBody(body, gravity, PPM, dT)

        const entity = world.getEntity(entityId)!
        entity.position.copyFrom(body.transform.position)
        entity.rotation = body.transform.rotation
        entity.scale.set(body.transform.scale.x)

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

  private initDebugIfNeeded(world: World, signalBus: SignalBus) {
    if (!this.options.debug) {
      return
    }
    this.debugGraphics = new Debug.Graphics()
    world.addChild(this.debugGraphics)
    world.getLayer(World.Layer.DEBUG).attach(this.debugGraphics)

    signalBus.emit(new DebugSignal.PhysicsEnabled(this.options.iterations))
  }
}
