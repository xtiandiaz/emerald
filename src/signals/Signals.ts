import type { Disconnectable } from '../core'
import type { Signal } from '.'
import { Debug } from '../debug'

export interface Signals {
  'entity-added': Signal.EntityAdded
  'entity-removed': Signal.EntityRemoved
  'screen-resized': Signal.ScreenResized
  // Debug
  'debug-physics-enabled': Debug.Signal.PhysicsEnabled
}

export namespace Signals {
  export interface Emitter<Ss extends Signals> {
    emit<K extends keyof Ss>(code: K, signal: Ss[K]): void
    queue<K extends keyof Ss>(code: K, signal: Ss[K]): void
  }

  export type Connector<Ss extends Signals, K extends keyof Ss> = (signal: Ss[K]) => void

  export interface Receiver<Ss extends Signals> {
    connect<K extends keyof Ss>(code: K, connector: Connector<Ss, K>): Disconnectable
    disconnect<K extends keyof Ss>(code: K, connector: Connector<Ss, K>): void
  }

  export interface Bus<Ss extends Signals> extends Emitter<Ss>, Receiver<Ss> {}
}
