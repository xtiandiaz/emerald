import { Signal, SignalMap } from '.'
import { Disconnectable } from '../types'

export class SignalBus<S extends SignalMap> {
  private readonly connectors = new Map<keyof S, Set<Signal.Connector<any>>>()

  emit<K extends keyof S>(key: K, signal: S[K]): void {
    this.connectors.get(key)?.forEach((c) => c(signal))
  }

  _connect<K extends keyof S>(key: K, connector: Signal.Connector<S[K]>): Disconnectable {
    if (!this.connectors.has(key)) {
      this.connectors.set(key, new Set())
    }
    this.connectors.get(key)!.add(connector)

    return {
      disconnect: () => this._disconnect(key, connector),
    }
  }

  private _disconnect<K extends keyof S>(key: K, connector: Signal.Connector<S[K]>): void {
    this.connectors.get(key)?.delete(connector)
  }
}

export namespace SignalBus {
  export class Proxy<S extends SignalMap> {
    private readonly connections = new Map<keyof S, Disconnectable>()

    constructor(private bus: SignalBus<S>) {}

    deinit() {
      this.connections.forEach((c) => c.disconnect())
      this.connections.clear()
    }

    connect<K extends keyof S>(key: K, connector: Signal.Connector<S[K]>) {
      this.connections.set(key, this.bus._connect(key, connector))
    }
    disconnect<K extends keyof S>(key: K) {
      this.connections.get(key)?.disconnect()
      this.connections.delete(key)
    }

    emit<K extends keyof S>(key: K, signal: S[K]): void {
      this.bus.emit(key, signal)
    }
  }
}
