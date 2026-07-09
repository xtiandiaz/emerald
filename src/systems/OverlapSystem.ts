import { System } from '../System'
import { SignalMap } from '../signal'
import { ShapeOverlap } from '../collision'
import { Vector } from '../types'

export class OverlapSystem<S extends SignalMap> extends System<S> {
  // options = PhysicsSystem.defaultOptions()

  init(): void {}

  update(dt: number): void {
    const cols = this.world._crs
    const so = new ShapeOverlap()
    let i = 0,
      normal: Vector,
      depth: number

    for (i = 0; i < cols.length; i++) {
      cols[i][0].overlaps.clear()
    }
    for (i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const [cr_a, e_a] = cols[i]!
        const [cr_b, e_b] = cols[j]!
        depth = so._depth
        normal = so._normal.clone()

        if (cr_a.hasOverlap(cr_b, so)) {
          cr_a.overlaps.set(e_b, {
            otherId: e_b,
            otherTag: this.world.getTag(e_b),
            depth,
            normal,
          })
          cr_b.overlaps.set(e_a, {
            otherId: e_a,
            otherTag: this.world.getTag(e_a),
            depth,
            normal,
          })
        }
      }
    }
  }
}

export namespace OverlapSystem {
  export interface Options {}
}
