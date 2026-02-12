import { Point, type Size } from 'pixi.js'
import { type Components } from '../components'
import { Stage, System, Screen } from '../core'
import type { Signals } from '../signals'
import { EMath } from '../extras'

export class CameraSystem<C extends Components, S extends Signals> extends System<C, S> {
  private targetPosition = new Point()
  private zoomedEntityPos = new Point()
  private zoom = 1

  update(stage: Stage<C>, toolkit: System.UpdateToolkit<S>, dT: number): void {
    if (!stage.currentCamera) {
      return
    }
    const [id, camera] = stage.currentCamera
    const entity = stage.getEntity(id)!

    entity.position.multiplyScalar(camera.zoom, this.zoomedEntityPos)
    const zoomedBoundsSize: Size = {
      width: stage.boundsArea.width * camera.zoom,
      height: stage.boundsArea.height * camera.zoom,
    }

    this.targetPosition.x =
      zoomedBoundsSize.width < Screen.width
        ? (Screen.width - zoomedBoundsSize.width) * 0.5
        : EMath.clamp(
            -this.zoomedEntityPos.x + Screen.halfWidth,
            -zoomedBoundsSize.width + Screen.width,
            0,
          ) + camera.offset.x

    this.targetPosition.y =
      zoomedBoundsSize.height < Screen.height
        ? (Screen.height - zoomedBoundsSize.height) * 0.5
        : EMath.clamp(
            -this.zoomedEntityPos.y + Screen.halfHeight,
            -zoomedBoundsSize.height + Screen.height,
            0,
          ) + camera.offset.y

    const speed = camera.speed
    if (speed) {
      this.zoom += ((camera.zoom - this.zoom) / speed) * dT
      stage.position.x += ((this.targetPosition.x - stage.position.x) / speed) * dT
      stage.position.y += ((this.targetPosition.y - stage.position.y) / speed) * dT
    } else {
      this.zoom = camera.zoom
      stage.position.copyFrom(this.targetPosition)
    }

    stage.scale.set(this.zoom)
  }
}
