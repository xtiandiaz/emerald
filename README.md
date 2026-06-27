# Emerald

A simple **WebGL 2D Game Framework** built on top of [PixiJS](https://github.com/pixijs/pixijs/) for optimal rendering, and written completely in TypeScript.

## Features

- Basic 2D Collision detection
- Basic, custom 2D Physics with bearable performance
- Internal communication system, via `Signal`s
- Simple `Camera` component for targeting and zooming on game entities
- Simple Grid component for tile-mapping
- Modular architecture combining some traits from ECS (Entity-Component-System) and from regular composition

## Examples

WIP, including:

- An imitation of all of [Elevate app](https://themindcompany.com/apps/elevate)'s math/arithmetic games: Arivate.
- A puzzle game combining crossword, sudoku and sokoban mechanics.

## Getting Started

1. Add the package to your project: `npm i emerald-pixi`
2. Add TypeScript as dev. dependency: `npm i -D typescript`

Then,

### 1. Create a Scene

```typescript
class MyFirstScene extends Scene<MySignals> {
  async init() {
    ...
  }
}
```

Note that your Scenes will extend the `abstract Scene` class which is tied to your game's `Signal`s. Your Signals are a bunch of objects you'll send and connect to, which are compiled into a type that extends Emerald's `SignalMap`, e.g.,

```typescript
export interface MySignals extends SignalMap {
  'player-pos': {
    pos: PointData
  }
}
```

The `SignalMap` contains embedded Signals such as `entity-added`, `entity-removed` and `screen-resized` to connect to whenever needed.

### 2. Create a System

Systems are the hubs of interaction between your game's Entities and Components. They're were all the logic and fun is meant to be tied together.

All your systems must extend the `abstract` `System` class which is also tied to your Signals:

```typescript
class MyFirstSystem extends System<MySignals> {
  init() {
    ...
  }
}
```

Up next, initialize your System by creating a first Entity. The Entities are merely IDs, numbers, used to identify and interrelate Components. With an Entity at hand, you can then add any Component which is whatever `Object` containing data to bring to life your Entity, for instance:

```typescript
private playerId!: number

init() {
  this.playerId = this.createEntity()
  this.addComponent(
    this.playerId,
    new Graphics().circle(0, 0, 100).fill({ color: 0xffffff })
  )
}
```

This will create and add a white circle `Graphics` identified by `playerId`. You can keep on adding Components with the same Entity ID, or create another likewise.

Last but not least, in order to engage your Systems they must be added to any Scene, e.g.,

```typescript
class MyFirstScene extends Scene<MySignals> {
  async init() {
    this.createSystem(MyFirstSystem)
    ...
  }
}
```

Furthermore, at your Systems implement the optional `Update` method to play with your Entities and Components at the current frame rate. Here, for example, you move the player and send the custom Signal to notify others of its position:

```typescript
update(dt: number): void {
  const playerTransform = this.getComponent(Transform, this.playerId)!

  this.signaler.emit('player-pos', {
    pos: playerTransform.position,
  })
```

And connect to that Signal either from another System or from an Scene, as:

```typescript
this.signaler.connect('player-pos', (s) => {
  console.log(`Player pos: ${s.pos}`)
})
```

### 3. Connect the dots: declare your Game!

Your Game can be either an instance of the `Game` class or from a subclass of it. `Game` is an extension of PIXI's `Application` using its `Ticker` and `Renderer` to get whatever Scene in the loop and on screen.

Simply create the game, initialize it, and then pass the type value of any of your Scenes to bring it to life:

```typescript
const game = new Game({ isPaused: false })
await game.init({
  /* options... */
})

game.createScene(MyFirstScene, {
  /* options... */
})
```

## Closing words... for now

This is an personal, ongoing project, extended and iterated at my own pace, and driven at times by whims. However, please feel free to use and to contribute if you also find value in it.

I also use this framework in combination with [Vue](https://vuejs.org/), and [Pinia](https://pinia.vuejs.org/), to facilitate state management and internal rooting of the game / gamified-app.
