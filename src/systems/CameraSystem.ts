import { Point, type Size } from 'pixi.js'
import { Camera, type Components } from '../components'
import { Stage, System, Screen, type Disconnectable } from '../core'
import type { Signals } from '../signals'
import { EMath } from '../extras'

export class CameraSystem<C extends Components, S extends Signals> extends System<C, S> {
  private targetPosition = new Point()
  private referencePosition = new Point()
  private zoom = 1

  init(stage: Stage<C>, toolkit: System.InitToolkit<S>): Disconnectable[] {
    if (stage.currentCamera) {
      const { entityId, component: camera } = stage.currentCamera

      this.zoom = camera.zoom
      this.updateFocusPositions(stage.getPosition(entityId)!, camera, stage.boundsArea)

      stage.position.copyFrom(this.targetPosition)
      stage.scale.set(this.zoom)
    }

    return []
  }

  update(stage: Stage<C>, toolkit: System.UpdateToolkit<S>, dT: number): void {
    if (!stage.currentCamera) {
      return
    }

    const { entityId, component: camera } = stage.currentCamera
    this.updateFocusPositions(stage.getPosition(entityId)!, camera, stage.boundsArea)

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

  updateFocusPositions(entityPosition: Point, camera: Camera, boundsSize: Size) {
    entityPosition.multiplyScalar(camera.zoom, this.referencePosition)

    const zoomedBoundsSize: Size = {
      width: boundsSize.width * camera.zoom,
      height: boundsSize.height * camera.zoom,
    }

    this.targetPosition.x =
      zoomedBoundsSize.width < Screen.width
        ? (Screen.width - zoomedBoundsSize.width) * 0.5
        : EMath.clamp(
            -this.referencePosition.x + Screen.halfWidth,
            -zoomedBoundsSize.width + Screen.width,
            0,
          ) + camera.offset.x

    this.targetPosition.y =
      zoomedBoundsSize.height < Screen.height
        ? (Screen.height - zoomedBoundsSize.height) * 0.5
        : EMath.clamp(
            -this.referencePosition.y + Screen.halfHeight,
            -zoomedBoundsSize.height + Screen.height,
            0,
          ) + camera.offset.y
  }
}
