import { RigidBody, CollisionSensor } from '../components'
import { System, Signal, Entity, _Signal } from './'
import { Point, type PointData } from 'pixi.js'

export { Point as Vector, type PointData as VectorData }

export interface Range {
  min: number
  max: number
}

export type KeyMap<T> = { [key: string]: T }

export interface Component {}

export type ComponentIndex = {
  'collision-sensor': CollisionSensor
  'rigid-body': RigidBody
}

export type EntityComponent<T extends Component> = [entityId: number, component: T]

export type SomeEntity<CI extends ComponentIndex, T extends Entity<CI>> = new (
  id: number,
  hasComponent: <K extends keyof CI>(key: K) => boolean,
  getComponent: <K extends keyof CI>(key: K) => CI[K] | undefined,
  addComponent: <
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
  removeComponent: <K extends keyof CI>(key: K) => boolean,
  tag: (tag: string) => Entity<CI>,
  getTag: () => string | undefined,
) => T

export type SomeSystem<ComponentMap extends ComponentIndex, T extends System<ComponentMap>> = new (
  ...args: any
) => T

export type SomeSignal<T extends Signal> = new (...args: any) => T

export type SignalConnector<T extends Signal> = (s: T) => void
export type _SignalConnector<D> = (s: _Signal<D>) => void
export type AnySignalConnector = (s: Signal) => void
export type _AnySignalConnector = (s: _Signal<any>) => void

export interface SignalBus {
  _emit<D>(code: string, data: D): void
  emit<T extends Signal>(signal: T): void
  queue<T extends Signal>(signal: T): void
  connect<T extends Signal>(type: SomeSignal<T>, connector: SignalConnector<T>): Disconnectable
  _connect<D>(code: string, connector: _SignalConnector<D>): Disconnectable

  disconnect<T extends Signal>(type: SomeSignal<T>, connector: SignalConnector<T>): void
}

export interface Disconnectable {
  disconnect(): void
}
