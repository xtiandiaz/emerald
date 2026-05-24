import { System } from '../System'
import { SignalMap } from '../signal'
import { Gravity, PhysicsEngine } from '../physics'
import { Collision, CollisionMap } from '../collision'
import { Collider, RigidBody } from '../components'
import { Vector } from '../types'

export class PhysicsSystem<S extends SignalMap> extends System<S> {
  private readonly engine = new PhysicsEngine()
  private readonly rcs = new Array<PhysicsSystem.ResolvableCollision>()
  private options!: PhysicsSystem.Options

  _init(options: PhysicsSystem.Options) {
    this.options = options
  }

  init(): void {}

  fixedUpdate(dt: number): void {
    const rbs = this.world.getAllComponents(RigidBody)
    let i: number, col_a: Collider | undefined, col_b: Collider | undefined, collisionCount: number

    dt /= this.options.iterations
    for (let it = 0; it < this.options.iterations; it++) {
      this.rcs.length = 0
      collisionCount = 0

      for (const [e, rb] of rbs) {
        col_a = this.world.getComponent(Collider, e)
        if (!col_a) {
          continue
        }
        this.engine.stepBody(rb, this.options.gravity, this.options.pixelsPerMeter, dt)
        col_a._transform.setFromMatrix(rb.matrix)
      }
      i = 1
      for (const [ea, rb_a] of rbs) {
        col_a = this.world.getComponent(Collider, ea)
        if (!col_a) {
          continue
        }
        for (const [eb, rb_b] of rbs.entries().drop(i)) {
          col_b = this.world.getComponent(Collider, eb)
          if (!col_b || !col_a.canCollide(col_b, this.options.collisionMap)) {
            continue
          }
          const collision = Collision.from(col_a, col_b)
          // const collision =
          //   collisionCount < this.rcs.length
          //     ? this.rcs[collisionCount]!.collision.reset(col_a, col_b)
          //     : Collision.from(col_a, col_b)

          if (!collision || collision._contactCount === 0) {
            continue
          }
          // if (collisionCount < this.rcs.length) {
          //   const rc = this.rcs[collisionCount]
          //   rc.a = rb_a
          //   rc.b = rb_b
          //   rc.collision = collision
          // } else {
          this.rcs.push({ a: rb_a, b: rb_b, collision })
          // }
          collisionCount++
        }
        i++
      }
      for (i = 0; i < collisionCount; i++) {
        const rc = this.rcs[i]
        this.engine.resolveCollision(rc.a, rc.b, rc.collision)
      }
      // this.rcs.length = collisionCount // Free unused ones for GC
    }
  }
}

export namespace PhysicsSystem {
  export interface Options {
    gravity: Gravity
    iterations: number
    pixelsPerMeter: number
    collisionMap?: CollisionMap
  }

  export const defaultOptions = (): Options => ({
    gravity: new Vector(0, 0.981), // m/s^2,
    iterations: 4,
    pixelsPerMeter: 100,
  })

  export interface ResolvableCollision {
    a: RigidBody
    b: RigidBody
    collision: Collision
  }
}
