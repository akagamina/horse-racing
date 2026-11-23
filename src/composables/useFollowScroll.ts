import { nextTick, onMounted, watch, type Ref } from 'vue'

/**
 * Keeps a scrollable panel on the item that matters right now. `target`
 * returns the element to show (or null); the panel jumps there on mount and
 * glides there whenever `trigger` changes. Only the panel scrolls, never the
 * page, so a phone user reading another section is not pulled away.
 */
export function useFollowScroll(
  container: Ref<HTMLElement | null>,
  target: (container: HTMLElement) => Element | null,
  trigger: () => unknown,
): void {
  const follow = (smooth: boolean) => {
    const box = container.value
    const item = box && target(box)
    if (!box || !item) return
    const top = item.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    const calm = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (typeof box.scrollTo === 'function') box.scrollTo({ top, behavior: smooth && !calm ? 'smooth' : 'auto' })
    else box.scrollTop = top
  }

  onMounted(() => follow(false))
  watch(trigger, () => void nextTick(() => follow(true)))
}
