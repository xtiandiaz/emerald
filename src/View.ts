import { Point, Rectangle } from 'pixi.js'
import { Camera } from './components'

export interface View {
  bounds: Rectangle
  frame: Rectangle
  position: Point
  scale: Point
  readonly camera?: View.CameraEntity

  setCamera(entityId: number): Camera | undefined
}

export namespace View {
  export type CameraEntity = [Camera, entityId: number]
}
