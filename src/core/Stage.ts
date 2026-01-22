import { Container, RenderLayer } from 'pixi.js'
import { Entity, SimpleEntity, type EntityComponent, type EntityConstructor } from './'
import { RigidBody, CollisionSensor, Components } from '../components'

export class Stage<Cs extends Components> extends Container {
  readonly _bodies: EntityComponent<RigidBody>[] = []
  readonly _collisionSensors: EntityComponent<CollisionSensor>[] = []

  private nextEntityId = 1
  private id2TagMap = new Map<number, string>()
  private tag2IdsMap = new Map<string, number[]>()
  private id2EntityMap = new Map<number, Entity<Cs>>()
  private type2EntityMap = new Map<string, Entity<Cs>>()
  private id2ComponentsMap = new Map<number, Map<keyof Cs, Cs[keyof Cs]>>()
  private renderLayers = new Map(
    [Stage.Layer.ENTITIES, Stage.Layer.UI, Stage.Layer.DEBUG].map((key) => [
      key,
      new RenderLayer(),
    ]),
  )

  constructor() {
    super()

    this.renderLayers.forEach((rl) => this.addChild(rl))
  }

  getLayer(key: Stage.Layer): RenderLayer {
    return this.renderLayers.get(key)!
  }

  createEntity<T extends Entity<Cs>>(type: EntityConstructor<Cs, T>): T {
    const id = this.nextEntityId++
    const entity = new type(
      id,
      (key) => this.hasComponent(key, id),
      (key) => this.getComponent(key, id),
      (entries) => this.addComponents(id, entries)!,
      (key) => this.removeComponent(key, id),
      (tag) => this.tag(id, tag)!,
      () => this.getEntityTag(id),
    )

    this.id2EntityMap.set(id, entity)
    this.type2EntityMap.set(type.name, entity)
    this.id2ComponentsMap.set(id, new Map())

    entity.init()

    this.getLayer(Stage.Layer.ENTITIES).attach(entity)
    this.addChild(entity)

    return entity
  }

  createSimpleEntity(options?: Partial<SimpleEntity.Options>): SimpleEntity<Cs> {
    const entity = this.createEntity(SimpleEntity<Cs>)

    if (options?.tag) this.tag(entity.id, options.tag)
    if (options?.children) entity.addChild(...options.children)
    if (options?.position) entity.position = options.position
    if (options?.rotation) entity.rotation = options.rotation

    return entity
  }

  hasEntity(id: number): boolean {
    return this.id2ComponentsMap.has(id)
  }

  hasEntitiesByTag(tag: string): boolean {
    return (this.tag2IdsMap.get(tag)?.length ?? 0) > 0
  }

  getEntity<T extends Entity<Cs>>(id: number): T | undefined {
    return this.id2EntityMap.get(id) as T
  }

  getEntityByType<T extends Entity<Cs>>(type: EntityConstructor<Cs, T>): T | undefined {
    return this.type2EntityMap.get(type.name) as T
  }

  getFirstEntityByTag(tag: string): Entity<Cs> | undefined {
    const id = this.tag2IdsMap.get(tag)?.[0]
    if (id) return this.id2EntityMap.get(id)

    return undefined
  }

  getEntitiesByTag(tag: string): Entity<Cs>[] {
    return this.tag2IdsMap.get(tag)?.map((id) => this.id2EntityMap.get(id)!) ?? []
  }

  tag(entityId: number, tag: string): Entity<Cs> | undefined {
    const entity = this.id2EntityMap.get(entityId)
    if (!entity) {
      return
    }
    const prevTag = this.id2TagMap.get(entityId)
    if (prevTag) {
      this.deleteTaggedId(tag, entityId)
    }
    this.id2TagMap.set(entityId, tag)
    if (this.tag2IdsMap.has(tag)) {
      this.tag2IdsMap.get(tag)!.push(entityId)
    } else {
      this.tag2IdsMap.set(tag, [entityId])
    }

    return entity
  }

  getEntityTag(id: number): string | undefined {
    return this.id2TagMap.get(id)
  }

  getTaggedIds(tag: string): number[] | undefined {
    return this.tag2IdsMap.get(tag)
  }

  hasComponent<K extends keyof Cs>(key: K, entityId: number): boolean {
    return this.id2ComponentsMap.get(entityId)?.has(key) ?? false
  }

  getComponent<K extends keyof Cs>(key: K, entityId: number): Cs[K] | undefined {
    return this.id2ComponentsMap.get(entityId)?.get(key) as Cs[K]
  }

  getAllComponents<K extends keyof Cs>(key: K): Cs[K][] {
    const components: Cs[K][] = []
    this.id2ComponentsMap.forEach((cMap) => {
      if (cMap.has(key)) {
        components.push(cMap.get(key)! as Cs[K])
      }
    })
    return components
  }

  addComponents(entityId: number, components: Partial<Cs>): Entity<Cs> | undefined {
    const cMap = this.id2ComponentsMap.get(entityId)!
    if (!cMap) {
      console.error('Undefined entity', entityId)
      return
    }
    const entries = Object.entries(components) as [keyof Cs, Cs[keyof Cs]][]
    for (const entry of entries) {
      this.setComponentEntry(entityId, entry, cMap)
    }

    return this.id2EntityMap.get(entityId)!
  }

  removeComponent<K extends keyof Cs>(key: K, entityId: number): boolean {
    const c2typeMap = this.id2ComponentsMap.get(entityId)
    if (!c2typeMap) {
      console.error('Undefined entity', entityId)
      return false
    }

    const c = c2typeMap.get(key)
    if (c instanceof CollisionSensor) {
      this.deleteCollisionSensorEntry(entityId)
    } else if (c instanceof RigidBody) {
      this.deleteBodyEntry(entityId)
    }

    return c2typeMap.delete(key)
  }

  removeEntity(id: number) {
    const entity = this.id2EntityMap.get(id)
    if (!entity) {
      return
    }
    this.removeChild(entity)
    this.id2EntityMap.delete(id)
    this.id2ComponentsMap.delete(id)

    this.deleteBodyEntry(id)
    this.deleteCollisionSensorEntry(id)

    const tag = this.id2TagMap.get(id)
    if (tag) {
      this.deleteTaggedId(tag, id)
      this.id2TagMap.delete(id)
    }
  }

  private setComponentEntry<K extends keyof Cs>(
    entityId: number,
    entry: [K, Cs[K]],
    map: Map<K, Cs[K]>,
  ): Cs[K] | undefined {
    const [key, component] = entry

    map.set(key, component)

    switch (key) {
      case 'collision-sensor':
        if (component instanceof CollisionSensor) this.resetCollisionSensor(component, entityId)
        break
      case 'rigid-body':
        if (component instanceof RigidBody) this.resetBody(component, entityId)
        break
    }

    return component
  }

  private resetBody(instance: RigidBody, entityId: number) {
    this.deleteBodyEntry(entityId)
    this._bodies.push([entityId, instance])
  }

  private resetCollisionSensor(instance: CollisionSensor, entityId: number) {
    this.deleteCollisionSensorEntry(entityId)
    this._collisionSensors.push([entityId, instance])
  }

  private deleteTaggedId(tag: string, entityId: number) {
    const taggedIds = this.tag2IdsMap.get(tag)!
    const index = taggedIds.findIndex((id) => id == entityId)
    if (index >= 0) {
      taggedIds.splice(index)
    }
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

export namespace Stage {
  export enum Layer {
    ENTITIES = 'entities',
    UI = 'ui',
    DEBUG = 'debug',
  }
}
