import * as THREE from 'three'
import type { Horse } from '@/domain'
import { createHorseRig, poseGallop, poseStand, type HorseRig } from './horseModel'
import { addRaceLights, createRenderer } from './lighting'

export type StageView = 'side' | 'track'

const BACKDROP = '#DCE7E4'

/**
 * A single horse on a patch of dirt, for the showroom. `side` is a close
 * three-quarter profile; `track` copies the race camera's angle and scale.
 */
export class HorseStage {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
  private readonly disposables: { dispose(): void }[] = []
  private rig: HorseRig | null = null

  constructor(canvas: HTMLCanvasElement, private readonly view: StageView = 'side') {
    this.renderer = createRenderer(canvas)
    this.scene.background = new THREE.Color(BACKDROP)
    addRaceLights(this.scene)
    const ground = new THREE.Mesh(
      this.keep(new THREE.CircleGeometry(view === 'side' ? 3.2 : 6, 40)),
      this.keep(new THREE.MeshStandardMaterial({ color: '#A97B4F', roughness: 1 })),
    )
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)
  }

  setHorse(horse: Horse): void {
    if (this.rig?.horse.id === horse.id) return
    this.rig?.dispose()
    this.rig = createHorseRig(horse)
    this.scene.add(this.rig.root)
  }

  /** phase = null → standing pose. */
  render(phase: number | null, amplitude = 1): void {
    if (this.rig) {
      if (phase === null) poseStand(this.rig)
      else poseGallop(this.rig, phase, { amplitude })
    }
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), false)
    this.camera.aspect = width / Math.max(1, height)
    if (this.view === 'side') {
      this.camera.fov = 28
      this.camera.position.set(-6.4, 2.6, -2.4)
      this.camera.lookAt(0, 1.15, -0.15)
    } else {
      // Same pitch as the race camera, at the distance of a mid-track runner.
      this.camera.fov = 34
      this.camera.position.set(0, 26 * Math.sin(0.7), 26 * Math.cos(0.7))
      this.camera.lookAt(0, 0.8, 0)
    }
    this.camera.updateProjectionMatrix()
  }

  toDataURL(): string {
    return this.renderer.domElement.toDataURL('image/png')
  }

  dispose(): void {
    this.rig?.dispose()
    this.rig = null
    this.disposables.forEach((d) => d.dispose())
    this.renderer.dispose()
  }

  private keep<T extends { dispose(): void }>(item: T): T {
    this.disposables.push(item)
    return item
  }
}

// ---------------------------------------------------------------- portraits

let portraitStage: HorseStage | null = null
const portraitCache = new Map<string, string>()

/**
 * Static PNG of a horse in mid-stride, drawn with one shared off-screen
 * renderer. The showroom index uses these so twenty thumbnails never open
 * twenty WebGL contexts.
 */
export function horsePortrait(horse: Horse, width = 240, height = 160): string | null {
  const key = `${horse.id}:${horse.color.hex}:${width}x${height}`
  const cached = portraitCache.get(key)
  if (cached) return cached
  try {
    if (!portraitStage) portraitStage = new HorseStage(document.createElement('canvas'), 'side')
    portraitStage.setHorse(horse)
    portraitStage.resize(width, height)
    portraitStage.render(0.62)
    const url = portraitStage.toDataURL()
    portraitCache.set(key, url)
    return url
  } catch {
    return null
  }
}
