import { System, World, Vector, type SignalBus, Entity } from '../core'
import { Physics, PhysicsEngine } from '../physics'
import { Collision } from '../collision'
import { Body } from '../components'
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
    if (this.options.debug) {
      this.initDebug(world, signalBus)
    } else if (this.debugGraphics) {
      world.removeChild(this.debugGraphics)
      world.getLayer(World.Layer.DEBUG).detach(this.debugGraphics)
      this.debugGraphics = undefined
    }
  }

  fixedUpdate(world: World, signalBus: SignalBus, dT: number): void {
    const gravity = this.options.gravity
    const PPM = this.options.PPM
    const bodies = world._bodies
    const separation = new Vector()
    const collisions: Collision[] = []
    // const vectorOne = new Vector(1, 1)
    let contact: Collision.Contact | undefined
    let collision: Collision | undefined
    let entity: Entity
    let body: Body

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

        entity = world.getEntity(bodies[i]![0])!
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

  private initDebug(world: World, signalBus: SignalBus) {
    this.debugGraphics = new Debug.Graphics()
    world.addChild(this.debugGraphics)
    world.getLayer(World.Layer.DEBUG).attach(this.debugGraphics)

    signalBus.emit(new DebugSignal.PhysicsEnabled(this.options.iterations))
  }
}
