import { ExtraMath } from './ExtraMath'

export namespace Randomness {
  export const randomInteger = (min: number, max: number): number => {
    min = Math.floor(min)
    max = Math.floor(max)
    max = ExtraMath.clamp(max, min + 1, Infinity)

    return min + Math.round(Math.random() * (max - min))
  }
}
