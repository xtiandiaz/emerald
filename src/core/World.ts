import {
  Entity,
  SimpleEntity,
  type Component,
  type EntityComponent,
  type SomeComponent,
  type EntityConstructor,
} from './'
import { RigidBody, CollisionSensor } from '../components'
import { Container, RenderLayer } from 'pixi.js'

export class World extends Container {
  readonly _bodies: EntityComponent<RigidBody>[] = []
  readonly _collisionSensors: EntityComponent<CollisionSensor>[] = []

  private nextEntityId = 1
  private tagMap = new Map<number, string>()
  private taggedIds = new Map<string, Set<number>>()
  private idToEntityMap = new Map<number, Entity>()
  private typeToEntityMap = new Map<string, Entity>()
  private entityIdToComponentsMap = new Map<number, Map<string, Component>>()
  private renderLayers = new Map(
    [World.Layer.ENTITIES, World.Layer.UI, World.Layer.DEBUG].map((key) => [
      key,
      new RenderLayer(),
    ]),
  )

  constructor() {
    super()

    this.renderLayers.forEach((rl) => this.addChild(rl))
  }

  getLayer(key: World.Layer): RenderLayer {
    return this.renderLayers.get(key)!
  }

  createEntity<T extends Entity>(type: EntityConstructor<T>): T {
    const id = this.nextEntityId++
    const entity = new type(
      id,
      (type) => this.hasComponent(id, type),
      (type) => this.getComponent(id, type),
      (...components) => this.addComponent(id, ...components),
      (type) => this.removeComponent(id, type),
      (tag) => this.tag(id, tag)!,
      () => this.getEntityTag(id),
    )

    this.idToEntityMap.set(id, entity)
    this.typeToEntityMap.set(type.name, entity)
    this.entityIdToComponentsMap.set(id, new Map())

    entity.init()

    this.getLayer(World.Layer.ENTITIES).attach(entity)
    this.addChild(entity)

    return entity
  }

  createSimpleEntity<T extends Component, U extends T[]>(...components: U): SimpleEntity {
    const entity = this.createEntity(SimpleEntity)
    components.forEach((c) => entity.addComponent(c))
    return entity
  }

  hasEntity(id: number): boolean {
    return this.entityIdToComponentsMap.has(id)
  }

  getEntity<T extends Entity>(id: number): T | undefined {
    return this.idToEntityMap.get(id) as T
  }

  getEntityByType<T extends Entity>(type: EntityConstructor<T>): T | undefined {
    return this.typeToEntityMap.get(type.name) as T
  }

  getEntitiesByTag(tag: string): Entity[] {
    return [...(this.taggedIds.get(tag) ?? [])].map((id) => this.idToEntityMap.get(id)!)
  }

  tag(entityId: number, tag: string): Entity | undefined {
    const entity = this.idToEntityMap.get(entityId)
    if (!entity) {
      return
    }
    const prevTag = this.tagMap.get(entityId)
    if (prevTag) {
      this.taggedIds.get(tag)?.delete(entityId)
    }
    this.tagMap.set(entityId, tag)
    if (this.taggedIds.has(tag)) {
      this.taggedIds.get(tag)!.add(entityId)
    } else {
      this.taggedIds.set(tag, new Set([entityId]))
    }

    return entity
  }

  getEntityTag(id: number): string | undefined {
    return this.tagMap.get(id)
  }

  hasComponent<T extends Component>(entityId: number, type: SomeComponent<T>): boolean {
    return this.entityIdToComponentsMap.get(entityId)?.has(type.name) ?? false
  }

  getComponent<T extends Component>(entityId: number, type: SomeComponent<T>): T | undefined {
    return this.entityIdToComponentsMap.get(entityId)?.get(type.name) as T
  }

  getComponents<T extends Component>(type: SomeComponent<T>): T[] {
    const components: T[] = []
    this.entityIdToComponentsMap.forEach((cMap) => {
      if (cMap.has(type.name)) {
        components.push(cMap.get(type.name)! as T)
      }
    })
    return components
  }

  addComponent<T extends Component, U extends T[]>(
    entityId: number,
    ...components: U
  ): U[0] | undefined {
    const cMap = this.entityIdToComponentsMap.get(entityId)
    if (!cMap) {
      console.error('Undefined entity', entityId)
      return
    }
    for (const c of components) {
      cMap.set(c.constructor.name, c)

      if (c instanceof CollisionSensor) {
        this._collisionSensors.push([entityId, c])
      } else if (c instanceof RigidBody) {
        this._bodies.push([entityId, c])
      }
    }

    return components[0]
  }

  removeComponent<T extends Component>(entityId: number, type: SomeComponent<T>): boolean {
    const c2typeMap = this.entityIdToComponentsMap.get(entityId)
    if (!c2typeMap) {
      console.error('Undefined entity', entityId)
      return false
    }

    const c = c2typeMap.get(type.name)
    if (c instanceof CollisionSensor) {
      this.deleteCollisionSensorEntry(entityId)
    } else if (c instanceof RigidBody) {
      this.deleteBodyEntry(entityId)
    }

    return c2typeMap.delete(type.name)
  }

  removeEntity(id: number) {
    const entity = this.idToEntityMap.get(id)
    if (!entity) {
      return
    }
    this.removeChild(entity)
    this.idToEntityMap.delete(id)
    this.entityIdToComponentsMap.delete(id)

    this.deleteBodyEntry(id)
    this.deleteCollisionSensorEntry(id)

    const tag = this.tagMap.get(id)
    if (tag) {
      this.taggedIds.get(tag)!.delete(id)
      this.tagMap.delete(id)
    }
  }

  clear() {
    this.tagMap.clear()
    this.taggedIds.clear()
    this.entityIdToComponentsMap.clear()

    this._bodies.length = 0
    this._collisionSensors.length = 0

    this.removeChildren()
    this.idToEntityMap.clear()
  }

  private deleteBodyEntry(entityId: number) {
    const bodyIndex = this._bodies.findIndex(([id]) => id == entityId)
    if (bodyIndex >= 0) {
      this._bodies.splice(bodyIndex, 1)
    }
  }

  private deleteCollisionSensorEntry(entityId: number) {
    const collisionSensorIndex = this._collisionSensors.findIndex(([id]) => id == entityId)
    if (collisionSensorIndex >= 0) {
      this._collisionSensors.splice(collisionSensorIndex, 1)
    }
  }
}

export namespace World {
  export enum Layer {
    ENTITIES = 'entities',
    UI = 'ui',
    DEBUG = 'debug',
  }
}
