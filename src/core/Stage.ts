import { Container, Rectangle, RenderLayer } from 'pixi.js'
import { Entity, SimpleEntity, type EntityComponent, type EntityConstructor } from './'
import { Collider, type Components, RigidBody } from '../components'

export class Stage<C extends Components> extends Container {
  readonly _colliders: EntityComponent<Collider>[] = []

  private nextEntityId = 1
  private id2TagMap = new Map<number, string>()
  private tag2IdsMap = new Map<string, number[]>()
  private id2EntityMap = new Map<number, Entity<C>>()
  private type2IdsMap = new Map<string, number[]>()
  private id2ComponentsMap = new Map<number, Map<keyof C, C[keyof C]>>()
  private renderLayers = new Map(
    [Stage.Layer.ENTITIES, Stage.Layer.UI, Stage.Layer.DEBUG].map((key) => [
      key,
      new RenderLayer(),
    ]),
  )
  private _mainCameraId?: number

  constructor() {
    super()

    this.renderLayers.forEach((rl) => this.addChild(rl))
  }

  deinit() {
    this._colliders.length = 0
    this.id2EntityMap.clear()
    this.type2IdsMap.clear()
    this.id2ComponentsMap.clear()

    this.destroy({ children: true, texture: true, textureSource: true })
  }

  getLayer(key: Stage.Layer): RenderLayer {
    return this.renderLayers.get(key)!
  }

  createEntity<T extends Entity<C>>(type: EntityConstructor<C, T>): T {
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
    this.id2ComponentsMap.set(id, new Map())

    if (!this.type2IdsMap.has(type.name)) {
      this.type2IdsMap.set(type.name, [])
    }
    this.type2IdsMap.get(type.name)!.push(id)

    entity.init()

    this.getLayer(Stage.Layer.ENTITIES).attach(entity)
    this.addChild(entity)

    return entity
  }

  createSimpleEntity(options?: Partial<SimpleEntity.Options>): SimpleEntity<C> {
    const entity = this.createEntity(SimpleEntity<C>)

    if (options?.tag) this.tag(entity.id, options.tag)
    if (options?.position) entity.position = options.position
    if (options?.rotation) entity.rotation = options.rotation
    if (options?.scale)
      typeof options.scale == 'number'
        ? entity.scale.set(options.scale)
        : entity.scale.copyFrom(options.scale)
    if (options?.children) entity.addChild(...options.children)

    options?.onInit?.(entity)

    return entity
  }

  hasEntity(id: number): boolean {
    return this.id2ComponentsMap.has(id)
  }

  hasEntitiesByTag(tag: string): boolean {
    return (this.tag2IdsMap.get(tag)?.length ?? 0) > 0
  }

  getEntity<T extends Entity<C>>(id: number): T | undefined {
    return this.id2EntityMap.get(id) as T
  }

  getEntitiesByType<T extends Entity<C>>(type: EntityConstructor<C, T>): T[] {
    return this.type2IdsMap.get(type.name)?.map((id) => this.id2EntityMap.get(id)! as T) ?? []
  }

  getFirstEntityByType<T extends Entity<C>>(type: EntityConstructor<C, T>): T | undefined {
    const id = this.type2IdsMap.get(type.name)?.[0]

    return id ? (this.id2EntityMap.get(id) as T) : undefined
  }

  getEntitiesByTag(tag: string): Entity<C>[] {
    return this.tag2IdsMap.get(tag)?.map((id) => this.id2EntityMap.get(id)!) ?? []
  }

  getFirstEntityByTag(tag: string): Entity<C> | undefined {
    const id = this.tag2IdsMap.get(tag)?.[0]

    return id ? this.id2EntityMap.get(id) : undefined
  }

  tag(entityId: number, tag: string): Entity<C> | undefined {
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

  hasComponent<K extends keyof C>(key: K, entityId: number): boolean {
    return this.id2ComponentsMap.get(entityId)?.has(key) ?? false
  }

  getComponent<K extends keyof C>(key: K, entityId: number): C[K] | undefined {
    return this.id2ComponentsMap.get(entityId)?.get(key) as C[K]
  }

  getEntityComponents<K extends keyof C>(key: K): EntityComponent<C[K]>[] {
    const eCs: EntityComponent<C[K]>[] = []

    this.id2ComponentsMap.forEach((cMap, entityId) => {
      if (cMap.has(key)) {
        eCs.push([entityId, cMap.get(key)! as C[K]])
      }
    })

    return eCs
  }

  addComponents(entityId: number, components: Partial<C>): Entity<C> | undefined {
    const entity = this.id2EntityMap.get(entityId)
    if (!entity) {
      console.error('Undefined entity', entityId)
      return
    }
    const componentsMap = this.id2ComponentsMap.get(entityId)!
    const entries = Object.entries(components) as [keyof C, C[keyof C]][]
    for (const [key, component] of entries) {
      componentsMap.set(key, component)

      this.onComponentAdded(key, component, entity)
    }

    return this.id2EntityMap.get(entityId)!
  }

  removeComponent<K extends keyof C>(key: K, entityId: number): boolean {
    const c2typeMap = this.id2ComponentsMap.get(entityId)
    if (!c2typeMap) {
      console.error('Undefined entity', entityId)
      return false
    }

    const component = c2typeMap.get(key)
    if (component instanceof Collider) {
      this.deleteColliderEntry(entityId)
    }

    return c2typeMap.delete(key)
  }

  removeEntity(id: number): boolean {
    const entity = this.id2EntityMap.get(id)
    if (!entity) {
      return false
    }
    this.removeChild(entity)
    this.id2EntityMap.delete(id)
    this.id2ComponentsMap.delete(id)

    this.deleteColliderEntry(id)

    const tag = this.id2TagMap.get(id)
    if (tag) {
      this.deleteTaggedId(tag, id)
      this.id2TagMap.delete(id)
    }

    return true
  }

  private deleteTaggedId(tag: string, entityId: number) {
    const taggedIds = this.tag2IdsMap.get(tag)!
    const index = taggedIds.findIndex((id) => id == entityId)
    if (index >= 0) {
      taggedIds.splice(index)
    }
  }

  private resetColliderEntry(instance: Collider, entityId: number) {
    this.deleteColliderEntry(entityId)
    this._colliders.push([entityId, instance])
  }

  private deleteColliderEntry(entityId: number) {
    const colliderIndex = this._colliders.findIndex(([id]) => id == entityId)
    if (colliderIndex >= 0) {
      this._colliders.splice(colliderIndex, 1)
    }
  }

  private onComponentAdded<K extends keyof C>(key: K, component: C[K], entity: Entity<C>) {
    if (component instanceof Collider) {
      this.resetColliderEntry(component, entity.id)

      this.getComponent('rigid-body', entity.id)?.resetAreaProperties(component._physicsProperties)
    } else if (component instanceof RigidBody) {
      component._transform.setFromMatrix(entity.getGlobalTransform())

      const collider = this.getComponent('collider', entity.id)
      if (collider) {
        component.resetAreaProperties(collider._physicsProperties)
      }
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
