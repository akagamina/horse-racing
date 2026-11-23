import * as THREE from 'three'

/** Late-afternoon light shared by the track and the showroom stages. */
export function addRaceLights(scene: THREE.Scene): THREE.DirectionalLight {
  scene.add(new THREE.HemisphereLight('#E8F2FF', '#6E5B3F', 1.35))
  const sun = new THREE.DirectionalLight('#FFF1DC', 2.1)
  sun.position.set(-18, 34, 14)
  scene.add(sun)
  return sun
}

export function createRenderer(canvas: HTMLCanvasElement, maxPixelRatio = 2): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  return renderer
}
