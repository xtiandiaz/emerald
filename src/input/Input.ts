import { EventEmitter, type ContainerChild, type ContainerEvents } from 'pixi.js'

export namespace Input {
  export type DocumentEventConnector<T extends keyof DocumentEventMap> = (
    e: DocumentEventMap[T],
  ) => void

  export type AnyContainerEvent = { [K: ({} & string) | ({} & symbol)]: any }
  export type ContainerEventConnector<T extends keyof ContainerEvents<ContainerChild>> = (
    ...args: EventEmitter.ArgumentMap<ContainerEvents<ContainerChild> & AnyContainerEvent>[Extract<
      T,
      keyof ContainerEvents<ContainerChild> | keyof AnyContainerEvent
    >]
  ) => void
}
