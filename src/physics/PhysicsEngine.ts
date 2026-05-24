import type { Point } from 'pixi.js'
import { Vector, type VectorData } from '..'
import { Gravity, Physics } from '.'
import { RigidBody } from '../components'
import { Collision } from '../collision'
import { EMath } from '../extras'

export class PhysicsEngine {
  // Relative velocities per contact-point
  private vrs = [new Vector(), new Vector()]
  // Rotation radii and their orthogonals per contact-point
  private rras = [new Vector(), new Vector()]
  private rra_orths = [new Vector(), new Vector()]
  private rrbs = [new Vector(), new Vector()]
  private rrb_orths = [new Vector(), new Vector()]
  // Reaction impulses and magnitudes per contact-point
  private Jrs = [new Vector(), new Vector()]
  // Frictional impulses and magnitudes per contact-point
  private Jfs = [new Vector(), new Vector()]
  // Tangent
  private tan = new Vector()
  private zeroVector = new Vector()

  stepBody(body: RigidBody, gravity: Gravity, ppm: number, dt: number) {
    switch (body.type) {
      case 'static':
        return
      case 'dynamic':
        const forces = gravity.clone()
        forces.addScalars(body._force.x / dt, body._force.y / dt, forces)
        body._force.set(0, 0)

        body.velocity.addScalars(forces.x * dt, forces.y * dt, body.velocity)
        // body.velocity.x *= 1 - body._drag.x
        // body.velocity.y *= 1 - body._drag.y

        body.angularVelocity += body.torque * dt
        // body.angularVelocity *= 1 - body._angularDrag
        body.torque = 0
        break
    }

    body.position.x += body.velocity.x * dt * ppm
    body.position.y += body.velocity.y * dt * ppm
    body.rotation += body.angularVelocity * dt * ppm
  }

  separateBodies(a: RigidBody, b: RigidBody, depth: VectorData) {
    if (a.type === 'static' && b.type === 'static') {
      return
    }
    if (a.type === 'static') {
      b.position.add(depth, b.position)
    } else if (b.type === 'static') {
      a.position.subtract(depth, a.position)
    } else {
      depth.x /= 2
      depth.y /= 2
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

    this.separateBodies(a, b, normal.multiplyByScalar(c._depth))

    if (c._contactCount <= 0) {
      return
    }
    const totalDepth = c.totalContactsDepth
    const jrs = [0, 0] // Impulse magnitudes (per point)
    let i: number, denom: number

    this.clearImpulses()
    for (i = 0; i < c._contactCount; i++) {
      const cp = c._contacts[i]!
      this.resetRotationRadii(a, b, cp.point, i)
      this.resetRelativeVelocity(a, b, i)
      const n_dot_vr = normal.dot(this.vrs[i]!)
      if (n_dot_vr > 0) {
        return
      }
      // Reaction impulse magnitude (jr)
      jrs[i] = -(1 + coeffs.restitution) * n_dot_vr
      denom =
        (sumInvMasses +
          Math.pow(this.rras[i]!.cross(normal), 2) * a.invMoi +
          Math.pow(this.rrbs[i]!.cross(normal), 2) * b.invMoi) /
        c._contactCount

      // Reaction impulse
      const Jr = this.Jrs[i]!
      const weight = cp.depth / totalDepth
      Jr.add(normal.multiplyByScalar((weight * jrs[i]!) / denom), Jr)
    }
    for (i = 0; i < c._contactCount; i++) {
      const cp = c._contacts[i]
      this.resetRotationRadii(a, b, cp.point, i)
      this.resetRelativeVelocity(a, b, i)
      const vr = this.vrs[i]!
      // Tangent
      vr.subtract(normal.multiplyByScalar(vr.dot(normal)), this.tan)
      if (this.tan.isNearlyEqualTo(this.zeroVector, Physics.NEARLY_ZERO_MAGNITUDE)) {
        continue
      } else {
        this.tan.normalize(this.tan)
      }

      const jr = jrs[i]!
      const js = jr * coeffs.friction.static
      const jd = jr * coeffs.friction.dynamic
      const vr_dot_tan = vr.dot(this.tan)
      // Frictional impulse magnitude (jf)
      const jf = vr_dot_tan == 0 || vr_dot_tan <= js ? -vr_dot_tan : -jd
      denom =
        (sumInvMasses +
          Math.pow(this.rra_orths[i]!.dot(this.tan), 2) * a.invMoi +
          Math.pow(this.rrb_orths[i]!.dot(this.tan), 2) * b.invMoi) /
        c._contactCount

      // Frictional impulse
      const Jf = this.Jfs[i]!
      const weight = cp.depth / totalDepth
      Jf.add(this.tan.multiplyByScalar((weight * jf) / denom), Jf)
    }
    this.applyImpulses(a, this.rras, c._contactCount, -1)
    this.applyImpulses(b, this.rrbs, c._contactCount, 1)
  }

  private resetRotationRadii(a: RigidBody, b: RigidBody, point: Point, index: number) {
    const ra = this.rras[index]!
    const rb = this.rrbs[index]!
    point.subtract(a.position, ra)
    point.subtract(b.position, rb)
    ra.orthogonalize(this.rra_orths[index]!)
    rb.orthogonalize(this.rrb_orths[index]!)
  }

  private resetRelativeVelocity(a: RigidBody, b: RigidBody, index: number) {
    const vr = this.vrs[index]
    b.velocity
      .add(this.rrb_orths[index]!.multiplyByScalar(b.angularVelocity), vr)
      .subtract(a.velocity, vr)
      .subtract(this.rra_orths[index]!.multiplyByScalar(a.angularVelocity), vr)
  }

  private clearImpulses() {
    this.Jrs.forEach((Jr) => Jr.set(0, 0))
    this.Jfs.forEach((Jf) => Jf.set(0, 0))
  }

  private applyImpulses(body: RigidBody, rs: Vector[], pointCount: number, sign: 1 | -1) {
    if (body.type === 'static') {
      return
    }
    for (let i = 0; i < pointCount; i++) {
      const Jr = this.Jrs[i]!
      const Jf = this.Jfs[i]!
      const r = rs[i]!
      body.velocity.x += sign * (Jr.x + Jf.x) * body.invMass
      body.velocity.y += sign * (Jr.y + Jf.y) * body.invMass
      body.angularVelocity += sign * (r.cross(Jr) + r.cross(Jf)) * body.invMoi
    }
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
