import { Application, Ticker, type ApplicationOptions } from 'pixi.js'
import { Scene, Screen, type Disconnectable } from '../core'
import type { Components } from '../components'
import { type Signals, SignalController } from '../signals'
import { EMath } from '../extras'
//
import * as PIXI from 'pixi.js'
import gsap from 'gsap'
import PixiPlugin from 'gsap/PixiPlugin'

export abstract class Game<
  C extends Components,
  S extends Signals,
  State extends Game.State,
> extends Application {
  protected signalController!: SignalController<S>
  protected scene?: Scene<C, S>

  private connections: Disconnectable[] = []
  private fixedTime: Game.FixedTime = {
    step: 1 / 60,
    reserve: 0,
  }

  constructor(public state: State) {
    super()

    PixiPlugin.registerPIXI(PIXI)
    gsap.registerPlugin(PixiPlugin)
  }

  async load?(): Promise<void>

  connect?(signals: Signals.Bus<S>, state: State): Disconnectable[]

  async init(options: Partial<Game.Options>): Promise<void> {
    await super.init(options)
    await this.load?.()

    this.signalController = new SignalController()

    this.connections.push(...(this.connect?.(this.signalController, this.state) ?? []))

    this.ticker.add(this.fixedUpdate, this)
    this.ticker.add(this.update, this)

    this.renderer.on('resize', this.onResized, this)
    this.onResized(this.screen.width, this.screen.height)
  }

  async playScene<T extends Scene<C, S>>(type: new () => T) {
    // TODO Add optional transition sequence

    if (this.scene) {
      this.stage.removeChild(this.scene)
      await this.scene.deinit()
    }

    const nextScene = new type()
    await nextScene.init(this.signalController)

    this.stage.addChild(nextScene)
    this.scene = nextScene
  }

  private fixedUpdate(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.fixedTime.reserve = EMath.clamp(this.fixedTime.reserve + ticker.deltaMS, 0, 0.1)

    while (this.scene && this.fixedTime.reserve >= this.fixedTime.step) {
      this.scene.fixedUpdate(this.signalController, this.fixedTime.step)

      this.fixedTime.reserve -= this.fixedTime.step
    }
  }

  private update(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.signalController.emitQueuedSignals()

    this.scene?.update(this.signalController, ticker.deltaTime)
    this.scene?.updateDebug(ticker.FPS)
  }

  private onResized(width: number, height: number) {
    Screen._setSize(width, height)

    this.signalController.queue('screen-resized', { width, height })
  }
}

export namespace Game {
  export interface Options extends ApplicationOptions {}

  export interface FixedTime {
    step: number
    reserve: number
  }

  export interface State {
    isPaused: boolean
    [key: string]: any
  }
}
