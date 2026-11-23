/**
 * Optional URL parameters, read once at start-up:
 *   ?seed=1234      repeatable horses, program and race (handy for demos and tests)
 *   ?track=html     use the lightweight HTML track instead of WebGL
 * Hash routes come after them: /horse-racing/?seed=7#/
 */
export interface SessionOptions {
  seed: number | undefined
  forceHtmlTrack: boolean
}

export function readSessionOptions(search: string = window.location.search): SessionOptions {
  const params = new URLSearchParams(search)
  const raw = params.get('seed')
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10)
  return {
    seed: Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined,
    forceHtmlTrack: params.get('track') === 'html',
  }
}
