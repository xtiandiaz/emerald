import { Rectangle } from 'pixi.js'
import {
  type World,
  type Component,
  type SignalMap,
  type Signaler,
  Disconnectable,
  Signal,
  View,
} from './'

export abstract class System<S extends SignalMap> {
  protected readonly connections = Array<Disconnectable>()

  constructor(
    protected world: World,
    protected view: View,
    protected signaler: Signaler<S>,
  ) {}

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

  /* HELPER METHODS */

  createEntity(tag?: string) {
    return this.world.createEntity(tag)
  }

  addComponent<
    C1 extends Component,
    C2 extends Component,
    C3 extends Component,
    C4 extends Component,
    C5 extends Component,
  >(entityId: number, c1: C1, c2?: C2, c3?: C3, c4?: C4, c5?: C5) {
    if (!this.world.hasEntity(entityId)) {
      return
    }
    this.world.addComponent(c1, entityId)
    if (c2) this.world.addComponent(c2, entityId)
    if (c3) this.world.addComponent(c3, entityId)
    if (c4) this.world.addComponent(c4, entityId)
    if (c5) this.world.addComponent(c5, entityId)
  }

  getComponent<T extends Component>(
    typeValue: Component.Constructor<T>,
    entityId: number,
  ): T | undefined {
    return this.world.getComponent(typeValue, entityId)
  }

  emit<K extends keyof S>(key: K, signal: S[K]): void {
    this.signaler.emit(key, signal)
  }

  connect<K extends keyof S>(key: K, connector: Signal.Connector<S[K]>) {
    this.connections.push(this.signaler.connect(key, connector))
  }
}

export namespace System {
  export type Constructor<S extends SignalMap, T extends System<S>> = new (
    world: World,
    view: View,
    signaler: Signaler<S>,
  ) => T
}
