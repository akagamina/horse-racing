import * as THREE from 'three'
import type { Horse } from '@/domain'

/**
 * A stylised low-poly racehorse with jockey, built from primitives at runtime
 * (no external model or licence). Geometry and materials are shared by every
 * horse; each rig only owns its transforms, so twenty horses cost one model.
 * The rig faces −Z with its origin on the ground under the barrel.
 */

const COATS = [
  { name: 'Bay', hex: '#6B3A1F', points: '#1E1410' },
  { name: 'Chestnut', hex: '#9A4E22', points: '#7A3A16' },
  { name: 'Dark bay', hex: '#3E2416', points: '#140D09' },
  { name: 'Grey', hex: '#A9A6A0', points: '#5D5A55' },
] as const

export function coatFor(horse: Horse): (typeof COATS)[number] {
  return COATS[(horse.number * 7) % COATS.length]!
}

// ---------------------------------------------------------------- shared assets

interface SharedAssets {
  geometries: Record<string, THREE.BufferGeometry>
  materials: Map<string, THREE.Material>
  textures: Map<string, THREE.Texture>
}

let shared: SharedAssets | null = null
let users = 0

function geometries(): Record<string, THREE.BufferGeometry> {
  const ellipsoid = new THREE.SphereGeometry(1, 24, 16)
  const upperLeg = new THREE.CylinderGeometry(0.1, 0.065, 0.56, 12)
  upperLeg.translate(0, -0.28, 0)
  const lowerLeg = new THREE.CylinderGeometry(0.055, 0.045, 0.56, 10)
  lowerLeg.translate(0, -0.28, 0)
  const joint = new THREE.SphereGeometry(0.075, 12, 8)
  const sock = new THREE.CylinderGeometry(0.058, 0.06, 0.22, 10)
  sock.translate(0, -0.47, 0)
  const hoof = new THREE.CylinderGeometry(0.065, 0.085, 0.1, 12)
  hoof.translate(0, -0.6, 0)
  const neck = new THREE.CylinderGeometry(0.15, 0.27, 0.95, 16)
  neck.translate(0, 0.42, 0)
  const head = new THREE.CylinderGeometry(0.085, 0.15, 0.66, 14)
  head.translate(0, -0.33, 0)
  const muzzle = new THREE.SphereGeometry(0.1, 14, 10)
  const eye = new THREE.SphereGeometry(0.028, 8, 6)
  const blaze = new THREE.PlaneGeometry(0.06, 0.42)
  const ear = new THREE.ConeGeometry(0.045, 0.16, 8)
  const tail = new THREE.ConeGeometry(0.13, 0.95, 12)
  tail.translate(0, -0.47, 0)
  // Mane: a row of soft tufts along the crest instead of a single slab.
  const tuft = new THREE.SphereGeometry(0.075, 10, 8)
  const cloth = new THREE.BoxGeometry(0.9, 0.42, 0.78)
  const clothNumber = new THREE.PlaneGeometry(0.3, 0.3)
  const torso = new THREE.BoxGeometry(0.34, 0.44, 0.26)
  torso.translate(0, 0.22, 0)
  const helmet = new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  const face = new THREE.SphereGeometry(0.12, 12, 8)
  const boot = new THREE.BoxGeometry(0.1, 0.1, 0.26)
  const limb = new THREE.BoxGeometry(0.1, 0.1, 0.42)
  const thigh = new THREE.BoxGeometry(0.12, 0.12, 0.38)
  const bib = new THREE.PlaneGeometry(0.3, 0.3)
  const shadow = new THREE.CircleGeometry(1, 20)
  return {
    ellipsoid,
    upperLeg,
    lowerLeg,
    joint,
    sock,
    hoof,
    neck,
    head,
    muzzle,
    eye,
    blaze,
    ear,
    tail,
    tuft,
    cloth,
    clothNumber,
    torso,
    helmet,
    face,
    boot,
    limb,
    thigh,
    bib,
    shadow,
  }
}

function acquire(): SharedAssets {
  users += 1
  shared ??= { geometries: geometries(), materials: new Map(), textures: new Map() }
  return shared
}

/** Frees shared geometry, materials and textures when the last user is gone. */
function release(): void {
  users = Math.max(0, users - 1)
  if (users > 0 || !shared) return
  Object.values(shared.geometries).forEach((g) => g.dispose())
  shared.materials.forEach((m) => m.dispose())
  shared.textures.forEach((t) => t.dispose())
  shared = null
}

function material(assets: SharedAssets, key: string, make: () => THREE.Material): THREE.Material {
  let m = assets.materials.get(key)
  if (!m) {
    m = make()
    assets.materials.set(key, m)
  }
  return m
}

function solid(assets: SharedAssets, hex: string, roughness = 0.8): THREE.Material {
  return material(assets, `solid:${hex}:${roughness}`, () => new THREE.MeshStandardMaterial({ color: hex, roughness, metalness: 0 }))
}

/**
 * White markings, fixed per horse so each one is recognisable from race to
 * race: which legs wear socks, and whether the face has a blaze.
 */
export function markingsFor(horse: Horse): { socks: readonly boolean[]; blaze: boolean } {
  const bits = (horse.number * 2654435761) >>> 0
  return { socks: [0, 1, 2, 3].map((i) => ((bits >>> (i * 3)) & 7) < 3), blaze: ((bits >>> 13) & 3) === 0 }
}

/** Saddle-cloth number painted on a canvas: white disc, dark numeral. */
function numberTexture(assets: SharedAssets, horse: Horse): THREE.Texture {
  const key = `number:${horse.number}`
  let texture = assets.textures.get(key)
  if (texture) return texture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#17212B'
    ctx.font = `700 ${horse.number > 9 ? 70 : 84}px "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(horse.number), size / 2, size / 2 + 5)
  }
  texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  assets.textures.set(key, texture)
  return texture
}

// ---------------------------------------------------------------- rig

export interface HorseRig {
  readonly horse: Horse
  readonly root: THREE.Group
  readonly body: THREE.Group
  readonly neck: THREE.Group
  readonly head: THREE.Group
  readonly tail: THREE.Group
  readonly jockey: THREE.Group
  /** [upper, lower] pivots: fore-left, fore-right, hind-left, hind-right. */
  readonly legs: readonly (readonly [THREE.Group, THREE.Group])[]
  /** Fixed per horse so the field is never in step. */
  readonly phaseOffset: number
  dispose(): void
}

const BODY_HEIGHT = 1.34

export function createHorseRig(horse: Horse): HorseRig {
  const assets = acquire()
  const g = assets.geometries
  const coat = coatFor(horse)
  const coatMat = solid(assets, coat.hex, 0.42)
  const pointsMat = solid(assets, coat.points, 0.6)
  const silk = solid(assets, horse.color.hex, 0.38)
  const eyeMat = solid(assets, '#0B0908', 0.2)
  const marks = markingsFor(horse)
  const white = solid(assets, '#F1EFEA', 0.9)
  const skin = solid(assets, '#C98E6B', 0.9)
  const hoofMat = solid(assets, '#1C1917', 0.9)
  const bibMat = material(
    assets,
    `bib:${horse.number}`,
    () => new THREE.MeshBasicMaterial({ map: numberTexture(assets, horse), transparent: true, side: THREE.DoubleSide }),
  )
  const shadowMat = material(
    assets,
    'shadow',
    () => new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }),
  )

  const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material) => new THREE.Mesh(geometry, mat)
  const root = new THREE.Group()
  root.name = `horse-${horse.id}`

  const shadow = mesh(g.shadow!, shadowMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.set(0.62, 1.35, 1)
  shadow.position.y = 0.02
  shadow.renderOrder = 1
  root.add(shadow)

  const body = new THREE.Group()
  body.position.y = BODY_HEIGHT
  root.add(body)

  const barrel = mesh(g.ellipsoid!, coatMat)
  barrel.scale.set(0.4, 0.44, 0.92)
  const chest = mesh(g.ellipsoid!, coatMat)
  chest.scale.set(0.38, 0.46, 0.42)
  chest.position.set(0, 0.06, -0.62)
  const rump = mesh(g.ellipsoid!, coatMat)
  rump.scale.set(0.41, 0.45, 0.46)
  rump.position.set(0, 0.07, 0.58)
  const cloth = mesh(g.cloth!, silk)
  cloth.position.set(0, 0.16, 0.02)
  // Saddle-cloth number on both flanks, like a real race.
  for (const side of [-1, 1]) {
    const n = mesh(g.clothNumber!, bibMat)
    n.position.set(side * 0.452, 0.14, 0.12)
    n.rotation.y = side * (Math.PI / 2)
    body.add(n)
  }
  body.add(barrel, chest, rump, cloth)

  // Neck and head
  const neck = new THREE.Group()
  neck.position.set(0, 0.22, -0.78)
  neck.rotation.x = -0.95
  neck.add(mesh(g.neck!, coatMat))
  for (let i = 0; i < 7; i++) {
    const t = mesh(g.tuft!, pointsMat)
    t.position.set(0, 0.06 + i * 0.13, 0.17 - i * 0.012)
    t.scale.set(0.55, 1.1, 1)
    neck.add(t)
  }
  const head = new THREE.Group()
  head.position.set(0, 0.86, 0)
  head.rotation.x = -1.25
  const skull = mesh(g.head!, coatMat)
  const muzzle = mesh(g.muzzle!, pointsMat)
  muzzle.position.set(0, -0.66, 0.01)
  muzzle.scale.set(0.95, 0.8, 1.05)
  const eyeL = mesh(g.eye!, eyeMat)
  eyeL.position.set(-0.115, -0.1, 0.04)
  const eyeR = eyeL.clone()
  eyeR.position.x = 0.115
  const earL = mesh(g.ear!, coatMat)
  earL.position.set(-0.07, 0.06, 0.05)
  const earR = earL.clone()
  earR.position.x = 0.07
  head.add(skull, muzzle, eyeL, eyeR, earL, earR)
  if (marks.blaze) {
    const blaze = mesh(g.blaze!, white)
    blaze.position.set(0, -0.32, -0.128)
    blaze.rotation.set(-0.11, Math.PI, 0)
    head.add(blaze)
  }
  neck.add(head)
  body.add(neck)

  // Tail
  const tail = new THREE.Group()
  tail.position.set(0, 0.24, 0.98)
  tail.rotation.x = 0.55
  tail.add(mesh(g.tail!, pointsMat))
  body.add(tail)

  // Legs
  const legs: [THREE.Group, THREE.Group][] = []
  const legAt = (x: number, y: number, z: number) => {
    const index = legs.length
    const upper = new THREE.Group()
    upper.position.set(x, y, z)
    upper.add(mesh(g.upperLeg!, coatMat))
    const lower = new THREE.Group()
    lower.position.y = -0.56
    lower.add(mesh(g.joint!, coatMat), mesh(g.lowerLeg!, pointsMat), mesh(g.hoof!, hoofMat))
    if (marks.socks[index]) lower.add(mesh(g.sock!, white))
    upper.add(lower)
    body.add(upper)
    legs.push([upper, lower])
  }
  legAt(-0.2, -0.16, -0.62)
  legAt(0.2, -0.16, -0.62)
  legAt(-0.21, -0.12, 0.62)
  legAt(0.21, -0.12, 0.62)

  // Jockey: crouched over the withers, silks in the horse's colour.
  const jockey = new THREE.Group()
  jockey.position.set(0, 0.42, -0.12)
  const torso = mesh(g.torso!, silk)
  torso.rotation.x = -1.15
  const helmet = mesh(g.helmet!, silk)
  helmet.position.set(0, 0.24, -0.46)
  const face = mesh(g.face!, skin)
  face.position.set(0, 0.2, -0.47)
  const armL = mesh(g.limb!, silk)
  armL.position.set(-0.17, 0.12, -0.42)
  armL.rotation.x = 0.35
  const armR = armL.clone()
  armR.position.x = 0.17
  const thighL = mesh(g.thigh!, white)
  thighL.position.set(-0.24, 0.02, -0.08)
  thighL.rotation.x = -0.5
  const thighR = thighL.clone()
  thighR.position.x = 0.24
  // Number bib on the jockey's back, readable from the camera behind the field.
  const bib = mesh(g.bib!, bibMat)
  bib.position.set(0, 0.22, 0.135)
  torso.add(bib)
  const bootL = mesh(g.boot!, hoofMat)
  bootL.position.set(-0.27, -0.12, 0.08)
  bootL.rotation.x = 0.4
  const bootR = bootL.clone()
  bootR.position.x = 0.27
  jockey.add(torso, helmet, face, armL, armR, thighL, thighR, bootL, bootR)
  body.add(jockey)

  let disposed = false
  return {
    horse,
    root,
    body,
    neck,
    head,
    tail,
    jockey,
    legs,
    phaseOffset: (((horse.number * 0.618) % 1) + 1) % 1,
    dispose() {
      if (disposed) return
      disposed = true
      root.removeFromParent()
      release()
    },
  }
}

// ---------------------------------------------------------------- poses

/** Footfall timing of a rotary gallop: hind-left, hind-right, fore-left, fore-right. */
const FOOTFALL = { foreL: 0.48, foreR: 0.6, hindL: 0.02, hindR: 0.14 } as const
const TAU = Math.PI * 2

export interface PoseOptions {
  /** 1 = full gallop, lower values damp the movement (reduced motion). */
  amplitude: number
}

/** Puts the rig in its gallop pose for `phase` ∈ [0, 1). Pure function of the inputs. */
export function poseGallop(rig: HorseRig, phase: number, { amplitude }: PoseOptions): void {
  const a = amplitude
  const swing = (offset: number) => Math.sin(TAU * (phase - offset))
  const fold = (offset: number) => Math.max(0, Math.sin(TAU * (phase - offset) - 1.1))

  const [foreL, foreR, hindL, hindR] = rig.legs
  const fore = (leg: (typeof rig.legs)[number] | undefined, offset: number) => {
    if (!leg) return
    leg[0].rotation.x = a * 0.85 * swing(offset)
    leg[1].rotation.x = -a * 1.5 * fold(offset)
  }
  const hind = (leg: (typeof rig.legs)[number] | undefined, offset: number) => {
    if (!leg) return
    leg[0].rotation.x = a * 0.7 * swing(offset) - 0.05
    leg[1].rotation.x = a * 1.1 * fold(offset + 0.25)
  }
  fore(foreL, FOOTFALL.foreL)
  fore(foreR, FOOTFALL.foreR)
  hind(hindL, FOOTFALL.hindL)
  hind(hindR, FOOTFALL.hindR)

  // One suspension phase per stride: the body rises, rocks and the neck pumps.
  rig.body.position.y = BODY_HEIGHT + a * 0.12 * Math.sin(TAU * (phase - 0.25))
  rig.body.rotation.x = a * 0.07 * Math.sin(TAU * (phase - 0.05))
  rig.neck.rotation.x = -0.95 + a * 0.16 * Math.sin(TAU * (phase + 0.1))
  rig.head.rotation.x = -1.25 - a * 0.1 * Math.sin(TAU * (phase + 0.1))
  rig.tail.rotation.x = 0.85 + a * 0.18 * Math.sin(TAU * (phase - 0.35))
  rig.jockey.position.y = 0.42 - a * 0.05 * Math.sin(TAU * (phase - 0.25))
}

/** Standing still: square legs, neck relaxed. Used at the gate and after the line. */
export function poseStand(rig: HorseRig): void {
  for (const [upper, lower] of rig.legs) {
    upper.rotation.x = 0
    lower.rotation.x = 0
  }
  rig.body.position.y = BODY_HEIGHT
  rig.body.rotation.x = 0
  rig.neck.rotation.x = -0.55
  rig.head.rotation.x = -1.7
  rig.tail.rotation.x = 0.35
  rig.jockey.position.y = 0.42
}
