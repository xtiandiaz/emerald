import { EntityComponent } from '../core'
import { Collision } from './Collision'
import { Collider } from '../components'

export class RayCaster {
  constructor(private colliders: EntityComponent<Collider>[]) {}

  cast(ray: Collision.Ray): boolean {
    for (let i = 0; i < this.colliders.length; i++) {
      this.colliders[i][1].evaluateRayIntersection(ray)
      if (ray.intersects) {
        return true
      }
    }

    return false
  }
}
