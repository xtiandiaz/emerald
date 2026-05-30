import { SignalMap } from '../signal'
import { System } from '../System'
import { Collider, RigidBody, Transform } from '../components'
import { Container } from 'pixi.js'

export class TransformSystem<S extends SignalMap> extends System<S> {
  init(): void {}

  update(_: number): void {
    const ts = this.world.getComponents(Transform)
    for (const [e, t] of ts) {
      for (const c of this.world.getLikeComponents(Container, e) ?? []) {
        c.setFromMatrix(t.matrix)
      }
      if (!this.hasComponent(RigidBody, e)) {
        // Colliders are updated by the Transform System only when there's NO RigidBody bound to the entity
        // Otherwise, the PhysicsSystem will update them
        this.getComponent(Collider, e)?._transform.setFromMatrix(t.matrix)
      }
    }
  }
}
