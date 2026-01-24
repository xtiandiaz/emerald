import { Vector } from '../core'

export namespace EVector {
  export const direction = (angle: number) => new Vector(Math.cos(angle), Math.sin(angle))
}
