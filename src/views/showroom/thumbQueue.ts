/**
 * Runs heavy thumbnail work one item per task, so the showroom index paints
 * its title and links at once and the previews fill in behind it. Without
 * this, 23 previews (WebGL portraits and six-round fixture runs) were drawn
 * in a single block and froze the page for several seconds.
 */
const tasks: (() => void)[] = []
let scheduled = false

function pump(): void {
  scheduled = false
  tasks.shift()?.()
  if (tasks.length) schedule()
}

function schedule(): void {
  if (scheduled) return
  scheduled = true
  setTimeout(pump, 0)
}

export function enqueueThumb(task: () => void): void {
  tasks.push(task)
  schedule()
}
