import {
  Container,
  EventEmitter,
  FederatedPointerEvent,
  type ContainerChild,
  type ContainerEvents,
  type FederatedEventMap,
} from 'pixi.js'
import type { Disconnectable } from '../core'

export namespace Input {
  export type KeyboardEventType = Extract<keyof DocumentEventMap, 'keydown'>
  export type PointerEventType = Extract<
    keyof FederatedEventMap,
    'pointerdown' | 'pointerup' | 'pointerupoutside' | 'pointermove'
  >

  export enum Source {
    KEYBOARD,
    POINTER,
  }

  export interface Control {
    source: Source
  }
  export interface KeyboardControl extends Control {
    keyCodes: string[]
  }
  export interface PointerControl extends Control {
    eventType: PointerEventType
  }

  export namespace Control {
    export const keyboard = (...keyCodes: string[]): KeyboardControl => ({
      source: Source.KEYBOARD,
      keyCodes,
    })

    export const pointer = (eventType: PointerEventType): PointerControl => {
      return { source: Source.POINTER, eventType }
    }
  }

  export class Signal<E = KeyboardEvent | FederatedPointerEvent> {
    constructor(
      public source: Source,
      public action: string,
      public event: E,
    ) {}
  }
  export class KeyboardSignal extends Signal<KeyboardEvent> {
    get isKeyDown(): boolean {
      return this.event.type == 'keydown'
    }
    get isRepeated(): boolean {
      return this.event.repeat
    }

    constructor(action: string, event: KeyboardEvent) {
      super(Input.Source.KEYBOARD, action, event)
    }
  }
  export class PointerSignal extends Signal<FederatedPointerEvent> {
    constructor(action: string, event: FederatedPointerEvent) {
      super(Input.Source.POINTER, action, event)
    }
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

  type AnyEvent = { [K: ({} & string) | ({} & symbol)]: any }
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
