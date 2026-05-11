import { Container, Point, RenderLayer } from 'pixi.js'
import { Component, ContainerComponent, Entity } from '.'
import { Camera, Collider, ComponentMap } from './components'

export class World<C extends ComponentMap> extends Container {
  // readonly _colliders: EntityComponent<Collider>[] = []
  private nextEntityId = 1
  private entities = new Map<number, Entity>()
  private tags = new Map<string, Set<number>>()

  private renderLayers = new Map(
    [World.Layer.ENTITIES, World.Layer.UI, World.Layer.DEBUG].map((key) => [
      key,
      new RenderLayer(),
    ]),
  )
  private currentCameraEntityId?: number

  constructor() {
    super()

    this.renderLayers.forEach((rl) => this.addChild(rl))
  }

  // get currentCamera(): EntityComponent<Camera> | undefined {
  //   if (this.currentCameraEntityId && this.hasComponent('camera', this.currentCameraEntityId)) {
  //     return {
  //       entityId: this.currentCameraEntityId,
  //       component: this.getComponent('camera', this.currentCameraEntityId)!,
  //     }
  //   }
  //   return undefined
  // }

  getLayer(key: World.Layer): RenderLayer {
    return this.renderLayers.get(key)!
  }

  setCurrentCamera(entityId: number) {
    // if (this.id2ComponentsMap.has(entityId) && this.id2ComponentsMap.get(entityId)!.has('camera')) {
    //   this.currentCameraEntityId = entityId
    // } else {
    //   console.warn(`Undefined Camera for entity-id ${entityId}`)
    // }
  }

  createEntity(tag?: string): number {
    const id = this.nextEntityId++

    this.entities.set(id, {
      id,
      tag,
      components: new Map<string, Component>(),
    })

    if (tag) {
      this.tag(id, tag)
    }

    // this.getLayer(Stage.Layer.ENTITIES).attach(entity)
    // this.addChild(entity)

    return id
  }

  hasEntity(id: number): boolean {
    return this.entities.has(id)
  }

  removeEntity(id: number): boolean {
    const e = this.entities.get(id)
    if (!e) {
      return false
    }
    for (const [, c] of e.components) {
      if (c instanceof Container) {
        this.removeChild(c)
      }
    }
    if (e.tag) {
      this.tags.get(e.tag)?.delete(e.id)
    }

    // this.deleteColliderEntry(id)

    return this.entities.delete(id)
    // this.signals?.emit('entity-removed', { removedId: id, tag })
  }

  tag(entityId: number, tag: string) {
    const e = this.entities.get(entityId)
    if (!e) {
      return
    }
    const prevTag = e.tag
    if (prevTag) {
      this.tags.get(prevTag)?.delete(e.id)
    }
    if (!this.tags.has(tag)) {
      this.tags.set(tag, new Set<number>())
    }
    this.tags.get(tag)!.add(e.id)
  }

  // hasEntityByTag(tag: string): boolean {
  //   return (this.tags.get(tag)?.size ?? 0) > 0
  // }

  getTag(entityId: number): string | undefined {
    return this.entities.values().find((e) => e.id === entityId)?.tag
  }

  getTaggedEntities(tag: string): number[] {
    return [...(this.tags.get(tag) ?? [])]
  }

  addComponent(entityId: number, ...components: (Component | ContainerComponent)[]) {
    const e = this.entities.get(entityId)
    if (!e) {
      console.error('Undefined entity', entityId)
      return
    }
    for (const c of components) {
      e.components.set(c.key, c)

      if (c instanceof Container) {
        this.addChild(c)
      }
    }
  }

  hasComponent(key: string, entityId: number): boolean {
    return this.entities.get(entityId)?.components.has(key) ?? false
  }

  getComponent<T extends Component>(key: string, entityId: number): T | undefined {
    return this.entities.get(entityId)?.components.get(key) as T
  }

  removeComponent(key: string, entityId: number): boolean {
    const e = this.entities.get(entityId)
    if (!e) {
      console.error('Undefined entity', entityId)
      return false
    }
    const c = e.components.get(key)
    if (c instanceof Container) {
      this.removeChild(c)
    }

    // const c = e.components.get(key)
    // if (c instanceof Collider) {
    //   this.deleteColliderEntry(entityId)
    // }

    return e.components.delete(key)
  }

  clear() {
    this.entities.clear()
    this.tags.clear()
  }

  // private resetColliderEntry(instance: Collider, entityId: number) {
  //   this.deleteColliderEntry(entityId)
  //   this._colliders.push({ entityId, component: instance })
  // }

  // private deleteColliderEntry(entityId: number) {
  //   const colliderIndex = this._colliders.findIndex(({ entityId: id }) => id == entityId)
  //   if (colliderIndex >= 0) {
  //     this._colliders.splice(colliderIndex, 1)
  //   }
  // }

  // private onComponentAdded<K extends keyof C>(_: K, component: C[K], entity: Entity<C>) {
  // if (component instanceof Collider) {
  //   this.resetColliderEntry(component, entity.id)
  //   this.getComponent('rigid-body', entity.id)?.resetAreaProperties(component._physicsProperties)
  // } else if (component instanceof RigidBody) {
  //   component._transform.setFromMatrix(entity.getGlobalTransform())
  //   const collider = this.getComponent('collider', entity.id)
  //   if (collider) {
  //     component.resetAreaProperties(collider._physicsProperties)
  //   }
  // }
  // }
}

export namespace World {
  export enum Layer {
    ENTITIES = 'entities',
    UI = 'ui',
    DEBUG = 'debug',
  }
}
