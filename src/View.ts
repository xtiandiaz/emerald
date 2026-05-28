import { Point, Rectangle } from 'pixi.js'
import { Camera } from './components'

export interface View {
  bounds: Rectangle
  viewport: Rectangle
  position: Point
  scale: Point
  camera?: View.CameraEntity

  setCamera(entityId: number): Camera | undefined
}

export namespace View {
  export type CameraEntity = [Camera, entityId: number]
}
