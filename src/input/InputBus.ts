import { Container, ContainerChild, ContainerEvents, EventMode } from 'pixi.js'
import { Disconnectable } from '../types'
import { Input } from '.'

export class InputBus<Action> {
  private readonly connections = new Map<Action, Disconnectable>()

  deinit() {
    this.connections.forEach((c) => c.disconnect())
  }

  connectContainer<K extends keyof ContainerEvents<ContainerChild>>(
    container: Container,
    options: {
      event: K
      mode: EventMode
    },
    action: Action,
    connector: Input.ContainerEventConnector<K>,
  ) {
    container.eventMode = options.mode
    this.resetConnection(
      action,
      InputBus.connectContainerEvent(options.event, container, connector),
    )
  }

  connectDocument<K extends keyof DocumentEventMap>(
    event: K,
    action: Action,
    connector: Input.DocumentEventConnector<K>,
  ) {
    this.resetConnection(action, InputBus.connectDocumentEvent(event, connector))
  }

  disconnect(action: Action) {
    this.connections.get(action)?.disconnect()
  }

  static connectContainerEvent<T extends keyof ContainerEvents<ContainerChild>>(
    type: T,
    target: Container,
    connector: Input.ContainerEventConnector<T>,
  ): Disconnectable {
    target.on(type, connector)

    return {
      disconnect: () => target.off(type, connector),
    }
  }

  static connectDocumentEvent<T extends keyof DocumentEventMap>(
    type: T,
    connector: Input.DocumentEventConnector<T>,
  ): Disconnectable {
    document.addEventListener(type, connector)

    return {
      disconnect: () => document.removeEventListener(type, connector),
    }
  }

  private resetConnection(action: Action, connection: Disconnectable) {
    this.disconnect(action)
    this.connections.set(action, connection)
  }
}
