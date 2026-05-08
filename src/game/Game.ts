import { Application, Ticker, type ApplicationOptions } from 'pixi.js'
import { Scene, Screen, type Disconnectable } from '../core'
import type { Components } from '../components'
import { type Signals, SignalController } from '../signals'
import { EMath } from '../extras'
//
import * as PIXI from 'pixi.js'
import gsap from 'gsap'
import PixiPlugin from 'gsap/PixiPlugin'

export class Game extends Application {
  // protected signalController!: SignalController<S>
  public state: Game.State
  protected scene?: Scene

  private connections: Disconnectable[] = []
  private fixedTime = {
    step: 1 / 60,
    reserve: 0,
  }

  constructor(state: Game.State) {
    super()

    this.state = state

    PixiPlugin.registerPIXI(PIXI)
    gsap.registerPlugin(PixiPlugin)
  }

  async load?(): Promise<void>

  connect?(/* signals: Signals.Bus */): Disconnectable[]

  async init(options: Partial<Game.Options>): Promise<void> {
    await super.init(options)

    await this.load?.()

    // this.signalController = new SignalController()

    // this.connections.push(...(this.connect?.(this.signalController, this.state) ?? []))

    this.ticker.add(this.fixedUpdate, this)
    this.ticker.add(this.update, this)

    this.renderer.on('resize', this.onResized, this)
    this.onResized(this.screen.width, this.screen.height)
  }

  deinit() {
    this.scene?.deinit()

    this.renderer.removeAllListeners()
    this.ticker.remove(this.fixedUpdate, this)
    this.ticker.remove(this.update, this)
  }

  async play(constructor: Scene.Constructor) {
    // TODO Add optional transition sequence

    if (this.scene) {
      await this.scene.deinit()
      this.stage.removeChild(this.scene)
    }

    const nextScene = new constructor(this.renderer)
    await nextScene.init()

    this.stage.addChild(nextScene)
    this.scene = nextScene
  }

  private fixedUpdate(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.fixedTime.reserve = EMath.clamp(this.fixedTime.reserve + ticker.deltaMS, 0, 0.1)

    while (this.scene && this.fixedTime.reserve >= this.fixedTime.step) {
      // this.scene.fixedUpdate(this.signalController, this.fixedTime.step)

      this.fixedTime.reserve -= this.fixedTime.step
    }
  }

  private update(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    // this.signalController.emitQueuedSignals()

    this.scene?.update(/* this.signalController, */ ticker.deltaTime)
    // this.scene?.updateDebug(ticker.FPS)
  }

  private onResized(width: number, height: number) {
    Screen._setSize(width, height)

    // this.signalController.queue('screen-resized', { width, height })
  }
}

export namespace Game {
  export interface Options extends ApplicationOptions {}

  export interface State {
    isPaused: boolean
    [key: string]: any
  }
}
