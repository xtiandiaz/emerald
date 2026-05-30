import { EMath } from './EMath'

export namespace ERandom {
  export const randomInteger = (min: number, max: number): number => {
    min = Math.floor(min)
    max = EMath.clamp(Math.floor(max), min, Infinity)

    return min + Math.round(Math.random() * (max - min))
  }
}
