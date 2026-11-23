import { onBeforeUnmount, ref, type Ref } from 'vue'

export function useReducedMotion(): Ref<boolean> {
  const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  const reduced = ref(query?.matches ?? false)
  const update = (event: MediaQueryListEvent) => (reduced.value = event.matches)
  query?.addEventListener?.('change', update)
  onBeforeUnmount(() => query?.removeEventListener?.('change', update))
  return reduced
}
