import type { Point } from 'pixi.js'
import { Vector, VectorData } from '..'
import { Gravity, Physics } from '.'
import { RigidBody } from '../components'
import { Collision } from '../collision'
import { EMath } from '../extras'

export class PhysicsEngine {
  private zeroVector = new Vector()
  // Rotation radii and their orthogonals per contact-point
  private ras = [new Vector(), new Vector()]
  private ras_orth = [new Vector(), new Vector()]
  private rbs = [new Vector(), new Vector()]
  private rbs_orth = [new Vector(), new Vector()]
  private tan = new Vector() // Tangent
  private fs = new Vector()
  private vs = [new Vector(), new Vector()]
  private vrs = [new Vector(), new Vector()] // Relative velocities per contact-point

  stepBody(body: RigidBody, gravity: Gravity, ppm: number, dt: number) {
    switch (body.type) {
      case 'static':
        return
      case 'dynamic':
        this.fs.copyFrom(gravity)
        // forces.addScalars(body._force.x / dt, body._force.y / dt, forces)
        // body._force.set(0, 0)

        body.velocity.x += this.fs.x * dt
        body.velocity.y += this.fs.y * dt

        // body.angularVelocity += body.torque * dt
        // body.torque = 0
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
    Collision response based on the 'Reaction Model',
    https://en.wikipedia.org/wiki/Collision_response#Impulse-based_reaction_model
  */
  resolveCollision(a: RigidBody, b: RigidBody, c: Collision) {
    const coeffs = PhysicsEngine.getResolutionCoefficients(a, b)
    const sumInvMasses = a.invMass + b.invMass
    const normal = c._normal
    const cpCount = c._contactCount

    this.separateBodies(a, b, normal.multiplyByScalar(c._depth))

    if (cpCount <= 0) {
      return
    }
    const impulse = new Vector()
    let i: number, cp: Collision.Contact

    for (i = 0; i < cpCount; i++) {
      cp = c._contacts[i]!
      this.resetRotationRadii(a, b, cp.point, i)
      this.resetRelativeVelocity(a, b, i)

      const vr = this.vrs[i]!
      const vr_dot_n = vr.dot(normal)
      if (vr_dot_n > 0) {
        continue
      }
      // Reaction impulse magnitude (jr)
      let jr = -(1 + coeffs.restitution) * vr_dot_n
      const ra = this.ras[i]!
      const rb = this.rbs[i]!
      const irxn_ra = EMath.scalarCross(a.invMoi * ra.cross(normal), ra)
      const irxn_rb = EMath.scalarCross(b.invMoi * rb.cross(normal), rb)
      jr /= sumInvMasses + irxn_ra.add(irxn_rb).dot(normal)
      jr /= cpCount
      if (EMath.isNearlyEqual(jr, 0, Physics.NEARLY_ZERO_MAGNITUDE)) {
        continue
      }
      // Reaction impulse (Jr)
      impulse.set(normal.x * jr, normal.y * jr)
      this.applyImpulse(impulse, a, ra, -1)
      this.applyImpulse(impulse, b, rb, 1)

      this.resetRelativeVelocity(a, b, i)

      // Tangent
      vr.subtract(normal.multiplyByScalar(normal.dot(vr)), this.tan)
      if (this.tan.magnitudeIsNearlyEqualTo(this.zeroVector, Physics.NEARLY_ZERO_MAGNITUDE)) {
        continue
      } else {
        this.tan.normalize(this.tan)
      }
      const js = jr * coeffs.friction.static
      const jd = jr * coeffs.friction.dynamic
      const vr_dot_tan = vr.dot(this.tan)
      // Frictional impulse magnitude (jf)
      let jf = vr_dot_tan === 0 || vr_dot_tan <= js ? -vr_dot_tan : -jd
      jf /= cpCount
      // Frictional impulse (Jf)
      impulse.set(this.tan.x * jf, this.tan.y * jf)
      this.applyImpulse(impulse, a, ra, -1)
      this.applyImpulse(impulse, b, rb, 1)
    }
  }

  private resetRotationRadii(a: RigidBody, b: RigidBody, point: Point, i: number) {
    const ra = this.ras[i]!
    const rb = this.rbs[i]!
    point.subtract(a.position, ra)
    point.subtract(b.position, rb)
    ra.orthogonalize(this.ras_orth[i]!)
    rb.orthogonalize(this.rbs_orth[i]!)
  }

  private resetRelativeVelocity(a: RigidBody, b: RigidBody, i: number) {
    const angvel_a = this.ras_orth[i]!.multiplyByScalar(a.angularVelocity, this.vs[0])
    const angvel_b = this.rbs_orth[i]!.multiplyByScalar(b.angularVelocity, this.vs[1])
    const vel_a = a.velocity.add(angvel_a, this.vs[0])
    const vel_b = b.velocity.add(angvel_b, this.vs[1])
    vel_b.subtract(vel_a, this.vrs[i])
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
      restitution: Math.min(a._restitution, b._restitution),
      friction: {
        static: EMath.average(a._friction.static, b._friction.static),
        dynamic: EMath.average(a._friction.dynamic, b._friction.dynamic),
      },
    }
  }
}
