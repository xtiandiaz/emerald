import { Point, type PointData, type Rectangle } from 'pixi.js'
import { Camera, type Components } from '../components'
import { Stage, System, Screen, type EntityConstructor, type EntityComponent } from '../core'
import type { Signals } from '../signals'
import { EMath } from '../extras'

export class CameraSystem<C extends Components, S extends Signals> extends System<C, S> {
  private targetPositions = new Map<number, Point>()

  // setMainCamera(entityId: number): boolean

  update(stage: Stage<C>, toolkit: System.UpdateToolkit<S>, dT: number): void {
    const eCameras = stage.getEntityComponents('camera')
    let current: { id: number; camera: Camera } | undefined

    for (const [id, camera] of eCameras) {
      const entity = stage.getEntity(id)!

      this.setTargetPosition(id, entity.position, camera.offset, stage.boundsArea)

      if (camera.options?.isCurrent) {
        current = { id, camera }
      }
    }

    if (current) {
      const targetPos = this.targetPositions.get(current.id)!
      const ease = current.camera.positionEase

      if (ease) {
        stage.position.x += (targetPos.x - stage.position.x) / ease
        stage.position.y += (targetPos.y - stage.position.y) / ease
      } else {
        stage.position.copyFrom(targetPos)
      }
    }
  }

  private setTargetPosition(
    id: number,
    entityPos: PointData,
    offset: PointData,
    bounds: Rectangle,
  ) {
    const halfSW = Screen.width * 0.5
    const halfSH = Screen.height * 0.5
    const x = EMath.clamp(-entityPos.x + halfSW, -bounds.width + Screen.width, 0) + offset.x
    const y = EMath.clamp(-entityPos.y + halfSH, -bounds.height + Screen.height, 0) + offset.y

    if (!this.targetPositions.has(id)) {
      this.targetPositions.set(id, new Point())
    }
    this.targetPositions.get(id)!.set(x, y)
  }
}
