import { Container, RenderLayer } from 'pixi.js'
import { Entity, SimpleEntity, type EntityComponent, type EntityConstructor } from './'
import { RigidBody, CollisionSensor, Components } from '../components'

export class Stage<Cs extends Components> extends Container {
  readonly _bodies: EntityComponent<RigidBody>[] = []
  readonly _collisionSensors: EntityComponent<CollisionSensor>[] = []

  private nextEntityId = 1
  private tagMap = new Map<number, string>()
  private taggedIds = new Map<string, number[]>()
  private idToEntityMap = new Map<number, Entity<Cs>>()
  private typeToEntityMap = new Map<string, Entity<Cs>>()
  private entityIdToComponentsMap = new Map<number, Map<keyof Cs, Cs[keyof Cs]>>()
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
      (entry0, entry1, entry2, entry3, entry4) =>
        this.addComponent(id, entry0, entry1, entry2, entry3, entry4)!,
      (key) => this.removeComponent(key, id),
      (tag) => this.tag(id, tag)!,
      () => this.getEntityTag(id),
    )

    this.idToEntityMap.set(id, entity)
    this.typeToEntityMap.set(type.name, entity)
    this.entityIdToComponentsMap.set(id, new Map())

    entity.init()

    this.getLayer(Stage.Layer.ENTITIES).attach(entity)
    this.addChild(entity)

    return entity
  }

  createSimpleEntity(options?: Partial<SimpleEntity.Options>): SimpleEntity<Cs> {
    const entity = this.createEntity(SimpleEntity<Cs>)

    if (options?.children) entity.addChild(...options.children)
    if (options?.position) entity.position = options.position
    if (options?.tag) this.tag(entity.id, options.tag)

    return entity
  }

  hasEntity(id: number): boolean {
    return this.entityIdToComponentsMap.has(id)
  }

  getEntity<T extends Entity<Cs>>(id: number): T | undefined {
    return this.idToEntityMap.get(id) as T
  }

  getEntityByType<T extends Entity<Cs>>(type: EntityConstructor<Cs, T>): T | undefined {
    return this.typeToEntityMap.get(type.name) as T
  }

  getFirstEntityByTag(tag: string): Entity<Cs> | undefined {
    const id = this.taggedIds.get(tag)?.[0]
    if (id) {
      return this.idToEntityMap.get(id)
    }
    return undefined
  }

  getTaggedIds(tag: string): number[] | undefined {
    return this.taggedIds.get(tag)
  }

  getEntitiesByTag(tag: string): Entity<Cs>[] {
    return this.taggedIds.get(tag)?.map((id) => this.idToEntityMap.get(id)!) ?? []
  }

  tag(entityId: number, tag: string): Entity<Cs> | undefined {
    const entity = this.idToEntityMap.get(entityId)
    if (!entity) {
      return
    }
    const prevTag = this.tagMap.get(entityId)
    if (prevTag) {
      this.deleteTaggedId(tag, entityId)
    }
    this.tagMap.set(entityId, tag)
    if (this.taggedIds.has(tag)) {
      this.taggedIds.get(tag)!.push(entityId)
    } else {
      this.taggedIds.set(tag, [entityId])
    }

    return entity
  }

  getEntityTag(id: number): string | undefined {
    return this.tagMap.get(id)
  }

  hasComponent<K extends keyof Cs>(key: K, entityId: number): boolean {
    return this.entityIdToComponentsMap.get(entityId)?.has(key) ?? false
  }

  getComponent<K extends keyof Cs>(key: K, entityId: number): Cs[K] | undefined {
    return this.entityIdToComponentsMap.get(entityId)?.get(key) as Cs[K]
  }

  getAllComponents<K extends keyof Cs>(key: K): Cs[K][] {
    const components: Cs[K][] = []
    this.entityIdToComponentsMap.forEach((cMap) => {
      if (cMap.has(key)) {
        components.push(cMap.get(key)! as Cs[K])
      }
    })
    return components
  }

  addComponent<
    K0 extends keyof Cs,
    K1 extends keyof Cs,
    K2 extends keyof Cs,
    K3 extends keyof Cs,
    K4 extends keyof Cs,
  >(
    entityId: number,
    entry0: [K0, Cs[K0]],
    entry1?: [K1, Cs[K1]],
    entry2?: [K2, Cs[K2]],
    entry3?: [K3, Cs[K3]],
    entry4?: [K4, Cs[K4]],
  ): Cs[K0] | undefined {
    const cMap = this.entityIdToComponentsMap.get(entityId)!
    if (!cMap) {
      console.error('Undefined entity', entityId)
      return
    }
    this.setComponentEntry(entityId, entry0, cMap)
    if (entry1) this.setComponentEntry(entityId, entry1, cMap)
    if (entry2) this.setComponentEntry(entityId, entry2, cMap)
    if (entry3) this.setComponentEntry(entityId, entry3, cMap)
    if (entry4) this.setComponentEntry(entityId, entry4, cMap)

    return entry0[1]
  }

  removeComponent<K extends keyof Cs>(key: K, entityId: number): boolean {
    const c2typeMap = this.entityIdToComponentsMap.get(entityId)
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
      this.deleteTaggedId(tag, id)
      this.tagMap.delete(id)
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
    const taggedIds = this.taggedIds.get(tag)!
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
