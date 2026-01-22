import { type Container, type FederatedPointerEvent } from 'pixi.js'
import type { Disconnectable } from '../core'
import type { Gesture, TapGesture, DragGesture, SwipeGesture } from './gestures'
import { GesturePhase, PointerEventKey } from './types'
// import { distanceSquared, duration } from '../core/utils'
import { Input } from './Input'

export abstract class GestureTracker<T extends Gesture, U> {
  protected abstract pointerEventsKeys: PointerEventKey[]
  protected pGesture?: Partial<T>
  protected onGesture?: (g: T) => void
  protected connections: Disconnectable[] = []

  constructor(protected options: U) {}

  init(target: Container, onGesture: (g: T) => void, options?: Partial<U>) {
    target.interactive = true
    this.onGesture = onGesture

    if (options) {
      this.options = { ...options, ...this.options }
    }
    this.connections.push(
      ...this.pointerEventsKeys.map((k) =>
        Input.connectContainerEvent(k, target, (e) => this.handlePointerEvent(k, e)),
      ),
    )
  }

  deinit() {
    this.connections.forEach((c) => c.disconnect())
  }

  protected abstract handlePointerEvent(key: PointerEventKey, e: FederatedPointerEvent): void
}

export interface TapTrackerOptions {
  timeLimitMS: number
  distanceLimit: number
}

export class TapGestureTracker extends GestureTracker<TapGesture, TapTrackerOptions> {
  protected pointerEventsKeys: PointerEventKey[] = [PointerEventKey.Down, PointerEventKey.Up]

  constructor() {
    super({
      timeLimitMS: 200,
      distanceLimit: 5,
    })
  }

  protected handlePointerEvent(key: PointerEventKey, e: FederatedPointerEvent): void {
    switch (key) {
      case PointerEventKey.Down:
        this.pGesture = {
          startWorldPos: e.global.clone(),
          timestamp: Date.now(),
        }
        break
      case PointerEventKey.Up:
        if (!this.pGesture) {
          break
        }
        if (
          duration(this.pGesture.timestamp!) <= this.options.timeLimitMS &&
          distanceSquared(this.pGesture.startWorldPos!, e.global) <=
            Math.pow(this.options.distanceLimit, 2)
        ) {
          this.onGesture?.({
            ...this.pGesture,
          } as TapGesture)
        }
        this.pGesture = undefined
    }
  }
}

export interface DragTrackerOptions {
  distanceThreshold: number
}

export class DragGestureTracker extends GestureTracker<DragGesture, DragTrackerOptions> {
  protected pointerEventsKeys: PointerEventKey[] = [
    PointerEventKey.Down,
    PointerEventKey.GlobalMove,
    PointerEventKey.Up,
    PointerEventKey.UpOutside,
  ]

  constructor() {
    super({
      distanceThreshold: 0,
    })
  }

  protected handlePointerEvent(key: PointerEventKey, e: FederatedPointerEvent): void {
    switch (key) {
      case PointerEventKey.Down:
        this.pGesture = {
          startWorldPos: e.global.clone(),
          timestamp: Date.now(),
        }
        break
      case PointerEventKey.GlobalMove:
      case PointerEventKey.Up:
      case PointerEventKey.UpOutside:
        if (!this.pGesture) {
          break
        }
        this.pGesture.worldPos = e.global

        if (
          distanceSquared(this.pGesture.startWorldPos!, e.global) >
          Math.pow(this.options.distanceThreshold, 2)
        ) {
          if (!this.pGesture.phase) {
            this.pGesture.phase = GesturePhase.Began
          } else {
            this.pGesture.phase =
              key == PointerEventKey.GlobalMove ? GesturePhase.Changed : GesturePhase.Ended
          }
          this.onGesture?.({
            ...this.pGesture,
          } as DragGesture)
        }
        if (key != PointerEventKey.GlobalMove) {
          this.pGesture = undefined
        }
        break
    }
  }
}

export interface SwipeTrackerOptions {
  distanceThreshold: number
  timeLimitMS: number
}

export class SwipeGestureTracker extends GestureTracker<SwipeGesture, SwipeTrackerOptions> {
  protected pointerEventsKeys: PointerEventKey[] = [
    PointerEventKey.Down,
    PointerEventKey.Up,
    PointerEventKey.UpOutside,
  ]

  constructor() {
    super({
      distanceThreshold: 20,
      timeLimitMS: 250,
    })
  }

  protected handlePointerEvent(key: PointerEventKey, e: FederatedPointerEvent): void {
    switch (key) {
      case PointerEventKey.Down:
        this.pGesture = {
          startWorldPos: e.global.clone(),
          timestamp: Date.now(),
        }
        break
      case PointerEventKey.Up:
      case PointerEventKey.UpOutside:
        if (!this.pGesture) {
          break
        }
        if (
          duration(this.pGesture.timestamp!) <= this.options.timeLimitMS &&
          distanceSquared(this.pGesture.startWorldPos!, e.global) >
            Math.pow(this.options.distanceThreshold, 2)
        ) {
          this.onGesture?.({
            ...this.pGesture,
            direction: e.global.subtract(this.pGesture.startWorldPos!).normalize(),
          } as SwipeGesture)
        }
        this.pGesture = undefined
    }
  }
}
