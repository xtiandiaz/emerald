import { Rectangle, Renderer, Sprite } from 'pixi.js'
import { World, System, Screen, SignalBus, SignalMap } from '.'
import { Debug } from './debug'
import { ComponentMap } from './components'

export type AnyScene = Scene<any, any>

export abstract class Scene<C extends ComponentMap, S extends SignalMap> extends World<C> {
  protected readonly systems = new Map<string, System<C, S>>()
  protected readonly signals: SignalBus.Proxy<S>

  private readonly signalBus = new SignalBus<S>()
  private inputPad = new Sprite()
  // private rayCaster = new RayCaster(this._colliders)
  // private signals?: Signals.Bus<S>
  private debugDisplay?: Debug.Display

  constructor(protected renderer: Renderer) {
    // protected readonly options?: Partial<Scene.Options>,
    super()

    this.signals = new SignalBus.Proxy(this.signalBus)

    // this.boundsArea = options?.bounds ?? new Rectangle(0, 0, Screen.width, Screen.height)

    // this.getLayer(Stage.Layer.UI).attach(this.inputPad)
    this.addChild(this.inputPad)
  }

  async init?(): Promise<void>
  async _init(): Promise<void> {
    await this.init?.()

    // this.initDebugIfNeeded(signals)

    this.systems.forEach((s) => s.init() ?? [])

    this.onResized()
  }

  async deinit?(): Promise<void>
  async _deinit() {
    await this.deinit?.()

    this.systems.forEach((s) => s.deinit?.())
    this.signals.deinit()

    super.clear()

    // this.debugDisplay?.deinit()

    this.destroy({ children: true, texture: true, textureSource: true })
  }

  fixedUpdate?(dT: number): void
  _fixedUpdate(/* signals: Signals.Bus<S>, */ dT: number) {
    this.systems.forEach((s) => {
      s.fixedUpdate?.(dT)
    })
  }

  update?(dT: number): void
  _update(/* signals: Signals.Bus<S>, */ dT: number) {
    this.systems.forEach((s) => {
      s.update?.(dT)
    })
  }

  /* SYSTEMS */

  createSystem<T extends System<C, S>>(constructor: System.Constructor<C, S, T>): T {
    this.removeSystem(constructor.name)
    const s = new constructor(this, new SignalBus.Proxy(this.signalBus))
    this.systems.set(constructor.name, s)

    return s
  }

  removeSystem(key: string): boolean {
    this.systems.get(key)?.deinit?.()
    return this.systems.delete(key)
  }

  /* INPUT */

  /* Private */

  private onResized() {
    this.inputPad.setSize(Screen.width, Screen.height)
  }

  // Debug ⬇️

  // initDebugIfNeeded(signals: Signals.Bus<S>) {
  //   if (!this.options?.debug) {
  //     return
  //   }
  //   this.debugDisplay = new Debug.Display(this.options.debug)
  //   this.getLayer(Stage.Layer.DEBUG).attach(this.debugDisplay)
  //   this.addChild(this.debugDisplay)

  //   this.debugDisplay.init(this, signals)
  // }

  // updateDebug(fps: number) {
  //   this.debugDisplay?.stats?.update(fps)
  // }
}

export namespace Scene {
  export type Constructor = new (renderer: Renderer) => AnyScene

  export interface Options {
    bounds: Rectangle
    debug: Debug.Options.Scene
  }
}
