import { System } from '../System'
import { SignalMap } from '../signal'
import { Gravity, PhysicsEngine } from '../physics'
import { CollisionMap } from '../collision'
import { Vector } from '../types'
import { Collider, RigidBody, ShapeOverlap } from '..'

export class NewPhysicsSystem<S extends SignalMap> extends System<S> {
  private readonly engine = new PhysicsEngine()
  private ops: NewPhysicsSystem.Options = {
    gravity: new Vector(0, 9.81), // m/s^2,
    iterations: 4,
    pixelsPerMeter: 10,
  }

  _init(options: Partial<NewPhysicsSystem.Options>) {
    this.ops = { ...options, ...this.ops }
  }

  init(): void {}

  fixedUpdate(dt: number): void {
    const rbs = this.world.getAllComponents(RigidBody).entries()
    let i: number,
      col_a: Collider | undefined,
      col_b: Collider | undefined,
      overlap: ShapeOverlap | undefined

    dt /= this.ops.iterations
    for (let it = 0; it < this.ops.iterations; it++) {
      for (const [e, rb] of rbs) {
        col_a = this.world.getComponent(Collider, e)
        if (!col_a) {
          continue
        }
        this.engine.stepBody(rb, this.ops.gravity, this.ops.pixelsPerMeter, dt)

        col_a._transform.setFromMatrix(rb.matrix)
      }
      i = 0
      for (const [ea, rb_a] of rbs) {
        col_a = this.world.getComponent(Collider, ea)
        if (!col_a) {
          continue
        }
        for (const [eb, rb_b] of rbs.drop(i + 1)) {
          col_b = this.world.getComponent(Collider, eb)
          if (!col_b || !col_a.canCollide(col_b, this.ops.collisionMap)) {
            continue
          }
          overlap = col_a.getShapeOverlap(col_b, true)
          console.log(overlap)
        }
        i++
      }
    }
  }
}

export namespace NewPhysicsSystem {
  export interface Options {
    gravity: Gravity
    iterations: number
    pixelsPerMeter: number
    collisionMap?: CollisionMap
  }
}
