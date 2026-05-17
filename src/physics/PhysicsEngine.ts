import type { Point } from 'pixi.js'
import { Gravity, Physics } from '.'
import { Vector, type VectorData } from '..'
import { RigidBody, Collider } from '../components'
import { EMath } from '../extras'

export class PhysicsEngine {
  // Relative velocities per contact-point
  private vrs = [new Vector(), new Vector()]
  // Rotation radii and their orthogonals per contact-point
  private ras = [new Vector(), new Vector()]
  private ra_orths = [new Vector(), new Vector()]
  private rbs = [new Vector(), new Vector()]
  private rb_orths = [new Vector(), new Vector()]
  // Reaction impulses and magnitudes per contact-point
  private Jrs = [new Vector(), new Vector()]
  // Frictional impulses and magnitudes per contact-point
  private Jfs = [new Vector(), new Vector()]
  // Tangent
  private tan = new Vector()

  stepBody(body: RigidBody, gravity: Gravity, pixelsPerMeter: number, dt: number) {
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

    body.position.x += body.velocity.x * dt * pixelsPerMeter
    body.position.y += body.velocity.y * dt * pixelsPerMeter
    body.rotation += body.angularVelocity * dt * pixelsPerMeter
  }

  separateBodies(a: RigidBody, b: RigidBody, depth: VectorData) {
    if (a.type === 'static' && b.type === 'static') {
      return
    }
    if (a.type === 'static') {
      b.position.add(depth, b.position)
    } else if (b.type === 'static') {
      a.position.add(depth, a.position)
    } else {
      depth.x /= 2
      depth.y /= 2
      a.position.subtract(depth, a.position)
      b.position.add(depth, b.position)
    }
  }

  /*  
    Collision response based on the 'reaction model',
    https://en.wikipedia.org/wiki/Collision_response#Impulse-based_reaction_model
  */
  resolveCollision(a: RigidBody, b: RigidBody, contact: Collider.Contact) {
    const zeroVector = new Vector()

    const coeffs = PhysicsEngine.getResolutionCoefficients(a, b)
    const sumInvMasses = a.invMass + b.invMass
    const normal = contact.normal

    this.clearImpulses()

    this.separateBodies(a, b, contact.normal.multiplyByScalar(contact.depth))

    if (!contact.points) {
      return
    }

    const pointCount = contact.points.length
    const totalDepth = contact.points.reduce((acc, p) => (acc += p.depth), 0)
    const jrs = [0, 0] // Impulse magnitudes (per point)
    let denom: number

    for (let i = 0; i < pointCount; i++) {
      const cp = contact.points[i]!
      this.resetRotationRadii(a, b, cp.point, i)

      this.resetRelativeVelocity(a, b, i)
      const vrDotN = this.vrs[i]!.dot(normal)
      if (vrDotN > 0) {
        return
      }
      // Reaction impulse magnitude (jr)
      jrs[i] = -(1 + coeffs.restitution) * vrDotN
      denom =
        (sumInvMasses +
          Math.pow(this.ras[i]!.cross(normal), 2) * a.invInertia +
          Math.pow(this.rbs[i]!.cross(normal), 2) * b.invInertia) /
        pointCount

      // Reaction impulse
      const Jr = this.Jrs[i]!
      const weight = cp.depth / totalDepth
      Jr.add(normal.multiplyByScalar((weight * jrs[i]!) / denom), Jr)
    }

    for (let i = 0; i < pointCount; i++) {
      const cp = contact.points[i]!
      this.resetRotationRadii(a, b, cp.point, i)

      this.resetRelativeVelocity(a, b, i)
      const vr = this.vrs[i]!

      // Tangent
      vr.subtract(normal.multiplyByScalar(vr.dot(normal)), this.tan)
      if (this.tan.isNearlyEqualTo(zeroVector, Physics.NEARLY_ZERO_MAGNITUDE)) {
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
          Math.pow(this.ra_orths[i]!.dot(this.tan), 2) * a.invInertia +
          Math.pow(this.rb_orths[i]!.dot(this.tan), 2) * b.invInertia) /
        pointCount

      // Frictional impulse
      const Jf = this.Jfs[i]!
      const weight = cp.depth / totalDepth
      Jf.add(this.tan.multiplyByScalar((weight * jf) / denom), Jf)
    }

    this.applyImpulses(a, this.ras, pointCount, -1)
    this.applyImpulses(b, this.rbs, pointCount, 1)
  }

  private resetRotationRadii(a: RigidBody, b: RigidBody, point: Point, index: number) {
    const ra = this.ras[index]!
    const rb = this.rbs[index]!
    point.subtract(a.position, ra)
    point.subtract(b.position, rb)
    ra.orthogonalize(this.ra_orths[index]!)
    rb.orthogonalize(this.rb_orths[index]!)
  }

  private resetRelativeVelocity(a: RigidBody, b: RigidBody, index: number) {
    const vr = this.vrs[index]
    b.velocity
      .add(this.rb_orths[index]!.multiplyByScalar(b.angularVelocity), vr)
      .subtract(a.velocity, vr)
      .subtract(this.ra_orths[index]!.multiplyByScalar(a.angularVelocity), vr)
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
      body.angularVelocity += sign * (r.cross(Jr) + r.cross(Jf)) * body.invInertia
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
