import { Container, ContainerChild, PointData } from 'pixi.js'
import { Components } from '../components'

export type EntityConstructor<Cs extends Components, T extends Entity<Cs>> = new (
  id: number,
  hasComponent: <K extends keyof Cs>(key: K) => boolean,
  getComponent: <K extends keyof Cs>(key: K) => Cs[K] | undefined,
  addComponent: <
    K0 extends keyof Cs,
    K1 extends keyof Cs,
    K2 extends keyof Cs,
    K3 extends keyof Cs,
    K4 extends keyof Cs,
  >(
    entry0: [K0, Cs[K0]],
    entry1?: [K1, Cs[K1]],
    entry2?: [K2, Cs[K2]],
    entry3?: [K3, Cs[K3]],
    entry4?: [K4, Cs[K4]],
  ) => Cs[K0],
  removeComponent: <K extends keyof Cs>(key: K) => boolean,
  tag: (tag: string) => Entity<Cs>,
  getTag: () => string | undefined,
) => T

export abstract class Entity<Cs extends Components> extends Container {
  constructor(
    public readonly id: number,
    public hasComponent: <K extends keyof Cs>(key: K) => boolean,
    public getComponent: <K extends keyof Cs>(key: K) => Cs[K] | undefined,
    public addComponent: <
      K0 extends keyof Cs,
      K1 extends keyof Cs,
      K2 extends keyof Cs,
      K3 extends keyof Cs,
      K4 extends keyof Cs,
    >(
      entry0: [K0, Cs[K0]],
      entry1?: [K1, Cs[K1]],
      entry2?: [K2, Cs[K2]],
      entry3?: [K3, Cs[K3]],
      entry4?: [K4, Cs[K4]],
    ) => Cs[K0],
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
    children: ContainerChild[]
  }
}
