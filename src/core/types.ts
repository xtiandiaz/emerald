import { System, Signal, type Component, Entity } from './'
import { Point, type PointData } from 'pixi.js'

export { Point as Vector }
export type { PointData as VectorData }

export interface Range {
  min: number
  max: number
}

export enum Direction {
  Up = 'UP',
  Right = 'RIGHT',
  Down = 'DOWN',
  Left = 'LEFT',
}

export type KeyMap<T> = { [key: string]: T }

export type SomeComponent<T extends Component> = new (...args: any) => T
export type EntityComponent<T extends Component> = [entityId: number, component: T]

export type SomeEntity<T extends Entity> = new (
  id: number,
  hasComponent: <T extends Component>(type: SomeComponent<T>) => boolean,
  getComponent: <T extends Component>(type: SomeComponent<T>) => T | undefined,
  addComponent: <T extends Component, U extends T[]>(...components: U) => U[0] | undefined,
  removeComponent: <T extends Component>(type: SomeComponent<T>) => boolean,
  tag: (tag: string) => Entity,
  getTag: () => string | undefined,
) => T

export type SomeSystem<T extends System> = new (...args: any) => T

export type SomeSignal<T extends Signal> = new (...args: any) => T

export type SignalConnector<T extends Signal> = (s: T) => void
export type AnySignalConnector = (s: Signal) => void

export interface SignalBus {
  emit<T extends Signal>(signal: T): void
  queue<T extends Signal>(signal: T): void
  connect<T extends Signal>(type: SomeSignal<T>, connector: SignalConnector<T>): Disconnectable
  disconnect<T extends Signal>(type: SomeSignal<T>, connector: SignalConnector<T>): void
}

export interface Disconnectable {
  disconnect(): void
}
