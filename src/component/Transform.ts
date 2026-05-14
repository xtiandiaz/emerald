import { Transform as PixiTransform, PointData } from 'pixi.js'

export class Transform extends PixiTransform {
  constructor(options?: { position?: PointData }) {
    super()

    if (options?.position) this.position.set(options.position.x, options.position.y)
  }
}
