import { Point, type PointData } from 'pixi.js'
import { EMath } from '../extras'

export class Camera {
  framedToBounds = true
  readonly offset = new Point()
  private _speed?: number
  private _zoom = 1

  constructor(public options?: Partial<Camera.Options>) {
    if (options?.frameToBounds !== undefined) this.framedToBounds = options.frameToBounds
    if (options?.offset) this.offset.copyFrom(options.offset)
    if (options?.zoom) this.zoom = options.zoom
    if (options?.speed !== undefined) this.speed = options.speed
  }

  get speed(): number | undefined {
    return this._speed
  }
  set speed(value: number) {
    this._speed = EMath.clamp(value / 10, 0, 1)
  }

  get zoom(): number {
    return this._zoom
  }
  set zoom(value: number) {
    this._zoom = EMath.clamp(value, 0, Infinity)
  }
}

export namespace Camera {
  export interface Options {
    frameToBounds: boolean
    offset: PointData
    zoom: number
    speed?: number
  }
}
