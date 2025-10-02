import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/salat-time/'),
  routes: [
    {
      path: '/',
      name: 'home',
      // Lazy load HomeView for better performance
      component: () => import('../views/HomeView.vue')
    }
  ]
})

export default router