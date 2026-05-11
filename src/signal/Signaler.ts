import { Disconnectable } from '../types'
import { Signal } from './Signal'
import { SignalMap } from './SignalMap'

export interface Signaler<S extends SignalMap> {
  emit<K extends keyof S>(key: K, signal: S[K]): void
  queue<K extends keyof S>(code: K, signal: S[K]): void

  connect<K extends keyof S>(key: K, connector: Signal.Connector<S[K]>): Disconnectable
}
