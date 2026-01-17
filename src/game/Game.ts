import { Application, Container, Ticker, type ApplicationOptions } from 'pixi.js'
import { type FixedTime, type GameState } from '.'
import { Scene, Screen, Antenna, World, clamp, type SignalBus, type Disconnectable } from '../core'
import { ScreenResized } from '../signals'
import { Debug } from '../debug'

export interface GameOptions extends ApplicationOptions {
  debug: Debug.GameOptions
}

export class Game<State extends GameState> extends Application {
  protected world!: World
  protected antenna!: Antenna
  protected scene?: Scene
  private display!: Container
  private debugDisplay?: Debug.Display
  private fixedTime: FixedTime = {
    step: 1 / 60,
    reserve: 0,
  }
  private connections: Disconnectable[] = []
  private options?: Partial<GameOptions>

  constructor(
    public state: State,
    private scenes: Scene[],
  ) {
    super()
  }

  async init(options: Partial<GameOptions>, startScene?: string): Promise<void> {
    this.options = options

    await super.init(options)

    this.world = new World()
    this.display = new Container()
    this.stage.addChild(this.world, this.display)

    this.antenna = new Antenna()

    this.initDebugIfNeeded()

    this.connections.push(...(this.connect?.(this.antenna) ?? []))

    this.ticker.add(this.fixedUpdate, this)
    this.ticker.add(this.update, this)

    this.renderer.on('resize', this.onResized, this)
    this.onResized()

    this.display.hitArea = this.screen

    if (startScene) {
      await this.switchToScene(startScene)
    }
  }

  connect?(signalBus: SignalBus): Disconnectable[]

  deinit() {
    this.debugDisplay?.deinit()

    this.stage.removeChildren()

    this.connections.forEach((d) => d.disconnect())
    this.connections.length = 0

    this.renderer.removeAllListeners()

    this.ticker.remove(this.fixedUpdate, this)
    this.ticker.remove(this.update, this)

    this.scene?.deinit()
    this.scene = undefined
  }

  async switchToScene(name: string) {
    const nextScene = this.scenes.find((s) => s.name == name)
    if (!nextScene) {
      return
    }

    await nextScene.init(this.world, this.antenna, this.display)

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
        s.fixedUpdate?.(this.world, this.antenna, this.fixedTime.step)
      })

      this.fixedTime.reserve -= this.fixedTime.step
    }
  }

  private update(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.antenna.emitQueuedSignals()

    this.scene?.systems.forEach((s) => {
      s.update?.(this.world, this.antenna, ticker.deltaTime)
    })

    this.antenna.emitQueuedSignals()
  }

  private onResized() {
    Screen._w = this.screen.width
    Screen._h = this.screen.height
    this.antenna.queue(new ScreenResized(Screen.width, Screen.height))
  }

  private initDebugIfNeeded() {
    if (!this.options?.debug) {
      return
    }
    this.debugDisplay = new Debug.Display(this.options.debug)
    this.stage.addChild(this.debugDisplay)

    this.debugDisplay.init(this.ticker, this.world, this.antenna)
  }
}
