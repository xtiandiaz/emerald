# Emerald

A simple HTML + WebGl **game engine**, written completely in TypeScript, and using [PixiJS](https://github.com/pixijs/pixijs/) for optimal rendering.

The engine abides loosely to the [ECS (Entity–Component–System) architecture](https://en.wikipedia.org/wiki/Entity_component_system), where `Component`s are mostly data, tied to an `Entity` with ID, lying in a `World` object that manages them altogether, and providing the basis of a bunch of `System`s in charge of reading, creating, updating, etc., the components (and entities).

Here are the main incentives which led to adopt some of the core concepts of ECS:

1. [Composition](https://en.wikipedia.org/wiki/Object_composition): to separate and combine reusable logic wrapped as components.
1. [Inversion of control](https://en.wikipedia.org/wiki/Inversion_of_control): to provide the necessary tools (entity and component accessors, a signal bus, and essential methods) for you to take control of your game logic.
1. Performance: to get entities and components (by ID, tag, or `type`) at a O(1) (constant time) complexity amid your game's loop.

But how wasn't the ECS adopted categorically then? Well,

1. Here, `Entity`s are more than IDs. They are objects, extending Pixi's `Container` to facilitate:
   1. _transforming_ them, given the extensive API provided by Pixi to do so by means of properties and/or matrices, and
   2. _skinning_ them, by adding `Sprite`s, `Graphics` or child-containers to display your entities however desired.
2. `Component`s are ideally just a bunch of data. Ideally. But because they also extend a base class (not tied to anything else, though) they might containt some logic too. It's all up to you. However, their inter-communication is restricted and limited to `System`s with full access to relate them.

## Getting Started

1. Create one or more scenes wrapping chunks of your game:

```typescript
class Intro extends Scene {
  systems: System[] = [
    // instantiate custom or bundled Systems (more info. below)
  ]

  constructor() {
    // Set its unique name to switch to it in the game
    super('intro')
  }

  build(world: World) {
    // Add Entitys and Components to the World
  }
}
```

2. Create a game instance with an array of scenes:

```typescript
const game = new Game({ isPaused: false }, [new Scene1()])
```

3. Initialize the game asynchronously (just like a Pixi's Application), by passing a `canvas`, `width` and `height`, `antialiasing`, and other [options](https://pixijs.download/release/docs/app.ApplicationOptions.html) available, as well as the label of your `startScene`:

```typescript
await game.init({
  canvas: document.querySelector<HTMLCanvasElement>('#game')!,
  width: 1280,
  height: 720,
  startScene: 'intro',
})
```

4. Switch to any other scene by its label during runtime:

```typescript
game.switchToScene('combat')
```

The `Game` will de-init the previous scene (if any) and init. the next.

## Systems

Systems read, update, create and command to destroy entities and components at the World. Here's the condensed definition of the base `System` class:

```typescript
export abstract class System {
  init?(world: World, signalBus: SignalBus): void
  fixedUpdate?(world: World, signalBus: SignalBus, dT: number): void
  update?(world: World, signalBus: SignalBus, dT: number): void

  onInput?(signal: Input.Signal<any>, world: World): void
}
```

Extend it for whatever system of your own, and implement any of the optional methods to inititalize (e.g., connect to receive certain signals), update (read, update, create, delete components and/or entities, through the `World`), and to react to input in your game.

### Bundled Systems

There are some general systems, ready to use ones, and particularly related to physics for us to use in any game. These are:

- `PhysicsSystem`
- `CollisionSensorSystem`

More information below at the `Physics` section.

## Scenes

The scenes are simple wrappers for a set of methods to load and build a particular site of your games, and a collection of systems to act on it.

```typescript
export abstract class Scene {
  abstract readonly systems: System[]
  abstract readonly inputMap?: Record<string, Input.Control>
  ...

  async load?(): Promise<void>
  abstract build(world: World): void

  async init(world: World, signalBus: SignalBus, display: Container): Promise<void> {
    await this.load?.()

    this.build(world)
    ...
  }
  ...
}
```

Extend the `Scene` class in your concrete scenes, then

1. define the `systems`, in the desired order, to act on the scene.
2. define an optional `inputMap` to receive action codes from particular input-controls (more info. below).
3. implement the optional methods to `load` (particularly using [Pixi's `Asset`](https://pixijs.download/release/docs/assets.Assets.html)) the content of your scene, implement the method to `build` it (creating entities and adding components in the `World`), and/or override the `init` to further initialize your scenes.

When initialized, your scenes will be in charge of initializing their member `System`s, and the `Game` instance to update them.

## Game

The `Game` class extends [Pixi's `Application`](https://pixijs.download/release/docs/app.Application.html) with all of its fancy features and options. At the overriden `init` method, Emerald's `Game` creates the `World`, a `SignalController` (to queue and emit `Signal`s, and to connect the scenes and systems to get them), and adds the corresponding handlers to the [`Application.ticker`](https://pixijs.download/release/docs/app.Application.html#ticker) in order to call the `update` and `fixedUpdate` methods available at all `System`s of your game.

The `fixedUpdate` methods are exceptionally called at a **fixed time frame**. This is necessary for physics-related updates (more info. below) to produce the expected results regardless of the internal render loop adjustments to produce smoother results.

## World

The world is the main `Container` to create `Entity`s, add them as children (for rendering), and tie `Component`s to them.

Here's a summary of the key method definitions to get (and remove) entities and components from `System`s in the game loop:

```typescript
export class World extends Container {
  ...
  createEntity<T extends Entity>(type: SomeEntity<T>): T
  createSimpleEntity<T extends Component, U extends T[]>(
    ...components: U
  ): SimpleEntity

  hasEntity(id: number): boolean

  getEntity<T extends Entity>(id: number): T | undefined
  getEntitiesByTag(tag: string): Entity[]
  getEntityByType<T extends Entity>(type: SomeEntity<T>): T | undefined

  tag(entityId: number, tag: string): Entity | undefined
  getEntityTag(id: number): string | undefined

  hasComponent<T extends Component>(
    entityId: number,
    type: SomeComponent<T>
  ): boolean

  getComponent<T extends Component>(
    entityId: number,
    type: SomeComponent<T>
  ): T | undefined
  getComponents<T extends Component>(type: SomeComponent<T>): T[]

  addComponent<T extends Component, U extends T[]>(
    entityId: number,
    ...components: U
  ): U[0] | undefined

  removeComponent<T extends Component>(
    entityId: number,
    type: SomeComponent<T>
  ): boolean

  removeEntity(id: number)
  ...
}
```

where

```typescript
type SomeComponent<T extends Component> = new (...args: any) => T
```

and used to convenienty, and type-safely, get a particular type of component at any time, e.g., `world.getEntity(123)?.getComponent(MyComponent)`.

In a similar fashion, we can get entities by the strings they were tagged with, e.g., `world.getEntitiesByTag('enemy')`, or strictly by their class (extending `Entity`), e.g., `world.getEntitiesByType(Enemy)`.

The `World` consists of a all the necessary `Map`s to store and get registered instances in no time.

## Signals

Signals are the same as regular events, just using a different term (similarly to how [Godot](https://github.com/godotengine/godot) does). They may contain any data, and their types are extensions of the abstract `Signal` class for the sake of connecting to them safely by type.

Every `Game` instance contains a `SignalController` instance which implements the following `SignalBus` interface:

```typescript
export interface SignalBus {
  emit<T extends Signal>(signal: T): void
  queue<T extends Signal>(signal: T): void
  connect<T extends Signal>(type: SomeSignal<T>, connector: SignalConnector<T>): Disconnectable
  disconnect<T extends Signal>(type: SomeSignal<T>, connector: SignalConnector<T>): void
}
```

where

```typescript
type SignalConnector<T extends Signal> = (s: T) => void
```

All scenes and systems will get the reference to the game's `SignalBus` in order to queue or emit particular `Signal`s, and/or to connect in order to receive them (and disconnect when no longer needed).

## Physics

The custom `PhysicsEngine`, and the physics-related components, systems and utilities, are perhaps the small but biggest accomplishment in Emerald. These are the features supported so far:

1. [AABB (Axis Aligned Bounding Box)](https://en.wikipedia.org/wiki/Minimum_bounding_box) collisions.
2. More advanced collision detection using the commonly known [SAT (Separating Axis Theorem)](https://en.wikipedia.org/wiki/Hyperplane_separation_theorem), between circles and polygons, in between polygons (and in between circles using basic calculations).
3. Extraction of the collision/contact points using a common clipping approach for the polygon edges involved (if any).
4. Resolution of the collisions using the impulse-based model as thoroughly explained in [this article](https://en.wikipedia.org/wiki/Collision_response#Impulse-based_reaction_model).

This physics simulation covers all of the basic needs for relatively simple games. To use them, add either the `PhysicsSystem` or the `ColliderSensorSystem`, or both, to any of your scenes in order to detect (and resolve) collisions.

### `PhysicsSystem`

The `PhysicsSystem` is in charge of iterating over all the `Body` components registered in the `World`, find possible collisions between them, and resolve the collisions as indicated earlier.

All `Body`s are _rigid_, therefore they will collide and react more or less as expected in real life. We can use any of the following options to configure your `Body`s for specific needs

```typescript
export interface BodyOptions {
  isStatic: boolean
  isKinematic: boolean
  layer: number

  startPosition: PointData
  startRotation: number
  startScale: number

  restitution: number
  friction: Partial<Physics.Friction>

  drag: VectorData
  angularDrag: number
}
```

where

- `isStatic` prevents the `Body` from getting affected by both forces and velocity
- `isKinematic` simply prevents it from being affected by forces (like default gravity), but will respond to the velocity directly applied.
- `restitution` is a normalized value to basically create bouncy effects.
- `friction` may contain a `static` and/or `dynamic` normalized values to produce the effects of such frictions as defined in Coulomb friction model (and described [here](https://en.wikipedia.org/wiki/Collision_response#Impulse-based_friction_model))
- `drag` and `angularDrag` are normalized values to produce the anti-natural slowdown of linear-velocity and angular-velocity respectively, on top of the expected friction effects.

### `CollisionSensorSystem`

The `CollisionSensorSystem` independently handles the mere detection (without physical responses) to possible collisions. This has been commonly modeled as "trigger" bodies in several commercial game engines.

To keep things simpler and to optionally minimize the impact of collision detection for simpler games, this system iterates through all the `CollisionSensor` components registered in the `World`, finds possible collisions (or optionally, only AABB intersections among them), and simply add the 'collided' IDs into the involved `Collider` instances, to be used by other systems in the current game loop (and before getting reset on the next one by this system).

The `Collider` is an interface that both the `Body` and the `CollisionSensor` implement:

```typescript
export interface Collider {
  readonly shape: Collider.Shape
  readonly collidedIds: Set<number>
  layer: number
}
```

Again, the only collider shapes supported for now are either `Circle` or `Polygon` (both convex and concave).

The collider's `layer` is the value to be used as one of the bitwise operands to tell, based on an optional collision-map with which the systems are created, whether the involved colliders can actually collide or not.

```typescript
export namespace Collision {
  ...
  export function canCollide(
    layerA: number,
    layerB: number,
    map?: LayerMap
  ): boolean {
    return !map || (((map.get(layerA) ?? 0) & layerB) | ((map.get(layerB) ?? 0) & layerA)) != 0
  }
  ...
}
```

## Roadmap

More possible features to come whenever there's the time and use cases for them to be implemented.

I'm also open for anyone to contribute if you see value in this engine.

### General

- Pack and distribute as NPM if desired

### Collision

### Physics

- Implement ray casts (to early detect contacts)
- Explore the generation of tile-map collider(s) and how to handle collisions within
- Add more information about the collisions stated per-loop at the `Collider` instances (for whatever needed).

### Input

- Write some docummentation
- Connect to bluetooth devices (if possible) to tie actions to their controls

### Camera

- Add interface to zoom and pan on world by means of a 'camera' object
- Add a system to focus the (main) camera on a target entity or at a specific location

### Tile-map

- Explore the implementation of a basic tile-map, its models and systems

### Editor

- Assess the implementation of a polygon collider editor
- Assess the implementation of a tile-map editor

### Debug

### Examples

- Simple platformer using keyboard controls
- Simple top-down view exploration game, within a grid, using pointer controls
