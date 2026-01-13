import {
  Container,
  EventEmitter,
  FederatedPointerEvent,
  Point,
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
    eventType: KeyboardEventType
  }
  export interface PointerControl extends Control {
    eventType: PointerEventType
  }

  export namespace Control {
    export const keyboard = (
      // eventType: KeyboardEventType,
      ...keyCodes: string[]
    ): KeyboardControl => ({ source: Source.KEYBOARD, eventType: 'keydown', keyCodes })

    export const pointer = (eventType: PointerEventType): PointerControl => {
      return { source: Source.POINTER, eventType }
    }
  }

  export interface Signal {
    source: Source
    action: string
  }
  export interface KeyboardSignal extends Signal {
    event: KeyboardEvent
  }
  export interface PointerSignal extends Signal {
    event: FederatedPointerEvent
  }

  export function connectDocumentEvent<K extends keyof DocumentEventMap>(
    key: K,
    connector: (e: DocumentEventMap[K]) => void,
  ): Disconnectable {
    document.addEventListener(key, connector)

    return {
      disconnect: () => document.removeEventListener(key, connector),
    }
  }

  type AnyEvent = { [K: ({} & string) | ({} & symbol)]: any }
  export function connectContainerEvent<K extends keyof ContainerEvents<ContainerChild>>(
    key: K,
    target: Container,
    connector: (
      ...args: EventEmitter.ArgumentMap<ContainerEvents<ContainerChild> & AnyEvent>[Extract<
        K,
        keyof ContainerEvents<ContainerChild> | keyof AnyEvent
      >]
    ) => void,
  ): Disconnectable {
    target.on(key, connector)

    return {
      disconnect: () => target.off(key, connector),
    }
  }
}
