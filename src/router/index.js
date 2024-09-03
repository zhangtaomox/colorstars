import { createRouter, createWebHistory } from 'vue-router'
import StarredRepos from '../components/StarredRepos.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: StarredRepos,
    },
  ],
})

export default router
