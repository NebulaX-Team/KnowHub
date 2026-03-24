import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pageApi } from '@/api/page'
import type { Page, PageVersion } from '@/types'
import { useLibraryStore } from './library'
import { i18n } from '@/i18n'

export interface PageTree extends Page {
  children?: PageTree[]
}

export interface PageState {
  pages: Page[]
  currentPage: Page | null
  pageTree: PageTree[]
  versions: PageVersion[]
  loading: boolean
  error: string | null
}

export const usePageStore = defineStore('page', () => {
  const tr = (key: string) => i18n.global.t(key) as string

  // State
  const pages = ref<Page[]>([])
  const currentPage = ref<Page | null>(null)
  const pageTree = ref<PageTree[]>([])
  const versions = ref<PageVersion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const pageList = computed(() => pages.value)
  const currentPageId = computed(() => currentPage.value?.id || null)
  const getCurrentPage = computed(() => currentPage.value)
  const getPageTree = computed(() => pageTree.value)
  const getVersions = computed(() => versions.value)

  // Actions
  const setLoading = (state: boolean) => {
    loading.value = state
  }

  const setError = (message: string | null) => {
    error.value = message
  }

  const setPages = (pgs: Page[]) => {
    pages.value = pgs
  }

  const setCurrentPage = (page: Page | null) => {
    currentPage.value = page
  }

  const setVersions = (vrs: PageVersion[]) => {
    versions.value = vrs
  }

  // Build tree from flat pages array
  const buildPageTree = (flatPages: Page[]): PageTree[] => {
    const map = new Map<string, PageTree>()
    const roots: PageTree[] = []

    // First pass: create map with children arrays
    flatPages.forEach(page => {
      map.set(page.id, { ...page, children: [] })
    })

    // Second pass: build tree structure
    flatPages.forEach(page => {
      const node = map.get(page.id)
      if (!node) return

      if (page.parentId) {
        const parent = map.get(page.parentId)
        if (parent) {
          parent.children?.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    // Third pass: sort by sortOrder
    const sortNodes = (nodes: PageTree[]) => {
      nodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children)
        }
      })
    }

    sortNodes(roots)

    return roots
  }

  const collectNodeAndDescendantIds = (rootId: string): Set<string> => {
    const ids = new Set<string>([rootId])
    const childrenByParent = new Map<string, string[]>()

    pages.value.forEach((page) => {
      if (!page.parentId) return
      const children = childrenByParent.get(page.parentId) || []
      children.push(page.id)
      childrenByParent.set(page.parentId, children)
    })

    const queue: string[] = [rootId]
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const children = childrenByParent.get(currentId) || []
      children.forEach((childId) => {
        if (!ids.has(childId)) {
          ids.add(childId)
          queue.push(childId)
        }
      })
    }

    return ids
  }

  // Fetch pages for current library
  const fetchPages = async (libraryId?: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const libStore = useLibraryStore()
      const targetLibraryId = libraryId || libStore.currentLibraryId

      if (!targetLibraryId) {
        setError(tr('errors.library.noLibrarySelected'))
        setLoading(false)
        return
      }

      const response = await pageApi.getPages({ libraryId: targetLibraryId })
      if (response.code === 0) {
        setPages(response.data.items)
        pageTree.value = buildPageTree(response.data.items)
      } else {
        setError(response.message || tr('errors.page.fetchPagesFailed'))
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.fetchPagesFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch single page with details
  const fetchPage = async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.getPage(id)
      if (response.code === 0) {
        setCurrentPage(response.data)
      } else {
        setError(response.message || tr('errors.page.fetchPageFailed'))
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.fetchPageFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Create new page
  const createPage = async (data: {
    title: string
    libraryId: string
    parentId?: string
    content?: any
    icon?: string
    isPublic?: boolean
    type?: 'page' | 'group'
  }): Promise<Page | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.createPage(data)
      if (response.code === 0) {
        const newPage = response.data
        pages.value.push(newPage)
        
        // Rebuild tree
        pageTree.value = buildPageTree(pages.value)
        
        return newPage
      } else {
        setError(response.message || tr('errors.page.createFailed'))
        return null
      }
    } catch (err: any) {
      console.error('Page creation error:', err)
      setError(err.response?.data?.message || tr('errors.page.createFailed'))
      return null
    } finally {
      setLoading(false)
    }
  }

  // Update page
  const updatePage = async (id: string, data: {
    title?: string
    content?: any
    icon?: string | null
    isPublic?: boolean
    parentId?: string | null
    description?: string
  }): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.updatePage(id, data)
      if (response.code === 0) {
        const updatedPage = response.data
        const index = pages.value.findIndex(p => p.id === id)
        if (index !== -1) {
          pages.value[index] = updatedPage
        }
        
        // Update current page if it's the one being edited
        if (currentPage.value?.id === id) {
          if (data.content !== undefined) {
            // During content auto-save, preserve the editor's content to avoid
            // resetting the editor state, which causes cursor jumps and input interruption.
            // The editor is the source of truth for content while editing.
            setCurrentPage({ ...updatedPage, content: currentPage.value.content })
          } else {
            setCurrentPage(updatedPage)
          }
        }
        
        // Rebuild tree
        pageTree.value = buildPageTree(pages.value)
        
        return true
      } else {
        setError(response.message || tr('errors.page.updateFailed'))
        return false
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.updateFailed'))
      return false
    } finally {
      setLoading(false)
    }
  }

  // Delete page
  const deletePage = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.deletePage(id)
      if (response.code === 0) {
        pages.value = pages.value.filter(p => p.id !== id)
        
        // Clear current page if it was deleted
        if (currentPage.value?.id === id) {
          setCurrentPage(null)
        }
        
        // Rebuild tree
        pageTree.value = buildPageTree(pages.value)
        
        return true
      } else {
        setError(response.message || tr('errors.page.deleteFailed'))
        return false
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.deleteFailed'))
      return false
    } finally {
      setLoading(false)
    }
  }

  // Archive page/group
  const archivePage = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.archivePage(id)
      if (response.code === 0) {
        const archivedIds = collectNodeAndDescendantIds(id)
        pages.value = pages.value.filter(p => !archivedIds.has(p.id))
        if (currentPage.value?.id && archivedIds.has(currentPage.value.id)) {
          setCurrentPage(null)
        }
        pageTree.value = buildPageTree(pages.value)
        return true
      }

      setError(response.message || tr('errors.page.deleteFailed'))
      return false
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.deleteFailed'))
      return false
    } finally {
      setLoading(false)
    }
  }

  // Restore archived page/group
  const unarchivePage = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.unarchivePage(id)
      if (response.code === 0) {
        return true
      }

      setError(response.message || tr('errors.page.updateFailed'))
      return false
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.updateFailed'))
      return false
    } finally {
      setLoading(false)
    }
  }

  // Move page
  const movePage = async (id: string, data: {
    newParentId?: string | null
    newLibraryId?: string
    sortOrder?: number
  }): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.movePage(id, data)
      if (response.code === 0) {
        // Refresh pages to get updated sortOrders for all affected pages
        // We use the current library ID or the new library ID if it changed
        const libId = data.newLibraryId || response.data.libraryId
        await fetchPages(libId)
        
        return true
      } else {
        setError(response.message || tr('errors.page.moveFailed'))
        return false
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.moveFailed'))
      return false
    } finally {
      setLoading(false)
    }
  }

  // Fetch page versions
  const fetchVersions = async (pageId: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.getVersions(pageId)
      if (response.code === 0) {
        setVersions(response.data)
      } else {
        setError(response.message || tr('errors.page.fetchVersionsFailed'))
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.fetchVersionsFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Create new version
  const createVersion = async (pageId: string, message?: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.createVersion(pageId, { message })
      if (response.code === 0) {
        // Refresh versions list
        await fetchVersions(pageId)
        return true
      } else {
        setError(response.message || tr('errors.page.createVersionFailed'))
        return false
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.createVersionFailed'))
      return false
    } finally {
      setLoading(false)
    }
  }

  // Restore page to version
  const restoreVersion = async (pageId: string, versionId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await pageApi.restoreVersion(pageId, versionId)
      if (response.code === 0) {
        const restoredPage = response.data
        
        // Update pages array
        const index = pages.value.findIndex(p => p.id === pageId)
        if (index !== -1) {
          pages.value[index] = restoredPage
        }
        
        // Update current page if it's the one being restored
        if (currentPage.value?.id === pageId) {
          setCurrentPage(restoredPage)
        }
        
        return true
      } else {
        setError(response.message || tr('errors.page.restoreVersionFailed'))
        return false
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('errors.page.restoreVersionFailed'))
      return false
    } finally {
      setLoading(false)
    }
  }

  // Clear all data (useful when switching libraries or on logout)
  const clearPages = () => {
    pages.value = []
    currentPage.value = null
    pageTree.value = []
    versions.value = []
    error.value = null
  }

  return {
    // State
    pages,
    currentPage,
    pageTree,
    versions,
    loading,
    error,
    
    // Getters
    pageList,
    currentPageId,
    getCurrentPage,
    getPageTree,
    getVersions,
    
    // Actions
    fetchPages,
    fetchPage,
    createPage,
    updatePage,
    deletePage,
    archivePage,
    unarchivePage,
    movePage,
    fetchVersions,
    createVersion,
    restoreVersion,
    clearPages,
    setCurrentPage
  }
})
