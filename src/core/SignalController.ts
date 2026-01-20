import {
  Signal,
  SignalBus,
  SignalConnector,
  AnySignalConnector,
  SomeSignal,
  Disconnectable,
  _AnySignalConnector,
  _Signal,
  _SignalConnector,
} from '.'

export class SignalController implements SignalBus {
  private connectors = new Map<string, Set<AnySignalConnector>>()
  private _connectors = new Map<string, Set<_AnySignalConnector>>()
  private signalQueue: Signal[] = []

  _emit<D>(code: string, data: D): void {
    this._connectors.get(code)?.forEach((c) => c(new _Signal(code, data)))
  }

  emit<T extends Signal>(signal: T): void {
    this.connectors.get(signal.name)?.forEach((c) => c(signal))
  }

  queue<T extends Signal>(signal: T): void {
    this.signalQueue.push(signal)
  }

  connect<T extends Signal>(type: SomeSignal<T>, connector: SignalConnector<T>): Disconnectable {
    if (!this.connectors.has(type.name)) {
      this.connectors.set(type.name, new Set())
    }
    this.connectors.get(type.name)!.add(connector as AnySignalConnector)

    return {
      disconnect: () => this.disconnect(type, connector),
    }
  }

  _connect<D>(code: string, connector: _SignalConnector<D>): Disconnectable {
    if (!this._connectors.has(code)) {
      this._connectors.set(code, new Set())
    }
    this._connectors.get(code)!.add(connector as _AnySignalConnector)

    return {
      disconnect: () => {} /* this.disconnect(code, connector) */,
    }
  }

  disconnect<T extends Signal>(type: SomeSignal<T>, connector: SignalConnector<T>) {
    this.connectors.get(type.name)?.delete(connector as AnySignalConnector)
  }

  emitQueuedSignals() {
    const signals = [...this.signalQueue]
    this.signalQueue.length = 0

    for (const s of signals) {
      this.emit(s)
    }
  }
}
