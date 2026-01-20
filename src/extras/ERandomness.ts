import { EMath } from './EMath'

export namespace ERandomness {
  export const randomInteger = (min: number, max: number): number => {
    min = Math.floor(min)
    max = Math.floor(max)
    max = EMath.clamp(max, min + 1, Infinity)

    return min + Math.round(Math.random() * (max - min))
  }
}
