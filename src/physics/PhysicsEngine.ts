import type { Point } from 'pixi.js'
import { Physics } from './'
import { isNearlyEqual, Vector } from '../core'
import { RigidBody } from '../components'
import { type Collision } from '../collision'
import { EMath } from '../extras'

export class PhysicsEngine {
  // Rotation radii and their orthogonals per contact-point
  private rAs = [new Vector(), new Vector()]
  private rAOrths = [new Vector(), new Vector()]
  private rBs = [new Vector(), new Vector()]
  private rBOrths = [new Vector(), new Vector()]
  // Relative velocities per contact-point
  private vrs = [new Vector(), new Vector()]
  // Reaction impulses and magnitudes per contact-point
  private jrs = new Array<number>(2)
  private Jrs = [new Vector(), new Vector()]
  // Frictional impulses and magnitudes per contact-point
  private Jfs = [new Vector(), new Vector()]
  // Tangent
  private T = new Vector()

  stepBody(body: RigidBody, gravity: Physics.Gravity, PPM: number, dT: number) {
    if (body.isStatic) {
      return
    }
    if (!body.isKinematic) {
      const forces = gravity.vector.multiplyScalar(gravity.value)
      forces.x += body._force.x / dT
      forces.y += body._force.y / dT
      body._force.set(0, 0)

      body.velocity.x += forces.x * dT
      body.velocity.x *= 1 - body._drag.x
      body.velocity.y += forces.y * dT
      body.velocity.y *= 1 - body._drag.y

      body.angularVelocity += body.torque * dT
      body.angularVelocity *= 1 - body._angularDrag
      body.torque = 0
    }

    body._transform.position.x += body.velocity.x * PPM * dT
    body._transform.position.y += body.velocity.y * PPM * dT
    body._transform.rotation += body.angularVelocity * PPM * dT
  }

  separateBodies(A: RigidBody, B: RigidBody, depth: Vector) {
    if (A.isStatic) {
      B._transform.position.x += depth.x
      B._transform.position.y += depth.y
    } else if (B.isStatic) {
      A._transform.position.x -= depth.x
      A._transform.position.y -= depth.y
    } else {
      A._transform.position.x -= depth.x * 0.5
      A._transform.position.y -= depth.y * 0.5
      B._transform.position.x += depth.x * 0.5
      B._transform.position.y += depth.y * 0.5
    }
  }

  /*  
    Collision Response: https://en.wikipedia.org/wiki/Collision_response#Impulse-based_reaction_model
  */
  resolveCollision(collision: Collision) {
    if (!collision.points) {
      return
    }

    const A = collision.A
    const B = collision.B
    const zeroVector = new Vector()
    const pointCount = collision.points.length
    const coeffs = PhysicsEngine.getResolutionCoefficients(A, B)
    const sumInvMasses = A.invMass + B.invMass
    const totalDepth = collision.points.reduce((acc, p) => (acc += p.depth), 0)
    const N = collision.normal

    this.clearImpulses()

    for (let i = 0; i < pointCount; i++) {
      const cp = collision.points[i]!
      this.resetRotationRadii(A, B, cp.point, i)

      this.resetRelativeVelocity(A, B, i)
      const vrDotN = this.vrs[i]!.dot(N)
      if (vrDotN > 0) {
        return
      }
      // Reaction impulse magnitude (jr)
      this.jrs[i] = -(1 + coeffs.restitution) * vrDotN
      const rA = this.rAs[i]!
      const rB = this.rBs[i]!
      const sqrd_rAcrossN_x_invI = Math.pow(rA.cross(N), 2) * A.invInertia
      const sqrd_rBcrossN_x_invI = Math.pow(rB.cross(N), 2) * B.invInertia
      const massDenom = sumInvMasses + sqrd_rAcrossN_x_invI + sqrd_rBcrossN_x_invI

      // Reaction impulse
      const Jr = this.Jrs[i]!
      const weight = cp.depth / totalDepth
      Jr.add(N.multiplyScalar((weight * this.jrs[i]!) / massDenom / pointCount), Jr)
    }

    for (let i = 0; i < pointCount; i++) {
      const cp = collision.points[i]!
      this.resetRotationRadii(A, B, cp.point, i)

      this.resetRelativeVelocity(A, B, i)
      const vr = this.vrs[i]!
      const vrDotN = vr.dot(N)

      // Tangent
      vr.subtract(N.multiplyScalar(vrDotN), this.T)
      if (this.T.isNearlyEqual(zeroVector, Physics.NEARLY_ZERO_MAGNITUDE)) {
        continue
      } else {
        this.T.normalize(this.T)
      }

      const jr = this.jrs[i]!
      const js = jr * coeffs.friction.static
      const jd = jr * coeffs.friction.dynamic
      const vrDotT = vr.dot(this.T)
      // Frictional impulse magnitude (jf)
      const jf = vrDotT == 0 || vrDotT <= js ? -vrDotT : -jd
      const rAOrth = this.rAOrths[i]!
      const rBOrth = this.rBOrths[i]!
      const sqrd_rAcrossT_x_invI = Math.pow(rAOrth.dot(this.T), 2) * A.invInertia
      const sqrd_rBcrossT_x_invI = Math.pow(rBOrth.dot(this.T), 2) * B.invInertia
      const massDenom = sumInvMasses + sqrd_rAcrossT_x_invI + sqrd_rBcrossT_x_invI

      // Frictional impulse
      const Jf = this.Jfs[i]!
      const weight = cp.depth / totalDepth
      Jf.add(this.T.multiplyScalar((weight * jf) / massDenom / pointCount), Jf)
    }

    this.applyImpulses(A, this.rAs, pointCount, -1)
    this.applyImpulses(B, this.rBs, pointCount, 1)
  }

  private resetRotationRadii(A: RigidBody, B: RigidBody, point: Point, index: number) {
    const rA = this.rAs[index]!
    const rB = this.rBs[index]!
    point.subtract(A._transform.position, rA)
    point.subtract(B._transform.position, rB)
    rA.orthogonalize(this.rAOrths[index]!)
    rB.orthogonalize(this.rBOrths[index]!)
  }

  private resetRelativeVelocity(A: RigidBody, B: RigidBody, index: number) {
    const vr = this.vrs[index]
    B.velocity
      .add(this.rBOrths[index]!.multiplyScalar(B.angularVelocity), vr)
      .subtract(A.velocity, vr)
      .subtract(this.rAOrths[index]!.multiplyScalar(A.angularVelocity), vr)
  }

  private clearImpulses() {
    this.Jrs.forEach((Jr) => Jr.set(0, 0))
    this.Jfs.forEach((Jf) => Jf.set(0, 0))
  }

  private applyImpulses(body: RigidBody, rs: Vector[], pointCount: number, sign: 1 | -1) {
    if (body.isStatic) {
      return
    }
    for (let i = 0; i < pointCount; i++) {
      const Jr = this.Jrs[i]!
      const Jf = this.Jfs[i]!
      const r = rs[i]!
      body.velocity.x += sign * (Jr.x + Jf.x) * body.invMass
      body.velocity.y += sign * (Jr.y + Jf.y) * body.invMass
      body.angularVelocity += sign * (r.cross(Jr) + r.cross(Jf)) * body.invInertia
    }
  }
}

export namespace PhysicsEngine {
  export interface ResolutionCoefficients {
    restitution: number
    friction: Physics.Friction
  }

  export function getResolutionCoefficients(A: RigidBody, B: RigidBody): ResolutionCoefficients {
    return {
      restitution: Math.max(A._restitution, B._restitution),
      friction: {
        static: EMath.average(A._friction.static, B._friction.static),
        dynamic: EMath.average(A._friction.dynamic, B._friction.dynamic),
      },
    }
  }
}
