<script setup lang="ts">
function skipToMain(): void {
  const main = document.getElementById('main')
  if (!main) return
  main.setAttribute('tabindex', '-1')
  main.focus()
}
</script>

<template>
  <!-- A button, not href="#main": the hash belongs to the router. -->
  <button type="button" class="skip-link" @click="skipToMain">Skip to the race</button>
  <RouterView />
</template>
