import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { systemApi } from '@/api/system'

// Route definitions
const routes: RouteRecordRaw[] = [
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/Setup.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/forget-password',
    name: 'ForgetPassword',
    component: () => import('@/views/ForgetPassword.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/home'
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue')
      },
      {
        path: 'library/:id?',
        name: 'Library',
        component: () => import('@/views/page/PageContent.vue')
      },
      {
        path: 'page/:id',
        name: 'Page',
        component: () => import('@/views/page/PageContent.vue')
      }
    ]
  },
  {
    path: '/settings',
    component: () => import('@/views/settings/SettingsLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: 'profile'
      },
      {
        path: 'profile',
        name: 'SettingsProfile',
        component: () => import('@/views/settings/ProfileSettings.vue'),
        meta: { titleKey: 'settings.profile' }
      },
      {
        path: 'security',
        name: 'SettingsSecurity',
        component: () => import('@/views/settings/SecuritySettings.vue'),
        meta: { titleKey: 'settings.security' }
      },
      {
        path: 'libraries',
        name: 'SettingsLibraries',
        component: () => import('@/views/settings/LibrarySettings.vue'),
        meta: { titleKey: 'settings.libraries' }
      },
      {
        path: 'pages',
        name: 'SettingsPages',
        component: () => import('@/views/settings/PageSettings.vue'),
        meta: { titleKey: 'settings.pages' }
      },
      {
        path: 'groups',
        name: 'SettingsGroups',
        component: () => import('@/views/settings/GroupSettings.vue'),
        meta: { titleKey: 'settings.groups' }
      },
      {
        path: 'teams',
        name: 'SettingsTeams',
        component: () => import('@/views/settings/TeamSettings.vue'),
        meta: { titleKey: 'settings.teams' }
      },
      {
        path: 'archived',
        name: 'SettingsArchived',
        component: () => import('@/views/settings/ArchivedSettings.vue'),
        meta: { titleKey: 'settings.archived' }
      },
      {
        path: 'assets',
        name: 'SettingsAssets',
        component: () => import('@/views/settings/ImageResources.vue'),
        meta: { titleKey: 'settings.assets' }
      },
      {
        path: 'templates',
        name: 'SettingsTemplates',
        component: () => import('@/views/settings/TemplateSettings.vue'),
        meta: { titleKey: 'settings.templates' }
      },
      {
        path: 'site-info',
        name: 'SettingsSiteInfo',
        component: () => import('@/views/settings/SiteInfoSettings.vue'),
        meta: { titleKey: 'settings.siteInfo' }
      },
      {
        path: 'smtp',
        name: 'SettingsSmtp',
        component: () => import('@/views/settings/SmtpSettings.vue'),
        meta: { titleKey: 'settings.smtp' }
      },
      {
        path: 'access',
        name: 'SettingsAccess',
        component: () => import('@/views/settings/AccessSettings.vue'),
        meta: { titleKey: 'settings.access' }
      },
      {
        path: 'users',
        name: 'SettingsUsers',
        component: () => import('@/views/settings/UserManagement.vue'),
        meta: { titleKey: 'settings.users' }
      }
    ]
  },
  {
    path: '/public/users/:name',
    name: 'PublicUserProfile',
    component: () => import('@/views/public/PublicUserProfile.vue')
  },
  {
    path: '/public',
    component: () => import('@/layouts/PublicLayout.vue'),
    children: [
      {
        path: 'pages/:slug',
        name: 'PublicPage',
        component: () => import('@/views/public/PublicPage.vue')
      },
      {
        path: 'libraries/:slug',
        name: 'PublicLibrary',
        component: () => import('@/views/public/PublicPage.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()
  const isSetupRoute = to.name === 'Setup'
  
  // Check if authentication is required
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)

  // Enforce first-run setup flow
  try {
    const setupStatusRes = await systemApi.getSetupStatus()
    const needsSetup = !!setupStatusRes.data?.needsSetup

    if (needsSetup) {
      if (!isSetupRoute) {
        next({ name: 'Setup', query: { redirect: to.fullPath } })
        return
      }

      // Setup route should always be accessible when initialization is required.
      next()
      return
    }

    if (isSetupRoute) {
      next(userStore.isAuthenticated ? { name: 'Home' } : { name: 'Login' })
      return
    }
  } catch (error) {
    // Fail open to avoid blocking all navigation when setup status API is temporarily unavailable
    console.error('Failed to check setup status:', error)
  }
  
  // If user is authenticated
  if (userStore.isAuthenticated) {
    // Only fetch profile for routes that require auth
    // Skip profile fetch for public routes to avoid unnecessary 401 redirects
    if (requiresAuth && !userStore.user) {
      const result = await userStore.fetchProfile()
      if (!result.success) {
        // Token invalid, redirect to login
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }
    
    // If trying to access guest-only pages, redirect to home
    if (requiresGuest) {
      next({ name: 'Home' })
      return
    }
    
    next()
    return
  }
  
  // If user is not authenticated
  if (requiresAuth) {
    // Redirect to login with return URL
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }
  
  next()
})

export default router
