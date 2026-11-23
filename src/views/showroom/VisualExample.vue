<script setup lang="ts">
import { computed } from 'vue'
import HorseCanvas from '@/components/HorseCanvas.vue'
import HorseBadge from '@/components/HorseBadge.vue'
import HtmlTrack from '@/components/HtmlTrack.vue'
import { useGallopClock } from '@/composables/useGallopClock'
import { createFixtureStore } from '@/showroom/fixtures'
import { FIXTURE_HORSES } from '@/showroom/manifest'
import { horsePortrait } from '@/three/horseStage'

const props = defineProps<{ slug: string }>()
const clock = useGallopClock()
const featured = FIXTURE_HORSES[2]!
const running = props.slug === 'html-track' ? createFixtureStore('running') : null
const lineup = computed(() =>
  props.slug === 'silks-lineup' ? FIXTURE_HORSES.map((horse) => ({ horse, src: horsePortrait(horse, 360, 225) })) : [],
)
const poses = [0, 0.25, 0.5, 0.75]
</script>

<template>
  <div v-if="slug === 'galloping-horse'" class="gallop">
    <div class="gallop__toolbar">
      <button type="button" class="btn" data-testid="gallop-toggle" @click="clock.playing.value ? clock.pause() : clock.play()">
        {{ clock.playing.value ? 'Pause' : 'Play' }}
      </button>
      <label class="scrub">
        <span>Stride phase</span>
        <input
          type="range"
          min="0"
          max="0.99"
          step="0.01"
          :value="clock.phase.value"
          data-testid="gallop-scrub"
          @input="clock.seek(Number(($event.target as HTMLInputElement).value))"
        />
        <output>{{ clock.phase.value.toFixed(2) }}</output>
      </label>
      <span class="poses">
        Jump to
        <button v-for="p in poses" :key="p" type="button" class="btn btn--small" @click="clock.seek(p)">{{ p.toFixed(2) }}</button>
      </span>
    </div>
    <div class="gallop__views">
      <figure>
        <div class="stage stage--large">
          <HorseCanvas :horse="featured" :phase="clock.phase.value" view="side" :label="`${featured.name} galloping, close-up`" />
        </div>
        <figcaption>Close-up, same light as the track.</figcaption>
      </figure>
      <figure>
        <div class="stage stage--track">
          <HorseCanvas :horse="featured" :phase="clock.phase.value" view="track" :label="`${featured.name} at race camera scale`" />
        </div>
        <figcaption>Race camera angle and scale.</figcaption>
      </figure>
    </div>
  </div>

  <ul v-else-if="slug === 'silks-lineup'" class="lineup" data-testid="silks-lineup">
    <li v-for="item in lineup" :key="item.horse.id">
      <img
        v-if="item.src"
        :src="item.src"
        :alt="`${item.horse.name} in ${item.horse.color.name} silks, number ${item.horse.number}`"
        width="360"
        height="225"
      />
      <span class="lineup__name"><HorseBadge :horse="item.horse" /> {{ item.horse.color.name }}</span>
    </li>
  </ul>

  <div v-else-if="slug === 'html-track' && running?.currentRound" class="html-track-frame" data-testid="html-track-visual">
    <HtmlTrack :round="running.currentRound" :horses-by-id="running.horsesById" :positions="running.positions" />
  </div>
</template>

<style scoped>
.gallop__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}
.scrub {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
}
.scrub output {
  font-variant-numeric: tabular-nums;
  width: 2.5rem;
}
.poses {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  color: var(--muted);
  font-size: var(--step--1);
}
.btn--small {
  min-height: 36px;
  padding: 0.3rem 0.55rem;
  font-size: var(--step-0);
}
.gallop__views {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
figure {
  margin: 0;
}
figcaption {
  color: var(--muted);
  font-size: var(--step--1);
  margin-top: 0.4rem;
}
.stage--large {
  height: 420px;
}
.stage--track {
  height: 420px;
}
.lineup {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
}
.lineup img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 6px;
  background: #dce7e4;
}
.lineup__name {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  margin-top: 0.3rem;
  font-size: var(--step--1);
}
.html-track-frame {
  position: relative;
  height: 560px;
  max-width: 30rem;
  border-radius: var(--radius-m);
  overflow: hidden;
}
</style>
