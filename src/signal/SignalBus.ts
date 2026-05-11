import { Signal, Signaler, SignalMap } from '.'
import { Disconnectable } from '../types'

export class SignalBus<S extends SignalMap> implements Signaler<S> {
  private readonly connectors = new Map<keyof S, Set<Signal.Connector<any>>>()
  private _queue: [keyof S, S[keyof S]][] = []

  emit<K extends keyof S>(key: K, signal: S[K]): void {
    this.connectors.get(key)?.forEach((c) => c(signal))
  }
  queue<K extends keyof S>(key: K, signal: S[K]): void {
    this._queue.push([key, signal])
  }

  emitQueued() {
    const queuedSignals = [...this._queue]
    this._queue.length = 0

    for (const [key, signal] of queuedSignals) {
      this.emit(key, signal)
    }
  }

  connect<K extends keyof S>(key: K, connector: Signal.Connector<S[K]>): Disconnectable {
    if (!this.connectors.has(key)) {
      this.connectors.set(key, new Set())
    }
    this.connectors.get(key)!.add(connector)

    return {
      disconnect: () => this.disconnect(key, connector),
    }
  }

  private disconnect<K extends keyof S>(key: K, connector: Signal.Connector<S[K]>): void {
    this.connectors.get(key)?.delete(connector)
  }
}
