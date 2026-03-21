<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5'
import { uploadApi } from '@/api/upload'
import FloatingPanel from './common/FloatingPanel.vue'

const props = defineProps<{
  visible: boolean
  position: { top: number; bottom: number; left: number }
  pageId?: string
  libraryId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert', url: string): void
}>()

const message = useMessage()
const { t } = useI18n()

// Debug: Watch for visibility changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    console.debug('=== ImageUploaderPopover visible ===');
    console.debug('props:', { pageId: props.pageId, libraryId: props.libraryId });
  }
})
const loading = ref(false)
const imageUrl = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const popoverRef = ref<InstanceType<typeof FloatingPanel> | null>(null)
const placement = ref<'top' | 'bottom'>('bottom')

const popoverStyle = computed(() => {
  if (placement.value === 'top') {
    return {
      top: `${props.position.top - 10}px`,
      left: `${props.position.left}px`,
      transform: 'translateY(-100%)'
    }
  }
  return {
    top: `${props.position.bottom + 10}px`,
    left: `${props.position.left}px`
  }
})

watch(() => props.visible, async (val) => {
  if (val) {
    placement.value = 'bottom'
    await nextTick()
    const el = popoverRef.value?.$el
    if (el) {
      const rect = el.getBoundingClientRect()
      // If bottom overflows viewport, flip to top
      if (rect.bottom > window.innerHeight) {
        placement.value = 'top'
      }
    }
  }
})

const handleUpload = async (file: File) => {
  loading.value = true
  console.debug('=== ImageUploaderPopover handleUpload ===');
  console.debug('props.pageId:', props.pageId);
  console.debug('props.libraryId:', props.libraryId);
  console.debug('=========================================');
  try {
    const res = await uploadApi.uploadImage(file, props.pageId, props.libraryId)
    // Check if res.data exists, otherwise use res directly if interceptor unwraps it
    const url = res.url || (res.data && res.data.url)
    if (url) {
      emit('insert', url)
      emit('close')
    } else {
      console.error('Invalid response format', res)
      message.error(t('editor.imageUploader.messages.invalidResponse'))
    }
  } catch (error) {
    console.error(error)
    message.error(t('editor.imageUploader.messages.uploadFailed'))
  } finally {
    loading.value = false
  }
}

const handleUrlSubmit = () => {
  if (imageUrl.value) {
    emit('insert', imageUrl.value)
    emit('close')
  }
}

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    handleUpload(target.files[0])
  }
  if (target) target.value = ''
}

const triggerUpload = () => {
  fileInput.value?.click()
}

// Click outside handler
const handleClickOutside = (event: MouseEvent) => {
  const el = popoverRef.value?.$el
  if (props.visible && el && !el.contains(event.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <FloatingPanel
    v-if="visible"
    ref="popoverRef"
    class="image-uploader-popover"
    :style="popoverStyle"
    width="300px"
    padding="1rem"
  >
    <div class="content">
      <div class="input-group">
        <n-input
          v-model:value="imageUrl"
          :placeholder="t('editor.imageUploader.placeholders.imageUrl')"
          @keydown.enter="handleUrlSubmit"
          size="small"
          autofocus
        />
        <n-button @click="handleUrlSubmit" :disabled="!imageUrl" size="small">{{ t('editor.imageUploader.actions.embed') }}</n-button>
      </div>
      <div class="divider">{{ t('editor.imageUploader.or') }}</div>
      <div class="upload-btn-wrapper">
        <input type="file" accept="image/*" @change="onFileChange" style="display: none" ref="fileInput" />
        <n-button @click="triggerUpload" :loading="loading" size="small" block>
          <template #icon>
            <n-icon :component="CloudUploadOutline" />
          </template>
          {{ t('editor.imageUploader.actions.upload') }}
        </n-button>
      </div>
    </div>
  </FloatingPanel>
</template>

<style lang="scss" scoped>
.image-uploader-popover {
  position: absolute;
  z-index: 1000;
  // transform removed, handled in computed style for flipping

  .content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    .input-group {
      display: flex;
      gap: 0.5rem;
    }

    .divider {
      text-align: center;
      font-size: 0.8rem;
      color: var(--color-uploader-divider);
      position: relative;

      &::before,
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 40%;
        height: 1px;
        background-color: var(--color-uploader-line);
      }

      &::before {
        left: 0;
      }
      &::after {
        right: 0;
      }
    }
  }
}
</style>
