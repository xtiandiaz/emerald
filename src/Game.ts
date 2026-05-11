import { Application, Ticker, type ApplicationOptions } from 'pixi.js'
import { Scene, Screen, AnyScene } from '.'
import { EMath } from './extras'
//
import * as PIXI from 'pixi.js'
import gsap from 'gsap'
import PixiPlugin from 'gsap/PixiPlugin'

export class Game extends Application {
  public isPaused = false
  protected scene?: AnyScene

  private fixedTime = {
    step: 1 / 60,
    reserve: 0,
  }

  constructor() {
    super()

    PixiPlugin.registerPIXI(PIXI)
    gsap.registerPlugin(PixiPlugin)
  }

  async init(options: Partial<Game.Options>): Promise<void> {
    await super.init(options)

    this.ticker.add(this.fixedUpdate, this)
    this.ticker.add(this.update, this)

    this.renderer.on('resize', this.onResized, this)
    this.onResized(this.screen.width, this.screen.height)
  }

  deinit() {
    this.scene?._deinit()

    this.renderer.removeAllListeners()
    this.ticker.remove(this.fixedUpdate, this)
    this.ticker.remove(this.update, this)
  }

  async createScene(constructor: Scene.Constructor) {
    // TODO Add optional transition sequence

    if (this.scene) {
      await this.scene._deinit()
      this.stage.removeChild(this.scene)
    }

    const nextScene = new constructor(this.renderer)
    await nextScene._init()

    this.scene = nextScene
    this.stage.addChild(nextScene)
  }

  private fixedUpdate(ticker: Ticker) {
    if (this.isPaused) {
      return
    }
    this.fixedTime.reserve = EMath.clamp(this.fixedTime.reserve + ticker.deltaMS, 0, 0.1)

    while (this.scene && this.fixedTime.reserve >= this.fixedTime.step) {
      this.scene._fixedUpdate(/* this.signalController,  */ this.fixedTime.step)

      this.fixedTime.reserve -= this.fixedTime.step
    }
  }

  private update(ticker: Ticker) {
    if (this.isPaused) {
      return
    }
    // this.signalController.emitQueuedSignals()

    this.scene?._update(/* this.signalController, */ ticker.deltaTime)
    // this.scene?.updateDebug(ticker.FPS)
  }

  private onResized(width: number, height: number) {
    Screen._setSize(width, height)

    // this.signalController.queue('screen-resized', { width, height })
  }
}

export namespace Game {
  export interface Options extends ApplicationOptions {}

  export type Constructor = new () => Game
}
