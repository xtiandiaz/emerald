import { Application, Container, Ticker, type ApplicationOptions } from 'pixi.js'
import { type FixedTime, type GameState } from '.'
import { Scene, Screen, World, type SignalBus, type Disconnectable, clamp } from '../core'
import { SignalController } from '../controllers'
import { ScreenResized } from '../signals'
import { Debug } from '../debug'

export interface GameOptions extends ApplicationOptions {
  debug: Debug.Options
}

export class Game<State extends GameState> extends Application {
  protected readonly world = new World()
  protected readonly signalController = new SignalController()
  protected scene?: Scene
  private display = new Container()
  private debugDisplay?: Debug.Display
  private fixedTime: FixedTime = {
    step: 1 / 60,
    reserve: 0,
  }
  private connections: Disconnectable[] = []

  constructor(
    public state: State,
    private scenes: Scene[],
  ) {
    super()

    this.stage.addChild(this.world, this.display)
  }

  async init(options: Partial<GameOptions>, startScene?: string): Promise<void> {
    await super.init(options)

    this.connections.push(...(this.connect?.(this.signalController) ?? []))

    this.ticker.add(this.fixedUpdate, this)
    this.ticker.add(this.update, this)

    this.renderer.on('resize', this.onResized, this)
    this.onResized()

    this.display.hitArea = this.screen

    if (startScene) {
      await this.switchToScene(startScene)
    }
    if (options.debug) {
      this.debugDisplay = new Debug.Display(options.debug)
      this.debugDisplay.stats?.init(this.ticker, this.world)
      this.stage.addChild(this.debugDisplay)
    }
  }

  connect?(signalBus: SignalBus): Disconnectable[]

  deinit() {
    this.connections.forEach((d) => d.disconnect())
    this.connections.length = 0

    this.ticker.remove(this.update, this)
    this.renderer.off('resize', this.onResized, this)

    this.scene?.deinit()
    this.scene = undefined
  }

  async switchToScene(name: string) {
    const nextScene = this.scenes.find((s) => s.name == name)
    if (!nextScene) {
      return
    }

    await nextScene.init(this.world, this.signalController, this.display)

    if (this.scene) {
      this.scene.deinit()
    }

    this.scene = nextScene
  }

  private fixedUpdate(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.fixedTime.reserve = clamp(this.fixedTime.reserve + ticker.deltaMS, 0, 0.1)

    while (this.fixedTime.reserve >= this.fixedTime.step) {
      this.scene?.systems.forEach((s) => {
        s.fixedUpdate?.(this.world, this.signalController, this.fixedTime.step)
      })

      this.fixedTime.reserve -= this.fixedTime.step
    }
  }

  private update(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.signalController.emitQueuedSignals()

    this.scene?.systems.forEach((s) => {
      s.update?.(this.world, this.signalController, ticker.deltaTime)
    })

    this.signalController.emitQueuedSignals()
  }

  private onResized() {
    Screen._w = this.screen.width
    Screen._h = this.screen.height
    this.signalController.queue(new ScreenResized(Screen.width, Screen.height))
  }
}
