import { createRouter, createWebHashHistory } from 'vue-router'
import GameView from '@/views/GameView.vue'

/**
 * Hash history: every showroom URL opens directly and survives a refresh on
 * GitHub Pages, which has no server-side rewrites.
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'game', component: GameView, meta: { title: 'Horse Racing' } },
    { path: '/showroom', name: 'showroom', component: () => import('@/views/showroom/ShowroomIndex.vue'), meta: { title: 'Showroom' } },
    {
      path: '/showroom/:kind/:slug',
      name: 'showroom-detail',
      component: () => import('@/views/showroom/ShowroomDetail.vue'),
      props: true,
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = to.meta.title
  if (typeof title === 'string') document.title = title === 'Horse Racing' ? title : `${title} · Horse Racing`
})
