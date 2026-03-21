import { watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSystemStore } from '@/stores/system'
import { useLibraryStore } from '@/stores/library'
import { usePageStore } from '@/stores/page'
import { usePublicStore } from '@/stores/public'
import { i18n } from '@/i18n'

export function usePageTitle(customTitle?: { icon?: string; title?: string }) {
  const route = useRoute()
  const systemStore = useSystemStore()
  const libraryStore = useLibraryStore()
  const pageStore = usePageStore()
  const publicStore = usePublicStore()

  const updateTitle = () => {
    const baseTitle = systemStore.siteTitle
    let fullTitle = baseTitle
    
    // 判断当前路由是否是页面详情或库相关路由
    const routeName = String(route.name || '')
    const isPageRoute = routeName === 'Page'
    const isLibraryRoute = routeName === 'Library'
    const isPublicLibraryRoute = routeName === 'PublicLibrary'
    
    console.debug('updateTitle called:', { routeName, meta: route.meta, customTitle })
    
    // 如果提供了自定义标题（用于公开页面等场景）
    if (customTitle && customTitle.title) {
      const prefix = customTitle.icon ? `${customTitle.icon} ` : ''
      fullTitle = `${prefix}${customTitle.title} - ${baseTitle}`
    }
    // 公开页面路由 - 使用库标题
    else if (isPublicLibraryRoute && publicStore.currentLibrary) {
      const { icon, title } = publicStore.currentLibrary
      const prefix = icon ? `${icon} ` : ''
      fullTitle = `${prefix}${title} - ${baseTitle}`
    }
    // 只在页面详情路由时使用当前页面的 emoji 和标题
    else if (isPageRoute && pageStore.currentPage) {
      const { icon, title } = pageStore.currentPage
      const prefix = icon ? `${icon} ` : ''
      fullTitle = `${prefix}${title} - ${baseTitle}`
    } 
    // 只在库相关路由时使用当前库的 emoji 和标题
    else if (isLibraryRoute && libraryStore.currentLibrary) {
      const { icon, title } = libraryStore.currentLibrary
      const prefix = icon ? `${icon} ` : ''
      fullTitle = `${prefix}${title} - ${baseTitle}`
    }
    // 使用路由元信息（i18n key）
    else if (route.meta?.titleKey) {
      const titleKey = route.meta.titleKey as string
      const routeTitle = i18n.global.t(titleKey)
      fullTitle = `${routeTitle} - ${baseTitle}`
    }
    // 使用路由元信息（纯文本）
    else if (route.meta?.title) {
      const routeTitle = route.meta.title as string
      fullTitle = `${routeTitle} - ${baseTitle}`
    } 
    // 或使用路由名称
    else if (route.name) {
      const nameTitle = String(route.name).replace(/([A-Z])/g, ' $1').trim()
      fullTitle = `${nameTitle} - ${baseTitle}`
    }
    
    console.debug('Setting title to:', fullTitle)
    document.title = fullTitle
  }

  // 监听路由变化 - 使用 immediate 立即执行
  watch(() => route.path, () => {
    console.debug('route.path changed:', route.path)
    updateTitle()
  }, { immediate: true })
  
  watch(() => route.name, () => {
    console.debug('route.name changed:', route.name)
    updateTitle()
  })

  // 监听系统配置变化
  watch(() => systemStore.siteTitle, updateTitle)
  watch(() => i18n.global.locale.value, updateTitle)

  // 监听当前页面变化（仅在 Page 路由时有效）
  watch(() => pageStore.currentPage, () => {
    if (String(route.name) === 'Page') {
      updateTitle()
    }
  }, { deep: true })

  // 监听当前库变化（仅在 Library 路由时有效）
  watch(() => libraryStore.currentLibrary, () => {
    if (String(route.name) === 'Library') {
      updateTitle()
    }
  }, { deep: true })

  // 监听公开库变化
  watch(() => publicStore.currentLibrary, () => {
    if (String(route.name) === 'PublicLibrary') {
      updateTitle()
    }
  }, { deep: true })

  // 组件挂载时更新（因为 watch 已经有 immediate，这个可以去掉，但保留也无妨）
  onMounted(() => {
    updateTitle()
  })

  // 返回更新函数，以便手动调用
  return {
    updateTitle
  }
}
