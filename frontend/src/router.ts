import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  // The same path as `frontendRoute` in vite.config.ts and the
  // `website_route_rules` entry in sahayog/hooks.py.
  history: createWebHistory('/travel'),
  routes: [
    {
      path: '/',
      name: 'travel-dashboard',
      component: () => import('./pages/Dashboard.vue'),
    },
    {
      path: '/calendar',
      name: 'travel-calendar',
      component: () => import('./pages/TravelCalendar.vue'),
    },
    {
      path: '/requests',
      name: 'travel-requests',
      component: () => import('./pages/TravelRequests.vue'),
    },
    {
      path: '/requests/new',
      name: 'travel-request-new',
      component: () => import('./pages/TravelRequestForm.vue'),
    },
    {
      path: '/requests/:name/edit',
      name: 'travel-request-edit',
      component: () => import('./pages/TravelRequestForm.vue'),
    },
    { path: '/:path(.*)*', component: () => import('./pages/NotFound.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
