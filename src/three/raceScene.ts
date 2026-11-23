import * as THREE from 'three'
import type { Horse } from '@/domain'
import { createHorseRig, poseGallop, poseStand, type HorseRig } from './horseModel'
import { addRaceLights, createRenderer } from './lighting'
import { FINISH_Z, gallopPhase, horseZ, LANE_COUNT, LANE_WIDTH, laneX, noseZ, START_Z, TRACK_WIDTH } from './trackLayout'

export interface FieldEntry {
  readonly horse: Horse
  readonly lane: number
}

export interface SceneFrame {
  readonly distance: number
  /** Metres covered per horse id. */
  readonly positions: ReadonlyMap<string, number>
  /** False before the start: horses stand at the line. */
  readonly started: boolean
  readonly reducedMotion: boolean
}

export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

export interface TrackOverlay {
  /** Screen position of each lane at the start line, index 0 = lane 1. */
  readonly lanes: readonly ScreenPoint[]
  readonly finishLeft: ScreenPoint
  readonly finishRight: ScreenPoint
}

/** Camera elevation above the horizon, in radians (about 40°, a grandstand view). */
export const CAMERA_PITCH = 0.7

const SKY = '#BFD9E2'
const TURF = '#3F7A45'
const DIRT = '#A97B4F'

/**
 * One canvas, one fixed perspective camera behind the start: the field runs
 * up the screen toward the finish. The scene draws whatever the race clock
 * says; it keeps no time of its own, so the same frame always renders the same image.
 */
export class RaceScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.5, 400)
  private readonly rigs = new Map<string, HorseRig>()
  private readonly poles = new THREE.Group()
  private readonly disposables: { dispose(): void }[] = []
  private field: readonly FieldEntry[] = []
  private poleDistance = 0
  private width = 1
  private height = 1

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas)
    this.scene.background = new THREE.Color(SKY)
    this.scene.fog = new THREE.Fog(SKY, 80, 190)
    addRaceLights(this.scene)
    this.buildTrack()
    this.scene.add(this.poles)
  }

  /** Replaces the runners. Rigs of horses that stay in the field are reused. */
  setField(field: readonly FieldEntry[]): void {
    this.field = field
    const keep = new Set(field.map((entry) => entry.horse.id))
    for (const [id, rig] of this.rigs) {
      if (!keep.has(id)) {
        rig.dispose()
        this.rigs.delete(id)
      }
    }
    for (const entry of field) {
      let rig = this.rigs.get(entry.horse.id)
      if (!rig) {
        rig = createHorseRig(entry.horse)
        this.rigs.set(entry.horse.id, rig)
        this.scene.add(rig.root)
      }
      rig.root.position.x = laneX(entry.lane)
    }
  }

  render(frame: SceneFrame): void {
    if (frame.distance !== this.poleDistance) this.placePoles(frame.distance)
    const amplitude = frame.reducedMotion ? 0.25 : 1
    for (const entry of this.field) {
      const rig = this.rigs.get(entry.horse.id)
      if (!rig) continue
      const metres = frame.positions.get(entry.horse.id) ?? 0
      const progress = frame.distance > 0 ? metres / frame.distance : 0
      rig.root.position.z = horseZ(progress)
      if (!frame.started || progress >= 1) poseStand(rig)
      else poseGallop(rig, gallopPhase(metres, rig.phaseOffset), { amplitude })
    }
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, Math.round(width))
    this.height = Math.max(1, Math.round(height))
    this.renderer.setSize(this.width, this.height, false)
    this.camera.aspect = this.width / this.height
    this.fitCamera()
  }

  /** Where to draw HTML labels so they line up with the 3D lanes. */
  overlay(): TrackOverlay {
    const lanes = Array.from({ length: LANE_COUNT }, (_, i) => this.toScreen(laneX(i + 1), 0, noseZ(0) + 1.1))
    const edge = TRACK_WIDTH / 2
    return {
      lanes,
      finishLeft: this.toScreen(-edge, 0, FINISH_Z),
      finishRight: this.toScreen(edge, 0, FINISH_Z),
    }
  }

  dispose(): void {
    for (const rig of this.rigs.values()) rig.dispose()
    this.rigs.clear()
    this.disposables.forEach((d) => d.dispose())
    this.renderer.dispose()
  }

  // -------------------------------------------------------------- camera

  /**
   * Keeps the camera angle fixed and moves it back until the whole straight,
   * rail to rail and start to finish, fits the canvas. Works for portrait
   * phones and landscape desktops alike.
   */
  private fitCamera(): void {
    const target = new THREE.Vector3(0, 0, (START_Z + FINISH_Z) / 2 + 1)
    const direction = new THREE.Vector3(0, Math.sin(CAMERA_PITCH), Math.cos(CAMERA_PITCH)).normalize()
    const margin = 1.4
    const corners = [
      new THREE.Vector3(-TRACK_WIDTH / 2 - margin, 0, START_Z + 3.2),
      new THREE.Vector3(TRACK_WIDTH / 2 + margin, 0, START_Z + 3.2),
      new THREE.Vector3(-TRACK_WIDTH / 2 - margin, 2.6, FINISH_Z - 2),
      new THREE.Vector3(TRACK_WIDTH / 2 + margin, 2.6, FINISH_Z - 2),
    ]
    const fits = (distance: number) => {
      this.camera.position.copy(target).addScaledVector(direction, distance)
      this.camera.lookAt(target)
      this.camera.updateMatrixWorld()
      this.camera.updateProjectionMatrix()
      return corners.every((corner) => {
        const p = corner.clone().project(this.camera)
        return Math.abs(p.x) <= 0.98 && Math.abs(p.y) <= 0.97 && p.z < 1
      })
    }
    let low = 10
    let high = 400
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2
      if (fits(mid)) high = mid
      else low = mid
    }
    fits(high)
  }

  private toScreen(x: number, y: number, z: number): ScreenPoint {
    const p = new THREE.Vector3(x, y, z).project(this.camera)
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height }
  }

  // -------------------------------------------------------------- track

  private track<T extends { dispose(): void }>(item: T): T {
    this.disposables.push(item)
    return item
  }

  private plane(width: number, depth: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(this.track(new THREE.PlaneGeometry(width, depth)), material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, y, z)
    this.scene.add(mesh)
    return mesh
  }

  private buildTrack(): void {
    const length = START_Z - FINISH_Z
    const near = START_Z + 14
    const far = FINISH_Z - 40
    const centerZ = (near + far) / 2
    const span = near - far

    const turf = this.track(new THREE.MeshStandardMaterial({ color: TURF, roughness: 1, map: this.track(noiseTexture(0.07, 6)) }))
    this.plane(160, 260, turf, 0, -0.02, centerZ)

    const dirtTexture = this.track(dirtTextureFor(span))
    const dirt = this.track(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, map: dirtTexture }))
    this.plane(TRACK_WIDTH + 1.6, span, dirt, 0, 0, centerZ)

    // Faint lane guides raked into the dirt.
    const guide = this.track(new THREE.MeshBasicMaterial({ color: '#E9DCC7', transparent: true, opacity: 0.35, depthWrite: false }))
    for (let i = 1; i < LANE_COUNT; i++) {
      this.plane(0.06, length + 6, guide, laneX(i) + LANE_WIDTH / 2, 0.01, (START_Z + FINISH_Z) / 2)
    }

    const chalk = this.track(new THREE.MeshBasicMaterial({ color: '#FBFAF6' }))
    this.plane(TRACK_WIDTH + 1.6, 0.22, chalk, 0, 0.012, START_Z)
    this.plane(TRACK_WIDTH + 1.6, 0.42, chalk, 0, 0.012, FINISH_Z)

    this.buildRails(near, far)
    this.buildGate()
    this.buildFinishPosts()
  }

  private buildRails(near: number, far: number): void {
    const white = this.track(new THREE.MeshStandardMaterial({ color: '#F7F6F1', roughness: 0.5 }))
    const postGeometry = this.track(new THREE.BoxGeometry(0.12, 1.1, 0.12))
    const railGeometry = this.track(new THREE.BoxGeometry(0.14, 0.12, near - far))
    for (const side of [-1, 1]) {
      const x = side * (TRACK_WIDTH / 2 + 0.95)
      const rail = new THREE.Mesh(railGeometry, white)
      rail.position.set(x, 1.05, (near + far) / 2)
      this.scene.add(rail)
      const posts = new THREE.InstancedMesh(postGeometry, white, Math.ceil((near - far) / 3))
      const m = new THREE.Matrix4()
      for (let i = 0; i < posts.count; i++) {
        m.makeTranslation(x, 0.55, near - i * 3)
        posts.setMatrixAt(i, m)
      }
      this.scene.add(posts)
    }
  }

  /** A simple starting stall frame behind the line. */
  private buildGate(): void {
    const green = this.track(new THREE.MeshStandardMaterial({ color: '#2D5B3A', roughness: 0.6 }))
    const z = START_Z + 3.3
    const beam = new THREE.Mesh(this.track(new THREE.BoxGeometry(TRACK_WIDTH + 0.6, 0.22, 0.5)), green)
    beam.position.set(0, 2.5, z)
    this.scene.add(beam)
    const postGeometry = this.track(new THREE.BoxGeometry(0.12, 2.5, 0.5))
    for (let i = 0; i <= LANE_COUNT; i++) {
      const post = new THREE.Mesh(postGeometry, green)
      post.position.set(laneX(i + 1) - LANE_WIDTH / 2, 1.25, z)
      this.scene.add(post)
    }
  }

  private buildFinishPosts(): void {
    const red = this.track(new THREE.MeshStandardMaterial({ color: '#C8102E', roughness: 0.5 }))
    const postGeometry = this.track(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 10))
    const discGeometry = this.track(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 20))
    for (const side of [-1, 1]) {
      const x = side * (TRACK_WIDTH / 2 + 1.5)
      const post = new THREE.Mesh(postGeometry, red)
      post.position.set(x, 1.7, FINISH_Z)
      const disc = new THREE.Mesh(discGeometry, red)
      disc.rotation.z = Math.PI / 2
      disc.position.set(x, 3.5, FINISH_Z)
      this.scene.add(post, disc)
    }
  }

  /** Red-and-white distance poles every 200 m before the finish, like a real straight. */
  private placePoles(distance: number): void {
    this.poleDistance = distance
    this.poles.clear()
    if (distance <= 0) return
    const shared = (this.poles.userData.shared ??= {
      geometry: this.track(new THREE.CylinderGeometry(0.09, 0.09, 1.9, 8)),
      material: this.track(new THREE.MeshStandardMaterial({ color: '#D7263D', roughness: 0.5 })),
    }) as { geometry: THREE.BufferGeometry; material: THREE.Material }
    for (let metres = 200; metres < distance; metres += 200) {
      const z = noseZ(1 - metres / distance)
      const pole = new THREE.Mesh(shared.geometry, shared.material)
      pole.position.set(-(TRACK_WIDTH / 2 + 1.5), 0.95, z)
      this.poles.add(pole)
    }
  }
}

// ---------------------------------------------------------------- textures

/** Deterministic speckle so screenshots are stable between runs. */
function noiseTexture(strength: number, repeat: number): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, size, size)
    let s = 7
    for (let i = 0; i < 2200; i++) {
      s = (s * 16807) % 2147483647
      const x = s % size
      s = (s * 16807) % 2147483647
      const y = s % size
      ctx.fillStyle = `rgba(0,0,0,${strength * ((s % 100) / 100)})`
      ctx.fillRect(x, y, 2, 2)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat * 1.6)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Harrowed dirt: warm base with fine lengthwise furrows and grit. */
function dirtTextureFor(span: number): THREE.CanvasTexture {
  const w = 256
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = DIRT
    ctx.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? 'rgba(255,240,220,0.08)' : 'rgba(60,35,15,0.08)'
      ctx.fillRect(x, 0, 2, h)
    }
    let s = 11
    for (let i = 0; i < 3000; i++) {
      s = (s * 48271) % 2147483647
      const x = s % w
      s = (s * 48271) % 2147483647
      const y = s % h
      ctx.fillStyle = s % 3 === 0 ? 'rgba(255,235,205,0.18)' : 'rgba(55,30,12,0.16)'
      ctx.fillRect(x, y, 1.5, 1.5)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, span / 12)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
