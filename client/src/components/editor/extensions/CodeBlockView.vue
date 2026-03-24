<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { ref, computed, nextTick, onBeforeUnmount, onMounted, watch, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import { CopyOutline, CheckmarkOutline, ChevronDownOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'

type DiagramMode = 'source' | 'split' | 'preview'

const props = defineProps<{
  node: {
    attrs: {
      language: string | null
    }
    textContent: string
  }
  updateAttributes: (attrs: any) => void
  editor: { isEditable: boolean }
  extension: any
}>()

const { t } = useI18n()

declare global {
  interface Window {
    Raphael?: any
    flowchart?: {
      parse: (source: string) => {
        drawSVG: (id: string, options?: Record<string, any>) => void
        clean?: () => void
      }
    }
    _: any
    Snap: any
    Diagram?: {
      parse: (source: string) => {
        drawSVG: (target: string | Element, options?: Record<string, any>) => void
      }
    }
  }
}

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const isEditable = computed(() => props.editor.isEditable)

const languages = [
  'arduino', 'bash', 'c', 'cpp', 'csharp', 'css', 'diff', 'docker',
  'flow',
  'go', 'graphql', 'html', 'ini', 'java', 'javascript', 'json',
  'kotlin', 'less', 'lua', 'makefile', 'markdown', 'nginx',
  'objectivec', 'perl', 'php', 'php-template', 'plaintext', 'python',
  'python-repl', 'r', 'ruby', 'rust', 'scss', 'shell', 'sql',
  'seq',
  'swift', 'toml', 'typescript', 'vbnet', 'wasm', 'xml', 'yaml',
]

const currentLanguage = computed(() => props.node.attrs.language || 'auto')

const dropdownOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const dropdownRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLDivElement | null>(null)

const normalizedLanguage = computed(() => (props.node.attrs.language || '').toLowerCase())
const isFlowDiagram = computed(() => normalizedLanguage.value === 'flow')
const isSequenceDiagram = computed(() => normalizedLanguage.value === 'seq' || normalizedLanguage.value === 'sequence')
const isDiagram = computed(() => isFlowDiagram.value || isSequenceDiagram.value)

const DIAGRAM_MIN_ZOOM = 0.6
const DIAGRAM_MAX_ZOOM = 2.4
const DIAGRAM_ZOOM_STEP = 0.1

const diagramZoom = ref(1)
const zoomPercent = computed(() => Math.round(diagramZoom.value * 100))
const canZoomOut = computed(() => diagramZoom.value > DIAGRAM_MIN_ZOOM)
const canZoomIn = computed(() => diagramZoom.value < DIAGRAM_MAX_ZOOM)

const diagramMode = ref<DiagramMode>('split')
const splitRatio = ref(50)
const diagramWorkbenchRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)

const effectiveDiagramMode = computed<DiagramMode>(() => {
  if (!isEditable.value) return 'preview'
  return diagramMode.value
})

const showSourcePanel = computed(() => {
  if (!isDiagram.value) return false
  return effectiveDiagramMode.value === 'source' || effectiveDiagramMode.value === 'split'
})

const showPreviewPanel = computed(() => {
  if (!isDiagram.value) return false
  return effectiveDiagramMode.value === 'preview' || effectiveDiagramMode.value === 'split'
})

const showSplitResizer = computed(() => isEditable.value && effectiveDiagramMode.value === 'split')

const diagramWorkbenchStyle = computed<CSSProperties>(() => {
  if (!showSplitResizer.value) return {}
  return {
    '--diagram-source-ratio': `${splitRatio.value}%`,
    '--diagram-preview-ratio': `${100 - splitRatio.value}%`,
  }
})

const filteredLanguages = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return ['auto', ...languages]
  return ['auto', ...languages].filter((lang) => lang.includes(q))
})

const openDropdown = () => {
  if (!isEditable.value) return
  dropdownOpen.value = true
  searchQuery.value = ''
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

const closeDropdown = () => {
  dropdownOpen.value = false
  searchQuery.value = ''
}

const selectLanguage = (lang: string) => {
  props.updateAttributes({ language: lang === 'auto' ? null : lang })
  closeDropdown()
}

const handleDropdownKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation()
    closeDropdown()
  }
}

const setDiagramMode = (mode: DiagramMode) => {
  if (!isEditable.value) return
  diagramMode.value = mode
}

const clampDiagramZoom = (value: number) => Math.min(DIAGRAM_MAX_ZOOM, Math.max(DIAGRAM_MIN_ZOOM, value))

const setDiagramZoom = (value: number) => {
  diagramZoom.value = clampDiagramZoom(Number(value.toFixed(2)))
}

const zoomIn = () => {
  if (!canZoomIn.value) return
  setDiagramZoom(diagramZoom.value + DIAGRAM_ZOOM_STEP)
}

const zoomOut = () => {
  if (!canZoomOut.value) return
  setDiagramZoom(diagramZoom.value - DIAGRAM_ZOOM_STEP)
}

const clampSplitRatio = (value: number) => Math.min(72, Math.max(28, value))

let resizeCleanup: (() => void) | null = null

const stopResizeTracking = () => {
  resizeCleanup?.()
  resizeCleanup = null
}

const startResize = (event: MouseEvent) => {
  if (!showSplitResizer.value) return

  const container = diagramWorkbenchRef.value
  if (!container) return

  event.preventDefault()

  const containerRect = container.getBoundingClientRect()
  const minWidth = 320

  const onMouseMove = (moveEvent: MouseEvent) => {
    const relativeX = moveEvent.clientX - containerRect.left
    const ratioFromMouse = (relativeX / containerRect.width) * 100

    if (containerRect.width > minWidth) {
      splitRatio.value = clampSplitRatio(ratioFromMouse)
      return
    }

    splitRatio.value = 50
  }

  const onMouseUp = () => {
    stopResizeTracking()
  }

  document.body.classList.add('diagram-resizing')
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp, { once: true })

  resizeCleanup = () => {
    document.body.classList.remove('diagram-resizing')
    document.removeEventListener('mousemove', onMouseMove)
  }
}

const getFullscreenTarget = () =>
  (diagramWorkbenchRef.value?.closest('.code-block-wrapper') as HTMLElement | null) ?? null

const handleFullscreenChange = () => {
  isFullscreen.value = document.fullscreenElement === getFullscreenTarget()
}

const toggleFullscreen = async () => {
  const target = getFullscreenTarget()
  if (!target) return

  try {
    if (document.fullscreenElement === target) {
      await document.exitFullscreen()
      return
    }
    if (typeof target.requestFullscreen === 'function') {
      await target.requestFullscreen()
    }
  } catch {
    // Ignore user gesture and unsupported fullscreen errors.
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (!dropdownOpen.value) return
  const target = event.target as Node
  if (
    dropdownRef.value && !dropdownRef.value.contains(target) &&
    triggerRef.value && !triggerRef.value.contains(target)
  ) {
    closeDropdown()
  }
}

const diagramContainerRef = ref<HTMLDivElement | null>(null)
const diagramError = ref('')
let flowchartScriptPromise: Promise<void> | null = null
let sequenceScriptPromise: Promise<void> | null = null
let activeChart: { clean?: () => void } | null = null
let themeObserver: MutationObserver | null = null

const cleanupActiveFlowchart = () => {
  activeChart?.clean?.()
  activeChart = null
}

const setSvgPresentation = (element: Element, property: 'fill' | 'stroke', value: string) => {
  if (!(element instanceof SVGElement)) return
  element.setAttribute(property, value)
  element.style.setProperty(property, value, 'important')
}

const applySequenceTheme = (mount: HTMLElement) => {
  const svg = mount.querySelector('svg')
  if (!svg) return

  const rootStyle = getComputedStyle(document.documentElement)
  const isDark = document.documentElement.classList.contains('dark')

  const textColor = rootStyle.getPropertyValue('--color-text-primary').trim() || (isDark ? '#f5f5f7' : '#111827')
  const lineColor = rootStyle.getPropertyValue('--color-text-secondary').trim() || (isDark ? '#a1a1a6' : '#4b5563')
  const borderColor = rootStyle.getPropertyValue('--color-border-code').trim() || (isDark ? '#48484a' : '#d1d5db')
  const baseFill = rootStyle.getPropertyValue('--color-bg-code').trim() || (isDark ? '#2d2d30' : '#ffffff')
  const actorFill = rootStyle.getPropertyValue('--color-bg-tertiary').trim() || (isDark ? '#3a3a3c' : '#f8fafc')
  const noteFill = rootStyle.getPropertyValue('--color-bg-secondary').trim() || (isDark ? '#2c2c2e' : '#f9fafb')

  svg.querySelectorAll('text').forEach((element) => {
    setSvgPresentation(element, 'fill', textColor)
  })

  svg.querySelectorAll('line, path, polyline, circle, ellipse').forEach((element) => {
    setSvgPresentation(element, 'stroke', lineColor)
  })

  svg.querySelectorAll('polygon').forEach((element) => {
    setSvgPresentation(element, 'stroke', lineColor)
    setSvgPresentation(element, 'fill', lineColor)
  })

  svg.querySelectorAll('rect').forEach((element) => {
    setSvgPresentation(element, 'stroke', borderColor)
    setSvgPresentation(element, 'fill', baseFill)
  })

  svg.querySelectorAll('.actor rect').forEach((element) => {
    setSvgPresentation(element, 'fill', actorFill)
    setSvgPresentation(element, 'stroke', borderColor)
  })

  svg.querySelectorAll('.note rect').forEach((element) => {
    setSvgPresentation(element, 'fill', noteFill)
    setSvgPresentation(element, 'stroke', borderColor)
  })
}

const parseSvgLength = (value: string | null) => {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

const applyZoomToSvg = (svg: SVGSVGElement) => {
  const zoom = diagramZoom.value || 1
  const currentWidth = parseSvgLength(svg.getAttribute('width')) ?? svg.clientWidth
  const currentHeight = parseSvgLength(svg.getAttribute('height')) ?? svg.clientHeight

  let baseWidth = parseSvgLength(svg.dataset.baseWidth || null)
  let baseHeight = parseSvgLength(svg.dataset.baseHeight || null)

  if (!baseWidth && currentWidth > 0) {
    baseWidth = currentWidth / zoom
  }
  if (!baseHeight && currentHeight > 0) {
    baseHeight = currentHeight / zoom
  }

  if (baseWidth && baseWidth > 0) {
    svg.dataset.baseWidth = `${baseWidth}`
    svg.setAttribute('width', `${Math.ceil(baseWidth * zoom)}`)
  }

  if (baseHeight && baseHeight > 0) {
    svg.dataset.baseHeight = `${baseHeight}`
    svg.setAttribute('height', `${Math.ceil(baseHeight * zoom)}`)
  }
}

const applyDiagramZoom = () => {
  const svg = diagramContainerRef.value?.querySelector('svg') as SVGSVGElement | null
  if (!svg) return
  applyZoomToSvg(svg)
}

const ensureSequenceViewport = (mount: HTMLElement, source: string) => {
  const svg = mount.querySelector('svg') as SVGSVGElement | null
  if (!svg) return

  const adjustBounds = () => {
    try {
      const bbox = svg.getBBox()
      const zoom = diagramZoom.value || 1
      const currentWidth = parseSvgLength(svg.getAttribute('width')) ?? svg.clientWidth
      const currentHeight = parseSvgLength(svg.getAttribute('height')) ?? svg.clientHeight
      const currentWidthUnscaled = currentWidth > 0 ? currentWidth / zoom : 0
      const currentHeightUnscaled = currentHeight > 0 ? currentHeight / zoom : 0

      const horizontalPadding = 20
      const verticalPaddingTop = 18
      const verticalPaddingBottom = 96
      const commandCount = source.split(/\r?\n/).filter((line) => line.trim().length > 0).length
      const heuristicHeight = 150 + commandCount * 62
      const bboxBottom = bbox.y + bbox.height
      const requiredWidthUnscaled = Math.ceil(
        Math.max(currentWidthUnscaled, bbox.x + bbox.width + horizontalPadding),
      )
      const requiredHeightUnscaled = Math.ceil(
        Math.max(currentHeightUnscaled, bboxBottom + verticalPaddingBottom, heuristicHeight),
      )
      const requiredWidth = Math.ceil(requiredWidthUnscaled * zoom)
      const requiredHeight = Math.ceil(requiredHeightUnscaled * zoom)

      svg.style.setProperty('overflow', 'visible', 'important')
      svg.setAttribute('overflow', 'visible')
      svg.dataset.baseWidth = `${requiredWidthUnscaled}`
      svg.dataset.baseHeight = `${requiredHeightUnscaled}`
      svg.setAttribute(
        'viewBox',
        `${Math.floor(Math.min(0, bbox.x) - horizontalPadding / 2)} ${Math.floor(Math.min(0, bbox.y) - verticalPaddingTop)} ${requiredWidthUnscaled} ${requiredHeightUnscaled}`,
      )

      if (requiredWidth > 0) {
        svg.setAttribute('width', `${requiredWidth}`)
      }
      if (requiredHeight > 0) {
        svg.setAttribute('height', `${requiredHeight}`)
      }
    } catch {
      // Ignore bbox failures for transient render states.
    }
  }

  requestAnimationFrame(() => {
    adjustBounds()
    requestAnimationFrame(adjustBounds)
    window.setTimeout(adjustBounds, 100)
    window.setTimeout(adjustBounds, 260)
  })
}

const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
  const existing = document.querySelector(`script[data-diagram-src="${src}"]`) as HTMLScriptElement | null
  if (existing) {
    if (existing.dataset.loaded === 'true') {
      resolve()
      return
    }
    if (existing.dataset.failed === 'true') {
      reject(new Error(`Failed to load ${src}`))
      return
    }
    existing.addEventListener('load', () => resolve(), { once: true })
    existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
    return
  }

  const script = document.createElement('script')
  script.src = src
  script.async = true
  script.dataset.diagramSrc = src
  script.onload = () => {
    script.dataset.loaded = 'true'
    resolve()
  }
  script.onerror = () => {
    script.dataset.failed = 'true'
    reject(new Error(`Failed to load ${src}`))
  }
  document.head.appendChild(script)
})

const loadScriptWithFallback = async (sources: string[]) => {
  let lastError: unknown = null

  for (const src of sources) {
    try {
      await loadScript(src)
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Failed to load external script')
}

const ensureFlowchartLib = async () => {
  if (window.flowchart) return

  if (!flowchartScriptPromise) {
    flowchartScriptPromise = (async () => {
      await loadScriptWithFallback([
        'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js',
        'https://cdn.jsdelivr.net/npm/raphael@2.3.0/raphael.min.js',
        'https://unpkg.com/raphael@2.3.0/raphael.min.js',
      ])
      await loadScriptWithFallback([
        'https://cdnjs.cloudflare.com/ajax/libs/flowchart/1.18.0/flowchart.min.js',
        'https://cdn.jsdelivr.net/npm/flowchart.js@1.18.0/release/flowchart.min.js',
        'https://unpkg.com/flowchart.js@1.18.0/release/flowchart.min.js',
      ])
      if (!window.flowchart) {
        throw new Error('flowchart.js unavailable')
      }
    })()
  }

  await flowchartScriptPromise
}

const ensureSequenceLib = async () => {
  if (window.Diagram?.parse) return

  if (!sequenceScriptPromise) {
    sequenceScriptPromise = (async () => {
      await loadScriptWithFallback([
        'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.6/underscore-min.js',
        'https://cdn.jsdelivr.net/npm/underscore@1.13.6/underscore-umd-min.js',
        'https://unpkg.com/underscore@1.13.6/underscore-umd-min.js',
      ])
      await loadScriptWithFallback([
        'https://cdnjs.cloudflare.com/ajax/libs/snap.svg/0.5.1/snap.svg-min.js',
        'https://cdn.jsdelivr.net/npm/snapsvg@0.5.1/dist/snap.svg-min.js',
        'https://unpkg.com/snapsvg@0.5.1/dist/snap.svg-min.js',
      ])
      await loadScriptWithFallback([
        'https://cdnjs.cloudflare.com/ajax/libs/js-sequence-diagrams/1.0.6/sequence-diagram-min.js',
        'https://cdn.jsdelivr.net/npm/js-sequence-diagrams@1.0.6/dist/sequence-diagram-min.js',
        'https://unpkg.com/js-sequence-diagrams@1.0.6/dist/sequence-diagram-min.js',
      ])
      if (!window.Diagram?.parse) {
        throw new Error('sequence-diagram.js unavailable')
      }
    })()
  }

  await sequenceScriptPromise
}

const renderFlowDiagram = async () => {
  if (!isFlowDiagram.value) {
    diagramError.value = ''
    return
  }

  const container = diagramContainerRef.value
  if (!container) return

  const source = props.node.textContent.trim()
  if (!source) {
    container.innerHTML = ''
    diagramError.value = ''
    return
  }

  try {
    await ensureFlowchartLib()

    cleanupActiveFlowchart()
    container.innerHTML = ''
    diagramError.value = ''

    const chartId = `flowchart-${Math.random().toString(36).slice(2, 10)}`
    const mount = document.createElement('div')
    mount.id = chartId
    container.appendChild(mount)

    const rootStyle = getComputedStyle(document.documentElement)
    const lineColor = rootStyle.getPropertyValue('--color-text-secondary').trim() || '#8b93a1'
    const textColor = rootStyle.getPropertyValue('--color-text-primary').trim() || '#e5e7eb'
    const fillColor = rootStyle.getPropertyValue('--color-bg-code').trim() || '#2f2f34'

    const chart = window.flowchart!.parse(source)
    chart.drawSVG(chartId, {
      'line-width': 2,
      'line-length': 34,
      'text-margin': 6,
      'font-size': 12,
      'font-color': textColor,
      'line-color': lineColor,
      'element-color': lineColor,
      fill: fillColor,
      'yes-text': 'yes',
      'no-text': 'no',
      'arrow-end': 'block',
      scale: 0.78,
    })

    activeChart = chart
    applyDiagramZoom()
  } catch (error: any) {
    container.innerHTML = ''
    diagramError.value = error?.message || 'Flowchart render failed'
  }
}

const renderSequenceDiagram = async () => {
  if (!isSequenceDiagram.value) {
    diagramError.value = ''
    return
  }

  const container = diagramContainerRef.value
  if (!container) return

  const source = props.node.textContent.trim()
  if (!source) {
    container.innerHTML = ''
    diagramError.value = ''
    return
  }

  try {
    await ensureSequenceLib()

    cleanupActiveFlowchart()
    container.innerHTML = ''
    diagramError.value = ''

    const mount = document.createElement('div')
    mount.className = 'sequence-diagram-mount'
    container.appendChild(mount)

    const diagram = window.Diagram!.parse(source)
    diagram.drawSVG(mount, {
      theme: 'simple',
      scale: 0.95,
    })
    applySequenceTheme(mount)
    ensureSequenceViewport(mount, source)
    applyDiagramZoom()
  } catch (error: any) {
    container.innerHTML = ''
    diagramError.value = error?.message || 'Sequence diagram render failed'
  }
}

const renderDiagram = async () => {
  if (!isDiagram.value) {
    cleanupActiveFlowchart()
    diagramError.value = ''
    return
  }

  if (!showPreviewPanel.value) return

  if (isFlowDiagram.value) {
    await renderFlowDiagram()
    return
  }

  if (isSequenceDiagram.value) {
    await renderSequenceDiagram()
  }
}

watch(
  () => [props.node.textContent, props.node.attrs.language, showPreviewPanel.value] as const,
  () => {
    void renderDiagram()
  },
  { immediate: true },
)

watch(
  () => effectiveDiagramMode.value,
  async (mode) => {
    if (mode === 'source') return
    await nextTick()
    void renderDiagram()
  },
)

watch(
  () => diagramZoom.value,
  () => {
    if (!showPreviewPanel.value) return
    applyDiagramZoom()
  },
)

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  handleFullscreenChange()

  themeObserver = new MutationObserver(() => {
    if (!isDiagram.value || !showPreviewPanel.value) return
    void renderDiagram()
  })

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  })

  void renderDiagram()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)

  const fullscreenTarget = getFullscreenTarget()
  if (fullscreenTarget && document.fullscreenElement === fullscreenTarget) {
    void document.exitFullscreen().catch(() => undefined)
  }

  cleanupActiveFlowchart()

  if (copyTimer) {
    clearTimeout(copyTimer)
    copyTimer = null
  }

  themeObserver?.disconnect()
  themeObserver = null

  stopResizeTracking()
})

const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}
</script>

<template>
  <node-view-wrapper class="code-block-wrapper">
    <div class="code-block-header">
      <div class="code-block-header-left">
        <div v-if="isEditable" class="code-block-language-picker" contenteditable="false">
          <div
            ref="triggerRef"
            class="language-trigger"
            @click.stop="openDropdown"
          >
            <span class="language-label">{{ currentLanguage }}</span>
            <n-icon :size="12" class="language-arrow">
              <ChevronDownOutline />
            </n-icon>
          </div>
          <div
            v-if="dropdownOpen"
            ref="dropdownRef"
            class="language-dropdown"
            @keydown="handleDropdownKeydown"
          >
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              class="language-search"
              :placeholder="t('editor.codeBlock.searchLanguage')"
              @keydown.stop
            />
            <div class="language-list">
              <div
                v-for="lang in filteredLanguages"
                :key="lang"
                class="language-option"
                :class="{ active: lang === currentLanguage }"
                @click.stop="selectLanguage(lang)"
              >
                {{ lang }}
              </div>
              <div v-if="filteredLanguages.length === 0" class="language-empty">
                {{ t('editor.codeBlock.noMatch') }}
              </div>
            </div>
          </div>
        </div>
        <span v-else class="code-block-language">{{ node.attrs.language || '' }}</span>

        <div
          v-if="isDiagram && isEditable"
          class="diagram-mode-switch"
          contenteditable="false"
        >
          <button
            class="diagram-mode-btn"
            :class="{ active: effectiveDiagramMode === 'source' }"
            @click="setDiagramMode('source')"
          >
            {{ t('editor.codeBlock.modeSource') }}
          </button>
          <button
            class="diagram-mode-btn"
            :class="{ active: effectiveDiagramMode === 'split' }"
            @click="setDiagramMode('split')"
          >
            {{ t('editor.codeBlock.modeSplit') }}
          </button>
          <button
            class="diagram-mode-btn"
            :class="{ active: effectiveDiagramMode === 'preview' }"
            @click="setDiagramMode('preview')"
          >
            {{ t('editor.codeBlock.modePreview') }}
          </button>
        </div>
      </div>

      <div class="code-block-header-actions">
        <div v-if="isDiagram" class="diagram-toolbar" contenteditable="false">
          <button
            class="diagram-toolbar-btn"
            :disabled="!canZoomOut"
            :title="t('editor.codeBlock.zoomOut')"
            @click.stop="zoomOut"
          >
            -
          </button>
          <span
            class="diagram-zoom-indicator"
            :title="t('editor.codeBlock.zoomLevel', { percent: zoomPercent })"
          >
            {{ zoomPercent }}%
          </span>
          <button
            class="diagram-toolbar-btn"
            :disabled="!canZoomIn"
            :title="t('editor.codeBlock.zoomIn')"
            @click.stop="zoomIn"
          >
            +
          </button>
          <button
            class="diagram-toolbar-btn diagram-toolbar-btn-fullscreen"
            :title="isFullscreen ? t('editor.codeBlock.exitFullscreen') : t('editor.codeBlock.fullscreen')"
            @click.stop="toggleFullscreen"
          >
            {{ isFullscreen ? '↙' : '⛶' }}
          </button>
        </div>
        <button
          class="copy-button"
          :class="{ copied }"
          @click="handleCopy(node.textContent)"
          :title="copied ? t('editor.codeBlock.copied') : t('editor.codeBlock.copyCode')"
        >
          <n-icon :size="14">
            <CheckmarkOutline v-if="copied" />
            <CopyOutline v-else />
          </n-icon>
          <span class="copy-label">{{ copied ? t('editor.codeBlock.copied') : t('editor.codeBlock.copy') }}</span>
        </button>
      </div>
    </div>

    <template v-if="isDiagram">
      <div
        ref="diagramWorkbenchRef"
        class="diagram-workbench"
        :class="[`mode-${effectiveDiagramMode}`]"
        :style="diagramWorkbenchStyle"
      >
        <div v-show="showSourcePanel" class="diagram-panel diagram-panel-source">
          <div v-if="isEditable" class="diagram-panel-title" contenteditable="false">
            {{ t('editor.codeBlock.sourcePanel') }} ({{ node.textContent.length }})
          </div>
          <pre class="diagram-source"><node-view-content as="code" /></pre>
        </div>

        <div
          v-if="showSplitResizer"
          class="diagram-resizer"
          contenteditable="false"
          :title="t('editor.codeBlock.dragResize')"
          @mousedown.stop="startResize"
        >
          <span class="diagram-resizer-grip"></span>
        </div>

        <div v-if="showPreviewPanel" class="diagram-panel diagram-panel-preview" contenteditable="false">
          <div v-if="isEditable" class="diagram-panel-title">
            {{ t('editor.codeBlock.previewPanel') }}
          </div>
          <div
            ref="diagramContainerRef"
            class="diagram-canvas"
            :class="{
              'flow-diagram': isFlowDiagram,
              'sequence-diagram': isSequenceDiagram,
            }"
          ></div>
          <div v-if="diagramError" class="diagram-error">
            {{ diagramError }}
          </div>
          <div v-else-if="!node.textContent.trim()" class="diagram-empty">
            {{ t('editor.codeBlock.diagramEmpty') }}
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <pre><node-view-content as="code" /></pre>
    </template>
  </node-view-wrapper>
</template>

<style scoped>
.code-block-wrapper {
  position: relative;
  margin: 1.2em 0;
  border-radius: 8px;
  border: 1px solid var(--color-border-code);
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--color-bg-code-header);
  padding: 6px 12px 6px 16px;
  min-height: 34px;
  border-bottom: 1px solid var(--color-border-code);
  border-radius: 7px 7px 0 0;
}

.code-block-header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.code-block-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diagram-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.diagram-toolbar-btn {
  border: 1px solid var(--color-border-code);
  background: var(--color-bg-code);
  color: var(--color-text-secondary);
  min-width: 24px;
  height: 24px;
  border-radius: 6px;
  padding: 0 6px;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    color: var(--color-text-primary);
    border-color: var(--color-text-tertiary);
    background: var(--color-bg-secondary);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.diagram-toolbar-btn-fullscreen {
  min-width: 30px;
}

.diagram-zoom-indicator {
  min-width: 44px;
  text-align: center;
  font-size: 11px;
  color: var(--color-text-secondary);
  user-select: none;
}

.code-block-language {
  font-size: 12px;
  color: var(--color-code-lang-text);
  font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Menlo", "Monaco", "Courier New", monospace;
  user-select: none;
}

.code-block-language-picker {
  position: relative;
}

.language-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-code-lang-text);
  font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Menlo", "Monaco", "Courier New", monospace;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;

  &:hover {
    border-color: var(--color-code-lang-hover-border);
    background: var(--color-code-lang-hover-bg);
    color: var(--color-code-lang-hover-text);
  }
}

.language-arrow {
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.language-trigger:hover .language-arrow {
  opacity: 1;
}

.language-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  width: 180px;
  background: var(--color-code-dropdown-bg);
  border: 1px solid var(--color-border-code);
  border-radius: 8px;
  box-shadow: var(--shadow-popup);
  overflow: hidden;
}

.language-search {
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid var(--color-border-code);
  outline: none;
  font-size: 12px;
  font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Menlo", "Monaco", "Courier New", monospace;
  color: var(--color-code-search-text);
  background: var(--color-code-search-bg);
  box-sizing: border-box;

  &::placeholder {
    color: var(--color-code-search-placeholder);
  }
}

.language-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
}

.language-option {
  padding: 5px 10px;
  font-size: 12px;
  font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Menlo", "Monaco", "Courier New", monospace;
  color: var(--color-code-option-text);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s ease;

  &:hover {
    background: var(--color-code-option-hover);
  }

  &.active {
    background: var(--color-code-option-active-bg);
    color: var(--color-code-option-active-text);
    font-weight: 500;
  }
}

.language-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--color-code-search-placeholder);
  text-align: center;
}

.diagram-mode-switch {
  display: inline-flex;
  align-items: center;
  background: var(--color-bg-code);
  border: 1px solid var(--color-border-code);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.diagram-mode-btn {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-tertiary);
  }

  &.active {
    color: var(--color-text-primary);
    background: var(--color-bg-secondary);
  }
}

.copy-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: var(--color-code-lang-text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  transition: all 0.15s ease;
  user-select: none;

  &:hover {
    background: var(--color-code-copy-hover-bg);
    color: var(--color-code-copy-hover-text);
  }

  &.copied {
    color: var(--color-code-copy-success);
  }
}

.copy-label {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.code-block-wrapper :deep(pre) {
  background: var(--color-bg-code);
  padding: 16px 20px;
  font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Menlo", "Monaco", "Courier New", monospace;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: pre;
  margin: 0;
  border-radius: 0 0 7px 7px;
  -webkit-overflow-scrolling: touch;
}

.code-block-wrapper :deep(pre code) {
  display: block;
  min-width: max-content;
  background: none;
  padding: 0;
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--color-hljs-text);
  border-radius: 0;
  font-family: inherit;
  white-space: inherit;
  word-break: normal;
  overflow-wrap: normal;
}

.code-block-wrapper :deep(.hljs-comment),
.code-block-wrapper :deep(.hljs-quote) {
  color: var(--color-hljs-comment);
  font-style: italic;
}

.code-block-wrapper :deep(.hljs-keyword),
.code-block-wrapper :deep(.hljs-selector-tag),
.code-block-wrapper :deep(.hljs-type) {
  color: var(--color-hljs-keyword);
}

.code-block-wrapper :deep(.hljs-string),
.code-block-wrapper :deep(.hljs-addition),
.code-block-wrapper :deep(.hljs-attr) {
  color: var(--color-hljs-string);
}

.code-block-wrapper :deep(.hljs-literal),
.code-block-wrapper :deep(.hljs-number),
.code-block-wrapper :deep(.hljs-symbol) {
  color: var(--color-hljs-number);
}

.code-block-wrapper :deep(.hljs-built_in),
.code-block-wrapper :deep(.hljs-builtin-name) {
  color: var(--color-hljs-builtin);
}

.code-block-wrapper :deep(.hljs-function),
.code-block-wrapper :deep(.hljs-title),
.code-block-wrapper :deep(.hljs-section) {
  color: var(--color-hljs-function);
}

.code-block-wrapper :deep(.hljs-variable),
.code-block-wrapper :deep(.hljs-template-variable) {
  color: var(--color-hljs-builtin);
}

.code-block-wrapper :deep(.hljs-deletion) {
  color: var(--color-hljs-deletion-text);
  background-color: var(--color-hljs-deletion-bg);
}

.code-block-wrapper :deep(.hljs-addition) {
  background-color: var(--color-hljs-addition-bg);
}

.code-block-wrapper :deep(.hljs-meta) {
  color: var(--color-hljs-meta);
}

.code-block-wrapper :deep(.hljs-tag) {
  color: var(--color-hljs-tag);
}

.code-block-wrapper :deep(.hljs-name),
.code-block-wrapper :deep(.hljs-attribute) {
  color: var(--color-hljs-attribute);
}

.code-block-wrapper :deep(.hljs-selector-id),
.code-block-wrapper :deep(.hljs-selector-class) {
  color: var(--color-hljs-selector);
}

.code-block-wrapper :deep(.hljs-regexp),
.code-block-wrapper :deep(.hljs-link) {
  color: var(--color-hljs-string);
}

.code-block-wrapper :deep(.hljs-doctag) {
  color: var(--color-hljs-keyword);
}

.code-block-wrapper :deep(.hljs-params) {
  color: var(--color-hljs-params);
}

.code-block-wrapper :deep(.hljs-emphasis) {
  font-style: italic;
}

.code-block-wrapper :deep(.hljs-strong) {
  font-weight: 700;
}

.code-block-wrapper :deep(.hljs-subst) {
  color: var(--color-hljs-params);
}

.diagram-workbench {
  background: var(--color-bg-code);
  border-radius: 0 0 7px 7px;
}

.diagram-workbench.mode-source,
.diagram-workbench.mode-preview {
  display: block;
}

.diagram-workbench.mode-split {
  display: grid;
  grid-template-columns: minmax(0, var(--diagram-source-ratio)) 12px minmax(0, var(--diagram-preview-ratio));
  align-items: stretch;
}

.diagram-panel {
  min-width: 0;
}

.diagram-panel-title {
  border-top: 1px solid var(--color-border-code);
  border-bottom: 1px solid var(--color-border-code);
  padding: 6px 12px;
  font-size: 11px;
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  user-select: none;
}

.diagram-workbench.mode-source .diagram-panel-title,
.diagram-workbench.mode-preview .diagram-panel-title {
  border-right: none;
}

.diagram-panel-source {
  border-right: 1px solid var(--color-border-code);
}

.diagram-workbench.mode-source .diagram-panel-source,
.diagram-workbench.mode-preview .diagram-panel-source {
  border-right: none;
}

.diagram-source {
  border-radius: 0 0 0 7px;
  margin: 0;
  min-height: 260px;
  max-height: 520px;
  overflow: auto;
  padding: 14px 16px 16px !important;
  color: var(--color-hljs-text);
  caret-color: var(--color-text-primary);
}

.diagram-workbench.mode-source .diagram-source {
  border-radius: 0 0 7px 7px;
}

.diagram-source :deep(code) {
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-hljs-text) !important;
}

.diagram-source :deep(code span) {
  color: inherit;
}

.diagram-panel-preview {
  display: flex;
  flex-direction: column;
  padding: 14px 16px 16px;
  min-height: 260px;
}

.diagram-workbench.mode-preview .diagram-panel-preview {
  border-radius: 0 0 7px 7px;
}

.diagram-canvas {
  flex: 1;
  width: 100%;
  min-height: 220px;
  max-width: 920px;
  margin: 0 auto;
  overflow: auto;
  padding: 6px 0;
}

.diagram-canvas :deep(svg) {
  display: block;
  max-width: 100%;
  width: auto !important;
  height: auto;
  margin: 0 auto;
}

.diagram-canvas.sequence-diagram :deep(svg text) {
  fill: var(--color-text-primary) !important;
}

.diagram-canvas.sequence-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 18px;
}

.diagram-canvas.sequence-diagram :deep(.sequence-diagram-mount) {
  margin: auto;
}

.code-block-wrapper:fullscreen {
  width: 100%;
  height: 100%;
  max-width: none;
  margin: 0;
  border-radius: 0;
  border: none;
  background: var(--color-bg-primary);
  padding: 14px 18px;
}

.code-block-wrapper:fullscreen .code-block-header {
  border-radius: 10px 10px 0 0;
}

.code-block-wrapper:fullscreen .diagram-workbench {
  border-radius: 0 0 10px 10px;
}

.code-block-wrapper:fullscreen .diagram-source,
.code-block-wrapper:fullscreen .diagram-panel-preview {
  min-height: calc(100vh - 190px);
  max-height: none;
}

.diagram-canvas.sequence-diagram :deep(svg .actor rect),
.diagram-canvas.sequence-diagram :deep(svg .signal .labelBox) {
  fill: var(--color-bg-code) !important;
  stroke: var(--color-border-code) !important;
}

.diagram-canvas.sequence-diagram :deep(svg .note rect) {
  fill: var(--color-bg-secondary) !important;
  stroke: var(--color-border-code) !important;
}

.diagram-canvas.sequence-diagram :deep(svg path),
.diagram-canvas.sequence-diagram :deep(svg line),
.diagram-canvas.sequence-diagram :deep(svg polyline),
.diagram-canvas.sequence-diagram :deep(svg circle),
.diagram-canvas.sequence-diagram :deep(svg ellipse),
.diagram-canvas.sequence-diagram :deep(svg polygon) {
  stroke: var(--color-text-secondary) !important;
}

.diagram-canvas.sequence-diagram :deep(svg polygon) {
  fill: var(--color-text-secondary) !important;
}

.diagram-error {
  margin-top: 10px;
  color: #ef4444;
  font-size: 12px;
}

.diagram-empty {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.diagram-resizer {
  border-top: 1px solid var(--color-border-code);
  border-bottom: 1px solid var(--color-border-code);
  background: var(--color-bg-code);
  cursor: col-resize;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.diagram-resizer::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-50%);
  background: var(--color-border-code);
}

.diagram-resizer-grip {
  width: 4px;
  height: 34px;
  border-radius: 4px;
  background: var(--color-scrollbar);
  z-index: 1;
}

@media (max-width: 1080px) {
  .diagram-zoom-indicator {
    display: none;
  }

  .diagram-mode-switch {
    display: none;
  }

  .diagram-workbench.mode-split {
    display: block;
  }

  .diagram-panel-source {
    border-right: none;
    border-bottom: 1px solid var(--color-border-code);
  }

  .diagram-source {
    border-radius: 0;
    max-height: 300px;
  }

  .diagram-workbench.mode-preview .diagram-panel-preview,
  .diagram-workbench.mode-source .diagram-source {
    border-radius: 0 0 7px 7px;
  }

  .diagram-panel-title {
    border-right: none;
  }

  .diagram-resizer {
    display: none;
  }
}
</style>
