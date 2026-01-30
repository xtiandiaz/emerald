import { Container, type ContainerChild, type PointData } from 'pixi.js'
import type { Components } from '../components'
import type { VectorData } from './types'

export type EntityConstructor<C extends Components, T extends Entity<C>> = new (
  id: number,
  hasComponent: <K extends keyof C>(key: K) => boolean,
  getComponent: <K extends keyof C>(key: K) => C[K] | undefined,
  addComponents: (entries: Partial<C>) => Entity<C>,
  removeComponent: <K extends keyof C>(key: K) => boolean,
  tag: (tag: string) => Entity<C>,
  getTag: () => string | undefined,
) => T

export abstract class Entity<C extends Components> extends Container {
  constructor(
    public readonly id: number,
    public hasComponent: <K extends keyof C>(key: K) => boolean,
    public getComponent: <K extends keyof C>(key: K) => C[K] | undefined,
    public addComponents: (entries: Partial<C>) => Entity<C>,
    public removeComponent: <K extends keyof C>(key: K) => boolean,
    public tag: (tag: string) => Entity<C>,
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
