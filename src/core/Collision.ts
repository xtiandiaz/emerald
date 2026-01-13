import { Point, type PointData } from 'pixi.js'
import {
  isNearlyEqual,
  Collider,
  type EntityComponent,
  type Range,
  type Vector,
  type VectorData,
  average,
} from '../core'
import { Body } from '../components'
import { Geometry } from './Geometry'
import { ExtraMath } from '../extras'

export namespace Collision {
  export type LayerMap = Map<number, number>

  export type AABB = {
    min: PointData
    max: PointData
  }

  type EntityBody = EntityComponent<Body>

  export type AABBIntersectionBodyPair = [A: EntityBody, B: EntityBody]

  export interface ProjectionOverlap {
    depth: number
    normal: Vector
  }

  export interface ContactPointTracking {
    cp1: Point
    cp1_minDistSqrd: number
    cp2?: Point
    validCount: 1 | 2
  }

  export interface ContactPoint {
    point: Point
    depth: number
  }

  export interface Contact extends ProjectionOverlap {
    points?: ContactPoint[]
  }

  export interface Instance extends Contact {
    A: Body
    B: Body
  }

  export function isAABBIntersection(a: AABB, b: AABB): boolean {
    return !(a.max.x < b.min.x || a.max.y < b.min.y || b.max.x < a.min.x || b.max.y < a.min.y)
  }

  export function hasProjectionOverlap(a: Range, b: Range): boolean {
    return !(a.max <= b.min || b.max <= a.min)
  }

  export function canCollide(layerA: number, layerB: number, map?: LayerMap): boolean {
    return !map || (((map.get(layerA) ?? 0) & layerB) | ((map.get(layerB) ?? 0) & layerA)) != 0
  }

  export function getVertexIndexWithMaxProjection(vertices: Point[], axis: VectorData): number {
    let maxProjection = -Infinity
    let index = -1

    for (let i = 0; i < vertices.length; i++) {
      const proj = vertices[i]!.dot(axis)
      if (proj > maxProjection) {
        maxProjection = proj
        index = i
      }
    }
    return index
  }

  export function getClosestVertexIndexToPoint(vertices: Point[], p: PointData): number {
    let index = -1
    let distSqrd = Infinity
    for (let i = 0; i < vertices.length; i++) {
      const dSq = vertices[i]!.subtract(p).magnitudeSquared()
      if (dSq < distSqrd) {
        distSqrd = dSq
        index = i
      }
    }
    return index
  }

  export function getProjectionRange(vertices: Point[], axis: VectorData): Range {
    const range: Range = { min: Infinity, max: -Infinity }
    let proj: number

    for (let i = 0; i < vertices.length; i++) {
      proj = vertices[i]!.dot(axis)
      range.min = Math.min(range.min, proj)
      range.max = Math.max(range.max, proj)
    }
    return range
  }

  export function getCircleProjectionRange(
    position: PointData,
    radius: number,
    axis: Vector,
  ): Range {
    const dot = axis.x * position.x + axis.y * position.y
    const projs: [number, number] = [dot - radius, dot + radius]

    return projs[0] < projs[1] ? { min: projs[0], max: projs[1] } : { min: projs[1], max: projs[0] }
  }

  export function getEdgeAcrossNormal(vertices: Point[], normal: VectorData): Geometry.Segment {
    const vi = getVertexIndexWithMaxProjection(vertices, normal)
    const v = vertices[vi]!
    const prev_v = vertices[(vi == 0 ? vertices.length : vi) - 1]!
    const next_v = vertices[(vi + 1) % vertices.length]!
    // Prev. and next order are assumed clockwise,
    // albeit the vertices of the segments are set in a linear order, 'a' to 'b',
    // which at the vertices order is counter-clockwise
    const prevEdge = new Geometry.Segment(v, prev_v)
    const nextEdge = new Geometry.Segment(next_v, v)
    // We want the most perpendicular edge to the normal, thus that with the smaller projection
    return Math.abs(prevEdge.vector.dot(normal)) <= Math.abs(nextEdge.vector.dot(normal))
      ? prevEdge
      : nextEdge
  }

  export function findContactPointsOnPolygon(
    origin: Point,
    vertices: Point[],
    ref_tracking?: ContactPointTracking,
  ): ContactPointTracking {
    if (!ref_tracking) {
      ref_tracking = { cp1: new Point(), cp1_minDistSqrd: Infinity, validCount: 1 }
    }
    const cp = new Point()
    const segment = new Geometry.Segment()

    for (let i = 0; i < vertices.length; i++) {
      segment.a = vertices[i]!
      segment.b = vertices[(i + 1) % vertices.length]!
      segment.getClosestPoint(origin, cp)
      const distSqrd = origin.subtract(cp).magnitudeSquared()
      if (
        ref_tracking.cp2 &&
        isNearlyEqual(distSqrd, ref_tracking.cp1_minDistSqrd) &&
        !ref_tracking.cp1.isNearlyEqual(cp)
      ) {
        ref_tracking.cp2.set(cp.x, cp.y)
        ref_tracking.validCount = 2
      } else if (distSqrd < ref_tracking.cp1_minDistSqrd) {
        ref_tracking.cp1.set(cp.x, cp.y)
        ref_tracking.cp1_minDistSqrd = distSqrd
        ref_tracking.validCount = 1
      }
    }
    return ref_tracking
  }

  export function evaluateProjectionOverlap(
    projA: Range,
    projB: Range,
    axis: VectorData,
    ref_projOverlap: ProjectionOverlap,
  ): boolean {
    if (!Collision.hasProjectionOverlap(projA, projB)) {
      return false
    }
    const depth = Math.min(projA.max - projB.min, projB.max - projA.min)
    if (depth < ref_projOverlap.depth) {
      ref_projOverlap.depth = depth
      ref_projOverlap.normal.set(axis.x, axis.y)
    }
    return true
  }

  export function correctContactDirectionIfNeeded(
    A: Collider.Shape,
    B: Collider.Shape,
    contact: Contact,
  ) {
    if (B.center.subtract(A.center).dot(contact.normal) < 0) {
      contact.normal.multiplyScalar(-1, contact.normal)
    }
  }

  export function findContactIfCanCollide(
    A: Collider,
    B: Collider,
    canCollide: (layerA: number, layerB: number) => boolean,
    includePoints: boolean,
  ): Contact | undefined {
    if (!canCollide(A.layer, B.layer) || !A.shape.hasAABBIntersection(B.shape)) {
      return
    }
    return A.shape.findContact(B.shape, includePoints)
  }

  export function findContactPoints(
    verticesA: Point[],
    verticesB: Point[],
    contact: Contact,
  ): Point[] {
    const tracking: ContactPointTracking = {
      cp1: new Point(),
      cp1_minDistSqrd: Infinity,
      cp2: new Point(),
      validCount: 1,
    }
    for (let i = 0; i < verticesA.length; i++) {
      findContactPointsOnPolygon(verticesA[i]!, verticesB, tracking)
    }
    for (let i = 0; i < verticesB.length; i++) {
      findContactPointsOnPolygon(verticesB[i]!, verticesA, tracking)
    }

    findContactPointsViaClipping(verticesA, verticesB, contact)

    return tracking.validCount == 2 ? [tracking.cp1, tracking.cp2!] : [tracking.cp1]
  }

  export function findContactPointsViaClipping(
    verticesA: Point[],
    verticesB: Point[],
    out_contact: Contact,
  ): ContactPoint[] | undefined {
    const edgeA = getEdgeAcrossNormal(verticesA, out_contact.normal)
    const edgeB = getEdgeAcrossNormal(verticesB, out_contact.normal.multiplyScalar(-1))
    const contactN = out_contact.normal
    // Reference and incident edges; ref. is the most perpendicular to the contact's Normal,
    // and thus used to clip the incident's edge vertices to get the contact points
    // Source: https://dyn4j.org/2011/11/contact-points-using-clipping/
    let refEdge: Geometry.Segment, incEdge: Geometry.Segment
    let shouldFlip = false
    if (Math.abs(edgeA.vector.dot(contactN)) < Math.abs(edgeB.vector.dot(contactN))) {
      refEdge = edgeA
      incEdge = edgeB
    } else {
      refEdge = edgeB
      incEdge = edgeA
      shouldFlip = true
    }
    // Normalize refEdge to use as axis
    const axis = refEdge.vector.normalize()
    incEdge.projectAndClipByMargin(axis, axis.dot(refEdge.a))

    axis.multiplyScalar(-1, axis)
    incEdge.projectAndClipByMargin(axis, axis.dot(refEdge.b))

    const cps: ContactPoint[] = []
    const refN = axis.crossScalar(-1)
    const aRefProj = refN.dot(refEdge.a)
    let depth = aRefProj - refN.dot(incEdge.a)
    if (depth >= 0) {
      cps.push({ point: incEdge.a, depth: depth })
    }
    depth = aRefProj - refN.dot(incEdge.b)
    if (depth >= 0) {
      cps.push({ point: incEdge.b, depth: depth })
    }

    out_contact.depth = ExtraMath.average(...cps.map((cp) => cp.depth))

    return cps
  }
}
