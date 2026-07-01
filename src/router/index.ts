import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { onboardingGuard } from './guards/onboarding'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginPage.vue'),
    meta: { title: 'Login', layout: 'blank', public: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/dashboard/Dashboard.vue'),
    meta: { title: 'Dashboard' },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/onboarding/OnboardingWizard.vue'),
    meta: { title: 'Setup Wizard', layout: 'blank' },
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('@/views/products/ProductList.vue'),
    meta: { title: 'Products' },
  },

  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/settings/Settings.vue'),
    meta: { title: 'Settings' },
  },
  {
    path: '/settings/onboarding-configuration',
    name: 'onboarding-configuration',
    component: () => import('@/views/settings/OnboardingConfiguration.vue'),
    meta: { title: 'Onboarding Configuration' },
  },
  {
    path: '/settings/onboarding-data',
    name: 'onboarding-data',
    component: () => import('@/views/settings/OnboardingData.vue'),
    meta: { title: 'Onboarding Verileri' },
  },
  {
    // Product Master has a dedicated list page — redirect generic list URL
    path: '/list/Product%20Master',
    redirect: '/products',
  },
  {
    path: '/list/:doctype',
    name: 'doctype-list',
    component: () => import('@/views/doctype/DocTypeList.vue'),
    meta: { title: 'List' },
    props: true,
  },
  {
    path: '/doc/:doctype/:name',
    name: 'doctype-detail',
    component: () => import('@/views/doctype/DocTypeDetail.vue'),
    meta: { title: 'Detail' },
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Onboarding gate guard — blocks dashboard access until onboarding is complete.
// Must run before the title guard since it may redirect.
router.beforeEach(onboardingGuard)

// Title guard — sets the document title based on route meta.
router.beforeEach((to) => {
  let title = to.meta.title as string | undefined

  // Dynamic title for doctype list
  if (to.name === 'doctype-list' && to.params.doctype) {
    title = decodeURIComponent(to.params.doctype as string)
  }
  // Dynamic title for doctype detail
  if (to.name === 'doctype-detail' && to.params.name) {
    title = decodeURIComponent(to.params.name as string)
  }

  document.title = title ? `${title} - PIM` : 'PIM'
})

export default router
