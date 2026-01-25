import type { Stage, Disconnectable } from './'
import { Components } from '../components'
import { Signals } from '../signals'
import { Input } from '../input'
import { RayCaster } from '../collision'

export class System<C extends Components, S extends Signals> {
  protected connections: Disconnectable[] = []

  _init(stage: Stage<C>, toolkit: System.InitToolkit<S>) {
    this.connections.push(...(this.init?.(stage, toolkit) ?? []))
  }
  init?(stage: Stage<C>, toolkit: System.InitToolkit<S>): Disconnectable[]

  deinit() {
    this.connections.forEach((c) => c.disconnect())
    this.connections.length = 0
  }

  fixedUpdate?(stage: Stage<C>, toolkit: System.UpdateToolkit<S>, dT: number): void
  update?(stage: Stage<C>, toolkit: System.UpdateToolkit<S>, dT: number): void
}

export namespace System {
  export interface InitToolkit<S extends Signals> {
    signals: Signals.Bus<S>
    input: Input.Provider
  }

  export interface UpdateToolkit<S extends Signals> {
    signals: Signals.Emitter<S>
    rayCaster: RayCaster
  }
}
