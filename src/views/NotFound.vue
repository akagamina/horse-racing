<template>
  <main id="main" class="nf">
    <h1>Nothing at this address</h1>
    <p>
      The page may have moved. Go back to <RouterLink to="/">the race</RouterLink> or <RouterLink to="/showroom">the showroom</RouterLink>.
    </p>
  </main>
</template>

<style scoped>
.nf {
  max-width: 40rem;
  margin: 15vh auto;
  padding: 0 1.25rem;
}
.nf h1 {
  font-size: var(--step-3);
  margin-bottom: 0.5rem;
}
</style>
