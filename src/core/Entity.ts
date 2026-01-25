import { Container, type ContainerChild, type PointData } from 'pixi.js'
import type { Components } from '../components'
import type { VectorData } from './types'

export type EntityConstructor<Cs extends Components, T extends Entity<Cs>> = new (
  id: number,
  hasComponent: <K extends keyof Cs>(key: K) => boolean,
  getComponent: <K extends keyof Cs>(key: K) => Cs[K] | undefined,
  addComponents: (entries: Partial<Cs>) => Entity<Cs>,
  removeComponent: <K extends keyof Cs>(key: K) => boolean,
  tag: (tag: string) => Entity<Cs>,
  getTag: () => string | undefined,
) => T

export abstract class Entity<Cs extends Components> extends Container {
  constructor(
    public readonly id: number,
    public hasComponent: <K extends keyof Cs>(key: K) => boolean,
    public getComponent: <K extends keyof Cs>(key: K) => Cs[K] | undefined,
    public addComponents: (entries: Partial<Cs>) => Entity<Cs>,
    public removeComponent: <K extends keyof Cs>(key: K) => boolean,
    public tag: (tag: string) => Entity<Cs>,
    public getTag: () => string | undefined,
  ) {
    super()
  }

  abstract init(): void
}

export class SimpleEntity<Cs extends Components> extends Entity<Cs> {
  init(): void {}
}
export namespace SimpleEntity {
  export interface Options {
    tag: string
    position: PointData
    rotation: number
    scale: number | VectorData
    children: ContainerChild[]
    onInit: (container: Container) => void
  }
}
