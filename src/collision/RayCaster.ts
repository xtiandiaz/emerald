import { Collider } from './Collider'
import { Collision } from './Collision'

export class RayCaster {
  private ray?: Collision.Ray

  cast(rays: Collision.Ray[], origin: Collider) {
    // rays.forEach((r) => {
    //       ray = A.collider.transformRay(r, ray)
    //       B.collider.evaluateRayIntersection(ray!)
    //     })
  }
}
