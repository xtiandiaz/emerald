import { Container, ContainerChild, PointData } from 'pixi.js'
import type { ComponentIndex } from './'

export abstract class Entity<CI extends ComponentIndex> extends Container {
  constructor(
    public readonly id: number,
    public hasComponent: <K extends keyof CI>(key: K) => boolean,
    public getComponent: <K extends keyof CI>(key: K) => CI[K] | undefined,
    public addComponent: <
      K0 extends keyof CI,
      K1 extends keyof CI,
      K2 extends keyof CI,
      K3 extends keyof CI,
      K4 extends keyof CI,
    >(
      entry0: [K0, CI[K0]],
      entry1?: [K1, CI[K1]],
      entry2?: [K2, CI[K2]],
      entry3?: [K3, CI[K3]],
      entry4?: [K4, CI[K4]],
    ) => CI[K0],
    public removeComponent: <K extends keyof CI>(key: K) => boolean,
    public tag: (tag: string) => Entity<CI>,
    public getTag: () => string | undefined,
  ) {
    super()
  }

  abstract init(): void
}

export class SimpleEntity<ComponentMap extends ComponentIndex> extends Entity<ComponentMap> {
  init(): void {}
}
export namespace SimpleEntity {
  export interface Options {
    tag: string
    position: PointData
    children: ContainerChild[]
  }
}
