<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NAlert, NButton, NCard, NSpace, NSwitch, NText, useMessage } from 'naive-ui'
import { systemApi, type AccessConfig } from '@/api/system'

const route = useRoute()
const message = useMessage()
const { t } = useI18n()

const loading = ref(false)
const saving = ref(false)
const formValue = ref<AccessConfig>({
  allowRegistration: true,
  allowPasswordReset: true,
})
const initialValue = ref<AccessConfig>({
  allowRegistration: true,
  allowPasswordReset: true,
})

const title = computed(() => {
  const titleKey = route.meta.titleKey as string | undefined
  if (titleKey) {
    return t(titleKey)
  }
  return (route.meta.title as string) || t('settings.access')
})

const hasChanged = computed(() => {
  return (
    formValue.value.allowRegistration !== initialValue.value.allowRegistration
    || formValue.value.allowPasswordReset !== initialValue.value.allowPasswordReset
  )
})

async function loadAccessConfig() {
  loading.value = true
  try {
    const response = await systemApi.getAccessConfig()
    if (response.code === 0) {
      const next = {
        allowRegistration: !!response.data.allowRegistration,
        allowPasswordReset: !!response.data.allowPasswordReset,
      }
      formValue.value = next
      initialValue.value = { ...next }
      return
    }
  } catch {
    // handled below
  } finally {
    loading.value = false
  }

  message.error(t('settingsPage.access.messages.loadFailed'))
}

async function handleSave() {
  saving.value = true
  try {
    const response = await systemApi.updateAccessConfig({
      allowRegistration: formValue.value.allowRegistration,
      allowPasswordReset: formValue.value.allowPasswordReset,
    })

    if (response.code === 0) {
      const next = {
        allowRegistration: !!response.data.allowRegistration,
        allowPasswordReset: !!response.data.allowPasswordReset,
      }
      formValue.value = next
      initialValue.value = { ...next }
      message.success(t('settingsPage.access.messages.saveSuccess'))
      return
    }
  } catch {
    // handled below
  } finally {
    saving.value = false
  }

  message.error(t('settingsPage.access.messages.saveFailed'))
}

function handleReset() {
  formValue.value = { ...initialValue.value }
}

onMounted(() => {
  loadAccessConfig()
})
</script>

<template>
  <div class="settings-content">
    <div class="settings-header">
      <h2>{{ title }}</h2>
      <p class="description">{{ t('settingsPage.access.description') }}</p>
    </div>

    <NCard :title="t('settingsPage.access.cards.auth')">
      <NSpace vertical :size="20">
        <div class="config-row">
          <div class="config-text">
            <NText strong>{{ t('settingsPage.access.form.allowRegistration') }}</NText>
            <p>{{ t('settingsPage.access.hints.allowRegistration') }}</p>
          </div>
          <NSwitch
            v-model:value="formValue.allowRegistration"
            :loading="loading || saving"
            :disabled="loading || saving"
          />
        </div>

        <div class="config-row">
          <div class="config-text">
            <NText strong>{{ t('settingsPage.access.form.allowPasswordReset') }}</NText>
            <p>{{ t('settingsPage.access.hints.allowPasswordReset') }}</p>
          </div>
          <NSwitch
            v-model:value="formValue.allowPasswordReset"
            :loading="loading || saving"
            :disabled="loading || saving"
          />
        </div>

        <NAlert type="info" :show-icon="true">
          {{ t('settingsPage.access.hints.applyImmediately') }}
        </NAlert>

        <NSpace>
          <NButton
            type="primary"
            :loading="saving"
            :disabled="loading || saving || !hasChanged"
            @click="handleSave"
          >
            {{ t('settingsPage.access.buttons.save') }}
          </NButton>
          <NButton
            :disabled="loading || saving || !hasChanged"
            @click="handleReset"
          >
            {{ t('settingsPage.access.buttons.reset') }}
          </NButton>
        </NSpace>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped lang="scss">
.settings-content {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: 24px;

  h2 {
    margin: 0 0 8px;
    font-size: 24px;
    font-weight: 600;
  }

  .description {
    margin: 0;
    color: var(--color-text-secondary);
  }
}

.config-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.config-text {
  flex: 1;
  min-width: 0;

  p {
    margin: 8px 0 0;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
}

@media (max-width: 768px) {
  .settings-content {
    padding: 16px;
  }

  .config-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
