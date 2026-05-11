import { type World, type SignalMap, type Signaler, Disconnectable } from './'
import { ComponentMap } from './components'

export abstract class System<C extends ComponentMap, S extends SignalMap> {
  protected readonly connections = Array<Disconnectable>()

  constructor(
    protected world: World<C>,
    protected signaler: Signaler<S>,
  ) {}

  abstract init(): void

  deinit?(): void
  _deinit(): void {
    this.deinit?.()

    this.connections.forEach((c) => c.disconnect())
  }

  fixedUpdate?(dT: number): void
  update?(dT: number): void
}

export namespace System {
  export type Constructor<
    C extends ComponentMap,
    S extends SignalMap,
    T extends System<C, S>,
  > = new (world: World<C>, signaler: Signaler<S>) => T
}
