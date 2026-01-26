import type { Disconnectable } from '../core'
import type { Signals } from '.'

export class SignalController<SI extends Signals> implements Signals.Bus<SI> {
  private connectors = new Map<keyof SI, Set<Signals.Connector<SI, any>>>()
  private signalQueue: [keyof SI, SI[keyof SI]][] = []

  emit<K extends keyof SI>(code: K, signal: SI[K]): void {
    this.connectors.get(code)?.forEach((c) => c(signal))
  }

  queue<K extends keyof SI>(code: K, signal: SI[K]): void {
    this.signalQueue.push([code, signal])
  }

  connect<K extends keyof SI>(code: K, connector: Signals.Connector<SI, K>): Disconnectable {
    if (!this.connectors.has(code)) {
      this.connectors.set(code, new Set())
    }
    this.connectors.get(code)!.add(connector)

    return {
      disconnect: () => this.disconnect(code, connector),
    }
  }

  disconnect<K extends keyof SI>(code: K, connector: Signals.Connector<SI, K>): void {
    this.connectors.get(code)?.delete(connector)
  }

  emitQueuedSignals() {
    const queuedSignals = [...this.signalQueue]
    this.signalQueue.length = 0

    for (const [code, signal] of queuedSignals) {
      this.emit(code, signal)
    }
  }
}
