import { Container, FederatedPointerEvent, type FederatedEventMap } from 'pixi.js'
import type { Disconnectable } from '../core'
import { Input } from '.'

export class InputController<K extends string> {
  private onSignal!: (signal: Input.Signal<any>) => void
  // Actions to linked keyboard keys
  private keyCodeToActionsMap = new Map<string, Set<K>>()
  // Actions to linked pointer event types
  private pointerEventTypeToActionsMap = new Map<keyof FederatedEventMap, Set<K>>()
  private connections: Disconnectable[] = []
  private pad?: Container

  init(
    inputMap: Record<K, Input.Control>,
    inputPad: Container,
    onSignal: (signal: Input.Signal<any>) => void,
  ) {
    this.onSignal = onSignal

    inputPad.interactive = true
    this.pad = inputPad

    const entries = Object.entries<Input.Control>(inputMap)
    const keyboardEntries = entries.filter(
      ([_, control]) => control.source == Input.Source.KEYBOARD,
    ) as [K, Input.KeyboardControl][]

    for (const [action, control] of keyboardEntries) {
      for (const keyCode of control.keyCodes) {
        if (!this.keyCodeToActionsMap.has(keyCode)) {
          this.keyCodeToActionsMap.set(keyCode, new Set())
        }
        this.keyCodeToActionsMap.get(keyCode)!.add(action)
      }
    }
    this.connections.push(
      Input.connectDocumentEvent('keydown', (event: KeyboardEvent) => {
        this.emitKeyboardSignal(event)
      }),
      Input.connectDocumentEvent('keyup', (event: KeyboardEvent) => {
        this.emitKeyboardSignal(event)
      }),
    )

    const pointerEntries = entries.filter(
      ([_, control]) => control.source == Input.Source.POINTER,
    ) as [K, Input.PointerControl][]

    for (const [action, control] of pointerEntries) {
      const eventName = control.eventType
      if (!this.pointerEventTypeToActionsMap.has(eventName)) {
        this.pointerEventTypeToActionsMap.set(eventName, new Set())
      }
      this.pointerEventTypeToActionsMap.get(eventName)!.add(action)
    }
    for (const [eventType, actions] of this.pointerEventTypeToActionsMap) {
      this.connections.push(
        Input.connectContainerEvent(eventType, inputPad, (event) => {
          if (event instanceof FederatedPointerEvent) {
            actions.forEach((action) => this.onSignal(new Input.PointerSignal(action, event)))
          }
        }),
      )
    }
  }

  deinit() {
    this.pad!.interactive = false
    this.pad = undefined

    this.connections.forEach((c) => c.disconnect())
    this.connections.length = 0
  }

  private emitKeyboardSignal(event: KeyboardEvent) {
    this.keyCodeToActionsMap.get(event.code)?.forEach((action) => {
      this.onSignal(new Input.KeyboardSignal(action, event))
    })
  }
}
