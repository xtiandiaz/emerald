![Logo](./_img/logo.png)

A simple **WebGL game framework** built on top of [PixiJS](https://github.com/pixijs/pixijs/) for optimal rendering, and written completely in TypeScript.

# Examples (WIP)

→ Check out the [Emerald Chest](https://github.com/xtiandiaz/emerald-chest) to explore the source code and play the live versions of game prototypes built with Emerald.

# Features

- 2D Collision detection
- 2D Ray Casting
- Essential 2D Physics
- Internal communication system, via `Signal`s
- Easy integration of [`DOM Events`](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Events) and Pixi's [Pointer Events](https://pixijs.com/8.x/guides/components/events) for in-game input
- Simple Camera targeting and zooming

### Pending (but in the list):

- Entity pooling (to create and reuse particular Entities).
- A simple visual editor to outline Scenes more easily.

# Getting Started

Emerald follows (some) key principles from the [ECS (Entity–Component–System) architecture](https://en.wikipedia.org/wiki/Entity_component_system); there's:

1. **Components**: particularly either interfaces or classes to contain data and helper methods.
2. **Entities**: [`Container`](https://pixijs.com/8.x/guides/components/scene-objects/container) instances with unique ID and to which innumerable components can be associated.
3. **Systems**: in charge of reading and updating components, and entities, as desired for your game.
4. **Scene**: which is an extension of the `Stage` that manages the entities and components, and which reference is passsed to the systems for them to perform their duties.
5. **Game**: which is an extension Pixi's [`Application`](https://pixijs.download/dev/docs/app.Application.html)
6. **Signals**: data objects with which the systems, scenes and the game itself intercommunicate.

## 1. Define Components

1. Declare an `interface` or `class` that either `extends` or `implements` `Component` for each and everyone of your game's Components:

```typescript
interface MyFirstComponent extends Component {
  ...
}

class MyOtherFancierComponent implements Component {
  ...
}
```

2. Declare an `interface` as the index for all your game's Components that `extends` [`Components`](./src/components/Components.ts). There, register the types of your game's Components by unique `string` keys:

```typescript
interface MyComponents extends Components {
  'my-first': MyFirstComponent
  other: MyOtherFancierComponent
}
```

[`Components`](./src/components/Components.ts) is the base index including the bundled framework's Components (to be also accessible from your game).

## 2. Define your first Scene

1. Declare a `class` that `extends` the `abstract` `Scene` class:

```typescript
class MyFirstScene extends Scene<MyComponents, MySignals> {
  ...
}
```

Note that `Scene` is generic and must be associated with your Components' index type, but also with your Signals' index type.

We will cover Signals at the end. For now, just declare an `interface` that `extends` [`Signals`](./src/signals/Signals.ts)

```typescript
interface MySignals extends Signals {}
```

2. The `Scene` contains one and only `abstract` method `build` that must be implemented in every of your scenes:

```typescript
build(): void {
  ...
}
```

use it to create some/all of your Scene's Entities either as simple ones:

```typescript
createSimpleEntity({
  tag: 'player',
  position: { x: Screen.width / 2, y: Screen.height / 2 },
  ...
}).addComponents({
  collider: Collider.circle(this.radius, {
    layer: MyCollisionLayer.PLAYER,
  }),
  'other': new MyOtherFancierComponent(
    ...
  )
})
```

Or, as follows...

## 3. Define your first fully-fledged Entity

1. Declare a `class` that `extends` the `abstract class` `Entity`:

```typescript
class MyPlayer extends Entity<MyComponents> {}
```

Note that the `Entity` class is also tied to the Components' index type; 'MyComponents' in this case.

2. Implement the Entity's `abstract` `init` method and set it up as desired:

```typescript
class MyPlayer extends Entity<MyComponents> {
  init(): void {
    this.tag('player')

    this.position.set(Screen.width / 2, Screen.height / 2)

    this.addComponents({
      collider: Collider.circle(this.radius, {
        layer: MyCollisionLayer.PLAYER,
      }),
      'other': new MyOtherFancierComponent(
        ...
      ),
      ...
    })
    ...
  }
}
```

Note that the initialization of this Entity is equivalent to the "simpler" one shown above.

## 4. Define your first System

Systems are meant to add behavior to your game by updating and interconnecting your Entities and their Components.

1. Declare a `class` that `extends` `System`:

```typescript
class MyFirstSystem extends System<MyComponents, MySignals> {}
```

Note that because your Systems will have access to both the `Stage` (i.e., the base `class` of your `Scene`s to manage Entities and Components), and the `Signals.Bus` and `Signals.Emitter` (to connect to and emit Signals), the `System` class must be associated with both your Components' and your Signals' index types.

2. Implement any of the optional methods for your Systems to accomplish their intent:

```typescript
// System optional methods:

// 1. `init`: meant to set up your system by reading Entity/Component data, and to connect to particular Signals, returning an array of `Disconnectable`s:
init?(stage: Stage<MyComponents>, toolkit: System.InitToolkit<MySignals>): Disconnectable[]

// 2. 'fixedUpdate': meant for "fixed" physics-related updates where the `dT` (delta-time) is a constant period of time:
fixedUpdate?(stage: Stage<MyComponents>, toolkit: System.UpdateToolkit<MySignals>, dT: number): void

// 3. `update`: meant for whatever other realtime updates at the current game's FPS, and where the `dT` is adjusted based on internal algorithms to smooth the animation:
update?(stage: Stage<MyComponents>, toolkit: System.UpdateToolkit<MySignals>, dT: number): void
```

For instance,

```typescript
class PickAPointSystem extends System<MyComponents, MySignals> {
  private pickPoint = new Point()

  init?(stage: Stage<MyComponents>, toolkit: System.InitToolkit<MySignals>): Disconnectable[] {
    return [
      toolkit.input.connectContainerEvent('pointerdown', (e) => this.pickPoint.copyFrom(e.global)),
    ]
  }

  update?(stage: Stage<MyComponents>, toolkit: System.UpdateToolkit<MySignals>, dT: number): void {
    const player = stage.getFirstEntityByTag('player')
    if (player) {
      player.position.x += ((this.pickPoint.x - player.position.x) / 5) * dT
      player.position.y += ((this.pickPoint.y - player.position.y) / 5) * dT
    }
  }
}
```

Find much juicier examples of Systems at the [Emerald Chest](https://github.com/xtiandiaz/emerald-chest).

3. Back to your Scene, declare its `constructor` and top up all desired Systems (for this particular Scene) to its base class:

```typescript
class MyFirstScene extends Scene<MyComponents, MySignals> {
  constructor() {
    super([
      new PickAPointSystem()
      ...
    ])
  }
}
```

Thereby, the Systems will be initalized alongside the Scene, by the Game!

## 5. Connecting the dots: declare your Game!

1. Declare a class that `extends` the `abstract` `Game` class:

```typescript
class MyGame extends Game<MyComponents, MySignals, MyGameState> {}
```

Note that the generic `Game` class is tied to both the types of your Components' and Signals' indices, as well as the type of your Game's state.

2. Declare a State `interface` that `extends` `Game.State`:

```typescript
interface MyGameState extends Game.State {}
```

By extending `Game.State`, your Game State incorporates the `isPaused` boolean property, set to pause/unpause the Game whenever needed.

3. Instantiate your State and Game:

```typescript
const state: MyGameState = { isPaused: false }
const game = new MyGame(state)
```

4. Initialize it (as part of an `async` sequence), by passing any of the [options defined by Pixi](https://pixijs.download/release/docs/app.ApplicationOptions.html):

```typescript
await game.init({
  ...
})
```

5. Then, play your first Scene:

```typescript
await game.play(MyFirstScene)
```

Note that we're passing the Scene's type-value, for it to be instantiated by the Game.

## 6. Fire and catch Signals to govern

Last but not least, Signals are meant to interconnect your Systems, Scenes and Game whenever and for whatever needed.

1. Let's connect your game to one of the bundled Signals, the `entity-removed` one. Within the `MyGame` class, implement the optional `connect` method and bind to the Signal:

```typescript
// Within `MyGame`:
connect(signals: Signals.Bus<MySignals>, state: MyGameState): Disconnectable[] {
  return [
    signals.connect('entity-removed', (s) => {
      state.isOver = s.tag == 'player'
    }),
  ]
}
```

2. Add the introduced property `isOver` to your Game State:

```typescript
interface MyGameState extends Game.State {
  isOver: boolean
}

const state: MyGameState = { isPaused: false, isOver: false }
```

3. Figure out a way to remove the "player" Entity, at any of your Systems, to emit the Signal.

4. Add custom Signals to your predefined index; for instance:

```typescript
interface MyFirstSignal extends Signal {
  foo: number
}

interface MySignals extends Signals {
  'my-first': MyFirstSignal
}
```

and emit (or queue) as needed:

```typescript
// From within any System:
update(stage: Stage<C>, toolkit: System.UpdateToolkit<S>, dT: number): void {
  toolkit.signals.emit('my-first', { foo: Math.random() })
}
```

Again, please find more practical examples of these concepts at the [Emerald Chest](https://github.com/xtiandiaz/emerald-chest).

# Closing words... for now

This is an personal, ongoing project, extended and iterated at my own pace, and driven at times by whims. However, please feel free to use and to contribute if you find value in it.
