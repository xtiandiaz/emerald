import { Transform as PixiTransform, PointData } from 'pixi.js'
import { toRadians } from '../geometry'

export class Transform extends PixiTransform {
  constructor(options?: Partial<Transform.Options>) {
    super()

    if (options?.angle) this.rotation = toRadians(options.angle)
    if (options?.position) this.position.set(options.position.x, options.position.y)
    if (options?.rotation) this.rotation = options.rotation
    if (options?.scale) {
      if (typeof options.scale === 'number') this.scale.set(options.scale)
      else this.scale.set(options.scale.x, options.scale.y)
    }
  }
}

export namespace Transform {
  export interface Options {
    angle: number // degrees
    position: PointData
    rotation: number // radians
    scale: number | PointData
  }
}
