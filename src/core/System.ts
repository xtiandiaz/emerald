import type { World, SignalMap, SignalBus } from './'
import { ComponentMap } from '../components'

export abstract class System<C extends ComponentMap, S extends SignalMap> {
  constructor(
    protected world: World<C>,
    protected signals: SignalBus.Proxy<S>,
  ) {}

  abstract init(): void

  deinit?(): void
  _deinit(): void {
    this.deinit?.()

    this.signals.stop()
  }

  fixedUpdate?(dT: number): void
  update?(dT: number): void
}

export namespace System {
  export type Constructor<
    C extends ComponentMap,
    S extends SignalMap,
    T extends System<C, S>,
  > = new (world: World<C>, signaler: SignalBus.Proxy<S>) => T
}
