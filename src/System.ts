import { Rectangle } from 'pixi.js'
import {
  type World,
  type SignalMap,
  type Signaler,
  Disconnectable,
  Signal,
  View,
  Entity,
  ComponentConstructor,
  Transform,
} from './'

export abstract class System<S extends SignalMap> {
  protected readonly connections = Array<Disconnectable>()

  constructor(
    protected world: World,
    protected view: View,
    protected signaler: Signaler<S>,
    private _priority: number,
  ) {}

  get priority(): number {
    return this._priority
  }

  get bounds(): Rectangle {
    return this.view.bounds
  }
  get viewport(): Rectangle {
    return this.view.viewport
  }

  abstract init(): void

  deinit?(): void
  _deinit(): void {
    this.deinit?.()

    this.connections.forEach((c) => c.disconnect())
  }

  fixedUpdate?(dt: number): void

  update?(dt: number): void

  emit<K extends keyof S>(key: K, signal: S[K]): void {
    this.signaler.emit(key, signal)
  }

  connect<K extends keyof S>(key: K, connector: Signal.Connector<S[K]>) {
    this.connections.push(this.signaler.connect(key, connector))
  }

  addEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (e: WindowEventMap[K]) => void,
  ) {
    const _listener = (e: WindowEventMap[K]) => listener(e)
    const disconnectable: Disconnectable = {
      disconnect: () => window.removeEventListener(type, _listener),
    }
    window.addEventListener(type, _listener)

    return disconnectable
  }
}

export namespace System {
  export type Constructor<S extends SignalMap, T extends System<S>> = new (
    world: World,
    view: View,
    signaler: Signaler<S>,
    priority: number,
  ) => T
}
