import { Polygon } from '.'

export class Rectangle extends Polygon {
  constructor(width: number, height: number) {
    const halfW = width / 2
    const halfH = height / 2
    super([
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ])
  }
}
