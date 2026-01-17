import type {
  Signal,
  SignalBus,
  SignalConnector,
  AnySignalConnector,
  SomeSignal,
  Disconnectable,
} from '.'

export class Antenna implements SignalBus {
  private connectors = new Map<string, Set<AnySignalConnector>>()
  private signalQueue: Signal[] = []

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

  clear() {
    this.signalQueue.length = 0
    this.connectors.clear()
  }
}
