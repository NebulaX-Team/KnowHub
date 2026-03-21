<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NDrawer, NDrawerContent, NSwitch, NInput, NButton, NSpace, NText, useMessage } from 'naive-ui'
import { pageApi } from '@/api/page'
import { libraryApi } from '@/api/library'
import { copyToClipboard } from '@/utils/clipboard'
import type { Page, Library } from '@/types'

const props = defineProps<{
  show: boolean
  type: 'page' | 'library'
  data: Page | Library | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'update', data: Page | Library): void
}>()

const message = useMessage()
const { t } = useI18n()
const isPublic = ref(false)
const publicSlug = ref('')
const loading = ref(false)

watch(() => props.data, (newData) => {
  if (newData) {
    isPublic.value = !!newData.isPublic
    publicSlug.value = newData.publicSlug || ''
  }
}, { immediate: true })

const publicLink = computed(() => {
  if (!publicSlug.value) return ''
  const baseUrl = window.location.origin
  const typePath = props.type === 'library' ? 'libraries' : 'pages'
  return `${baseUrl}/public/${typePath}/${publicSlug.value}`
})

async function handlePublicChange(value: boolean) {
  if (!props.data) return
  
  console.debug('handlePublicChange', { value, type: props.type, id: props.data.id });
  loading.value = true
  try {
    let updatedData
    if (props.type === 'page') {
      // @ts-ignore
      const res = await pageApi.updatePage(props.data.id, { isPublic: value })
      updatedData = res.data
    } else {
      // @ts-ignore
      console.debug('Calling updateLibrary with', { isPublic: value });
      const res = await libraryApi.updateLibrary(props.data.id, { isPublic: value })
      console.debug('updateLibrary response', res);
      updatedData = res.data
    }
    
    isPublic.value = value
    if (updatedData.publicSlug) {
      publicSlug.value = updatedData.publicSlug
    }
    emit('update', updatedData)
    message.success(value ? t('publicAccess.messages.enabled') : t('publicAccess.messages.disabled'))
  } catch (error) {
    console.error('handlePublicChange error', error);
    message.error(t('publicAccess.messages.updateFailed'))
    isPublic.value = !value // Revert
  } finally {
    loading.value = false
  }
}

async function copyLink() {
  if (!publicLink.value) return
  const success = await copyToClipboard(publicLink.value)
  if (success) {
    message.success(t('publicAccess.messages.copySuccess'))
  } else {
    message.error(t('publicAccess.messages.copyFailed'))
  }
}
</script>

<template>
  <NDrawer :show="show" @update:show="emit('update:show', $event)" width="400">
    <NDrawerContent :title="t('publicAccess.title')">
      <NSpace vertical size="large">
        <NSpace justify="space-between" align="center">
          <NText>{{ t('publicAccess.publicAccess') }}</NText>
          <NSwitch :value="isPublic" @update:value="handlePublicChange" :loading="loading" />
        </NSpace>

        <div v-if="isPublic">
          <NText depth="3" class="label">{{ t('publicAccess.publicLink') }}</NText>
          <NSpace>
            <NInput :value="publicLink" readonly :placeholder="t('publicAccess.noLinkGenerated')" />
            <NButton @click="copyLink" :disabled="!publicLink">{{ t('publicAccess.copy') }}</NButton>
          </NSpace>
        </div>

        <div class="notes">
          <NText strong>{{ t('publicAccess.notesTitle') }}</NText>
          <ul>
            <li>{{ t('publicAccess.notes.item1') }}</li>
            <li>{{ t('publicAccess.notes.item2') }}</li>
            <li>{{ t('publicAccess.notes.item3') }}</li>
            <li>{{ t('publicAccess.notes.item4') }}</li>
          </ul>
        </div>
      </NSpace>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.label {
  display: block;
  margin-bottom: 8px;
}
.notes ul {
  padding-left: 20px;
  margin-top: 8px;
}
.notes li {
  margin-bottom: 4px;
  color: var(--n-text-color-3);
}
</style>
