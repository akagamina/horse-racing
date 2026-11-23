<script setup lang="ts">
defineProps<{ title: string; hint?: string; kindTitle?: string }>()
</script>

<template>
  <div class="frame">
    <header class="frame__bar">
      <nav class="frame__nav" aria-label="Showroom">
        <RouterLink to="/showroom" data-testid="back-to-showroom">Showroom</RouterLink>
        <span v-if="kindTitle" aria-hidden="true">/</span>
        <span v-if="kindTitle">{{ kindTitle }}</span>
        <RouterLink class="frame__play" to="/">Play the game</RouterLink>
      </nav>
      <h1 class="frame__title" data-testid="showroom-title">{{ title }}</h1>
      <p v-if="hint" class="frame__hint" data-testid="showroom-hint">{{ hint }}</p>
    </header>
    <main id="main" class="frame__body">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.frame { min-height: 100vh; min-height: 100dvh; }
.frame__bar { padding: 1rem 1.25rem 0.75rem; border-bottom: 1px solid var(--line); background: var(--paper); }
.frame__nav { display: flex; gap: 0.5rem; align-items: baseline; font-size: var(--step--1); color: var(--muted); }
.frame__play { margin-left: auto; }
.frame__title { font-size: var(--step-3); margin-top: 0.4rem; }
.frame__hint { margin: 0.35rem 0 0; color: var(--muted); max-width: 70ch; }
.frame__body { padding: 1rem 1.25rem 2rem; }
</style>
