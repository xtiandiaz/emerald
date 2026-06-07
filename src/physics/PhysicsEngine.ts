import type { Point } from 'pixi.js'
import { Vector, VectorData } from '..'
import { Gravity, Physics } from '.'
import { RigidBody } from '../components'
import { Collision } from '../collision'
import { EMath } from '../extras'

export class PhysicsEngine {
  private tan = new Vector() // Tangent
  private fs = new Vector() // Forces
  private vr = new Vector() // Relative velocity
  // Rotation radii
  private ra = new Vector()
  private rb = new Vector()
  private orthr_a = new Vector()
  private orthr_b = new Vector()

  private props = {
    vecs: [new Vector(), new Vector(), new Vector()] as [Vector, Vector, Vector],
  }
  private impulse = new Vector()

  stepBody(body: RigidBody, gravity: Gravity, ppm: number, dt: number) {
    switch (body.type) {
      case 'static':
        return
      case 'dynamic':
        this.fs.copyFrom(gravity).add(body._force, this.fs)
        body._force.set(0, 0)

        body.velocity.x += this.fs.x * dt
        body.velocity.x *= 1 - body.drag.x
        body.velocity.y += this.fs.y * dt
        body.velocity.y *= 1 - body.drag.y

        body.angularVelocity += body.torque * dt
        body.torque = 0
        body.angularVelocity *= 1 - body.angularDrag
        break
    }

    body.position.x += body.velocity.x * ppm * dt
    body.position.y += body.velocity.y * ppm * dt
    body.rotation += body.angularVelocity * ppm * dt
  }

  separateBodies(a: RigidBody, b: RigidBody, depth: Vector) {
    if (a.type === 'static' && b.type === 'static') {
      return
    }
    if (a.type === 'static') {
      b.position.add(depth, b.position)
    } else if (b.type === 'static') {
      a.position.subtract(depth, a.position)
    } else {
      depth.divideByScalar(2, depth)
      a.position.subtract(depth, a.position)
      b.position.add(depth, b.position)
    }
  }

  /*  
    Collision response based on the 'Reaction Model' explained here
    https://en.wikipedia.org/wiki/Collision_response#Impulse-based_reaction_model
    although I got better results with the simplified formulae
    borrowed from: https://github.com/RandyGaul/ImpulseEngine/
  */
  resolveCollision(a: RigidBody, b: RigidBody, c: Collision) {
    const coeffs = PhysicsEngine.getResolutionCoefficients(a, b)
    const normal = c._normal
    const cpCount = c._contactCount

    this.separateBodies(a, b, normal.multiplyByScalar(c._depth))

    if (cpCount <= 0) {
      return
    }
    let i: number, cp: Collision.Contact

    for (i = 0; i < cpCount; i++) {
      cp = c._contacts[i]!
      PhysicsEngine.calculateRotationRadius(a.position, cp.point, this.ra, this.orthr_a)
      PhysicsEngine.calculateRotationRadius(b.position, cp.point, this.rb, this.orthr_b)
      this.recalculateRelativeVelocity(a, this.orthr_a, b, this.orthr_b)

      let vr_dot_n = this.vr.dot(normal)
      if (vr_dot_n > 0) {
        return
      }
      // Reaction Impulse (jr)
      let jr = -(1 + coeffs.restitution) * vr_dot_n
      const invMassSum =
        a.invMass +
        b.invMass +
        Math.pow(this.ra.cross(normal), 2) * a.invMoi +
        Math.pow(this.rb.cross(normal), 2) * b.invMoi
      jr /= invMassSum
      jr /= cpCount
      this.impulse.set(jr * normal.x, jr * normal.y)
      this.applyImpulse(this.impulse, a, this.ra, -1)
      this.applyImpulse(this.impulse, b, this.rb, 1)

      // Recalculate relative velocity before assessing Frictional Impulse
      this.recalculateRelativeVelocity(a, this.orthr_a, b, this.orthr_b)
      vr_dot_n = this.vr.dot(normal)

      // Tangent
      this.tan.set(this.vr.x - vr_dot_n * normal.x, this.vr.y - vr_dot_n * normal.y)
      this.tan.normalize(this.tan)

      const vr_dot_tan = this.vr.dot(this.tan)
      // Frictional Impulse (jf)
      let jf = -vr_dot_tan
      jf /= invMassSum
      jf /= cpCount
      const abs_jf = Math.abs(jf)
      if (abs_jf <= Physics.NEARLY_ZERO_MAGNITUDE) {
        return
      }
      if (abs_jf < jr * coeffs.friction.static) {
        this.tan.multiplyByScalar(jf, this.impulse)
      } else {
        this.tan.multiplyByScalar(-jr * coeffs.friction.dynamic, this.impulse)
      }
      this.applyImpulse(this.impulse, a, this.ra, -1)
      this.applyImpulse(this.impulse, b, this.rb, 1)
    }
  }

  private static calculateRotationRadius(
    pos: Point,
    contactPoint: Point,
    out_r: Point,
    out_orthr: Point,
  ) {
    contactPoint.subtract(pos, out_r)
    out_r.orthogonalize(out_orthr)
  }

  private recalculateRelativeVelocity(a: RigidBody, orthr_a: Point, b: RigidBody, orthr_b: Point) {
    this.props.vecs[0].set(
      a.velocity.x + a.angularVelocity * orthr_a.x,
      a.velocity.y + a.angularVelocity * orthr_a.y,
    )
    this.props.vecs[1].set(
      b.velocity.x + b.angularVelocity * orthr_b.x,
      b.velocity.y + b.angularVelocity * orthr_b.y,
    )
    this.props.vecs[1].subtract(this.props.vecs[0], this.vr)
  }

  private applyImpulse(impulse: VectorData, body: RigidBody, r: Vector, sign: -1 | 1) {
    if (body.type === 'static') {
      return
    }
    body.velocity.x += sign * impulse.x * body.invMass
    body.velocity.y += sign * impulse.y * body.invMass
    body.angularVelocity += sign * r.cross(impulse) * body.invMoi
  }
}

export namespace PhysicsEngine {
  export interface ResolutionCoefficients {
    restitution: number
    friction: Physics.Friction
  }

  export function getResolutionCoefficients(a: RigidBody, b: RigidBody): ResolutionCoefficients {
    return {
      restitution: Math.max(a._restitution, b._restitution),
      friction: {
        static: EMath.average(a._friction.static, b._friction.static),
        dynamic: EMath.average(a._friction.dynamic, b._friction.dynamic),
      },
    }
  }
}
