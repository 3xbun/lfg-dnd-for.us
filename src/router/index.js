import { createRouter, createWebHistory } from 'vue-router'
import { me } from '../api/lfg.js'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomePage.vue'),
  },
  {
    path: '/lfg/create',
    name: 'LfgCreate',
    component: () => import('../views/LfgCreatePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/lfg/:id/edit',
    name: 'LfgEdit',
    component: () => import('../views/LfgCreatePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/lfg/:id',
    name: 'LfgDetail',
    component: () => import('../views/LfgDetailPage.vue'),
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('../views/AuthCallback.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * UX guard only — NOT a security boundary. The page shell is public; the real
 * gate is on the data functions (/api/listings POST returns 401 without a
 * session). Ask the server instead of trusting localStorage.
 */
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const user = await me()
  return user ? true : { name: 'Home' }
})

export default router
