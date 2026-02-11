import { Container, EventEmitter, type ContainerChild, type ContainerEvents } from 'pixi.js'
import type { Disconnectable } from '../core'

export namespace Input {
  export type DocumentEventConnector<T extends keyof DocumentEventMap> = (
    e: DocumentEventMap[T],
  ) => void

  type AnyEvent = { [K: ({} & string) | ({} & symbol)]: any }
  export type ContainerEventConnector<T extends keyof ContainerEvents<ContainerChild>> = (
    ...args: EventEmitter.ArgumentMap<ContainerEvents<ContainerChild> & AnyEvent>[Extract<
      T,
      keyof ContainerEvents<ContainerChild> | keyof AnyEvent
    >]
  ) => void

  export interface Provider {
    connectDocumentEvent<T extends keyof DocumentEventMap>(
      type: T,
      connector: DocumentEventConnector<T>,
    ): Disconnectable
    connectContainerEvent<T extends keyof ContainerEvents<ContainerChild>>(
      type: T,
      connector: ContainerEventConnector<T>,
    ): Disconnectable
  }

  export function connectDocumentEvent<T extends keyof DocumentEventMap>(
    type: T,
    connector: (e: DocumentEventMap[T]) => void,
  ): Disconnectable {
    document.addEventListener(type, connector)

    return {
      disconnect: () => document.removeEventListener(type, connector),
    }
  }

  export function connectContainerEvent<T extends keyof ContainerEvents<ContainerChild>>(
    type: T,
    target: Container,
    connector: (
      ...args: EventEmitter.ArgumentMap<ContainerEvents<ContainerChild> & AnyEvent>[Extract<
        T,
        keyof ContainerEvents<ContainerChild> | keyof AnyEvent
      >]
    ) => void,
  ): Disconnectable {
    target.on(type, connector)

    return {
      disconnect: () => target.off(type, connector),
    }
  }
}
