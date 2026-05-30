import { System } from '../System'
import { SignalMap } from '../signal'
import { Gravity, PhysicsEngine } from '../physics'
import { Collision, CollisionMap } from '../collision'
import { Collider, RigidBody } from '../components'
import { Vector } from '../types'
import { Container } from 'pixi.js'

export class PhysicsSystem<S extends SignalMap> extends System<S> {
  options = PhysicsSystem.defaultOptions()

  private readonly engine = new PhysicsEngine()
  private readonly rcs = new Array<PhysicsSystem.ResolvableCollision>()

  init() {}

  update(_: number): void {
    const rbs = this.world.getComponents(RigidBody)
    for (const [e, rb] of rbs) {
      for (const c of this.world.getLikeComponents(Container, e) ?? []) {
        c.setFromMatrix(rb.matrix)
      }
    }
  }

  fixedUpdate(dt: number): void {
    const rbs = this.world.getComponents(RigidBody)
    let i: number,
      cr_a: Collider | undefined,
      cr_b: Collider | undefined,
      c: Collision | undefined,
      collisionCount: number

    dt /= this.options.iterations
    for (let it = 0; it < this.options.iterations; it++) {
      collisionCount = 0

      for (const [e, rb] of rbs) {
        cr_a = this.world.getComponent(Collider, e)
        if (!cr_a) {
          continue
        }
        this.engine.stepBody(rb, this.options.gravity, this.options.ppm, dt)
        cr_a._transform.setFromMatrix(rb.matrix)
      }
      i = 1
      for (const [ea, rb_a] of rbs) {
        cr_a = this.world.getComponent(Collider, ea)
        if (!cr_a) {
          continue
        }
        for (const [eb, rb_b] of rbs.entries().drop(i)) {
          cr_b = this.world.getComponent(Collider, eb)
          if (!cr_b || !cr_a.canCollide(cr_b, this.options.collisionMap)) {
            continue
          }
          c = Collision.from(
            cr_a,
            cr_b,
            collisionCount < this.rcs.length ? this.rcs[collisionCount].c : undefined,
          )
          if (!c.hasContact) {
            continue
          }
          if (collisionCount < this.rcs.length) {
            const rc = this.rcs[collisionCount]
            rc.a = rb_a
            rc.b = rb_b
            rc.c = c
          } else {
            this.rcs.push({ a: rb_a, b: rb_b, c })
          }
          collisionCount++
        }
        i++
      }
      for (i = 0; i < collisionCount; i++) {
        const rc = this.rcs[i]
        this.engine.resolveCollision(rc.a, rc.b, rc.c)
      }
      this.rcs.length = collisionCount // Free unused ones for GC
    }
  }

  _update(rb: RigidBody, c: Container) {
    c.setFromMatrix(rb.matrix)
  }
}

export namespace PhysicsSystem {
  export interface Options {
    gravity: Gravity
    iterations: number
    ppm: number // Pixels per meter
    collisionMap?: CollisionMap
  }

  export const defaultOptions = (): Options => ({
    gravity: new Vector(0, 0.981), // m/s^2,
    iterations: 4,
    ppm: 100,
  })

  export interface ResolvableCollision {
    a: RigidBody
    b: RigidBody
    c: Collision
  }
}
