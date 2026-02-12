import type { Component } from '../core'
import type { Camera } from './Camera'
import type { Collider } from './Collider'
import type { RayCast } from './RayCast'
import type { RigidBody } from './RigidBody'

type _Components = {
  [key: string]: Component
}

export interface Components extends _Components {
  camera: Camera
  collider: Collider
  'ray-cast': RayCast
  'rigid-body': RigidBody
}
