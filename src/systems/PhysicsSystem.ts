import { System, Vector, Entity, Stage, Disconnectable } from '../core'
import { Components, RigidBody } from '../components'
import { Signals } from '../signals'
import { Physics, PhysicsEngine } from '../physics'
import { Collider, Collision } from '../collision'
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

  init(stage: Stage<Cs>, signals: Signals.Bus<Ss>, _input: Input.Provider): Disconnectable[] {
    this.initDebugIfNeeded(stage, signals)

    return []
  }

  fixedUpdate(stage: Stage<Cs>, _signals: Signals.Emitter<Ss>, dT: number): void {
    const gravity = this.options.gravity
    const PPM = this.options.PPM
    const bodies = stage._bodies
    const separation = new Vector()
    const contacts: Collision.Contact[] = []
    let entity: Entity<Cs>
    let body: RigidBody
    let colliderContact: Collider.Contact | undefined
    let collisionContact: Collision.Contact | undefined

    for (let i = 0; i < bodies.length; i++) {
      bodies[i]![1].collisions.clear()
    }

    dT /= this.options.iterations
    for (let it = 0; it < this.options.iterations; it++) {
      this.debugGraphics?.clear()

      contacts.length = 0

      for (let i = 0; i < bodies.length; i++) {
        body = bodies[i]![1]

        this.engine.stepBody(body, gravity, PPM, dT)

        entity = stage.getEntity(bodies[i]![0])!
        entity.position.copyFrom(body.position)
        entity.rotation = body.rotation
        entity.scale.set(body.scale)

        this.debugGraphics?.drawCollider(body.collider)
      }

      for (let i = 0; i < bodies.length - 1; i++) {
        const [idA, A] = bodies[i]!
        for (let j = i + 1; j < bodies.length; j++) {
          const [idB, B] = bodies[j]!

          if (!Collider.canCollide(A.collider, B.collider, this.options.collisionLayerMap)) {
            continue
          }

          colliderContact = A.collider.findContact(B.collider, true)
          if (!colliderContact || !colliderContact.points) {
            continue
          }

          contacts.push({ A, B, points: colliderContact.points, ...colliderContact })

          A.collisions.set(idB, Collision.instance(idB, colliderContact, true))
          B.collisions.set(idA, Collision.instance(idA, colliderContact, false))
        }
      }

      for (let i = 0; i < contacts.length; i++) {
        collisionContact = contacts[i]!

        this.debugGraphics?.drawCollisionContact(collisionContact)

        this.engine.separateBodies(
          collisionContact.A,
          collisionContact.B,
          collisionContact.normal.multiplyScalar(collisionContact.depth, separation),
        )

        this.engine.resolveCollision(collisionContact)
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
