<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NCard, NEmpty } from 'naive-ui'

const route = useRoute()
const { t } = useI18n()
const title = computed(() => {
  const titleKey = route.meta.titleKey as string | undefined
  if (titleKey) {
    return t(titleKey)
  }
  return (route.meta.title as string) || t('settings.title')
})
</script>

<template>
  <div class="settings-content">
    <div class="settings-header">
      <h2>{{ title }}</h2>
    </div>
    <n-card>
      <n-empty :description="t('settingsPage.placeholder.comingSoon')">
        <template #extra>
          {{ t('settingsPage.placeholder.pendingImplementation', { title }) }}
        </template>
      </n-empty>
    </n-card>
  </div>
</template>

<style scoped lang="scss">
.settings-content {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;

  .settings-header {
    margin-bottom: 24px;
    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
  }
}
</style>
