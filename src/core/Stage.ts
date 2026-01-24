import { Container, RenderLayer } from 'pixi.js'
import { Entity, SimpleEntity, type EntityComponent, type EntityConstructor } from './'
import { Collider, Components, RigidBody } from '../components'

export class Stage<Cs extends Components> extends Container {
  readonly _colliders: EntityComponent<Collider>[] = []

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

  getEntity<T extends Entity<Cs>>(id: number): T | undefined {
    return this.id2EntityMap.get(id) as T
  }

  getEntityByType<T extends Entity<Cs>>(type: EntityConstructor<Cs, T>): T | undefined {
    return this.type2EntityMap.get(type.name) as T
  }

  getFirstEntityByTag(tag: string): Entity<Cs> | undefined {
    const id = this.tag2IdsMap.get(tag)?.[0]

    return id ? this.id2EntityMap.get(id) : undefined
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

  getComponents<K extends keyof Cs>(key: K): Cs[K][] {
    const components: Cs[K][] = []
    this.id2ComponentsMap.forEach((cMap) => {
      if (cMap.has(key)) {
        components.push(cMap.get(key)! as Cs[K])
      }
    })
    return components
  }

  addComponents(entityId: number, components: Partial<Cs>): Entity<Cs> | undefined {
    const entity = this.id2EntityMap.get(entityId)
    if (!entity) {
      console.error('Undefined entity', entityId)
      return
    }
    const componentsMap = this.id2ComponentsMap.get(entityId)!
    const entries = Object.entries(components) as [keyof Cs, Cs[keyof Cs]][]
    for (const [key, component] of entries) {
      componentsMap.set(key, component)

      this.onComponentAdded(key, component, entity)
    }

    return this.id2EntityMap.get(entityId)!
  }

  removeComponent<K extends keyof Cs>(key: K, entityId: number): boolean {
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

  removeEntity(id: number) {
    const entity = this.id2EntityMap.get(id)
    if (!entity) {
      return
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

  private onComponentAdded<K extends keyof Cs>(key: K, component: Cs[K], entity: Entity<Cs>) {
    if (component instanceof Collider) {
      this.resetColliderEntry(component, entity.id)

      this.getComponent('rigid-body', entity.id)?.resetAreaProperties(
        component._areaProperties.physics,
      )
    } else if (component instanceof RigidBody) {
      component._transform.setFromMatrix(entity.getGlobalTransform())

      const collider = this.getComponent('collider', entity.id)
      if (collider) {
        component.resetAreaProperties(collider._areaProperties.physics)
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
