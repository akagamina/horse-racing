export function roundTitle(number: number, distance: number): string {
  return `Round ${number} · ${distance} m`
}

/** Simulated race time as m:ss.s */
export function raceTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds - minutes * 60
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`
}
