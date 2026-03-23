<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { 
  NForm, 
  NFormItem, 
  NInput, 
  NButton, 
  NSpace, 
  NCard, 
  type FormInst,
  useMessage 
} from 'naive-ui'
import { systemApi } from '@/api/system'
import { isValidUtcOffset, normalizeUtcOffset } from '@/utils/datetime'
import { useSystemStore } from '@/stores/system'

const route = useRoute()
const message = useMessage()
const { t } = useI18n()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const saving = ref(false)
const systemStore = useSystemStore()

const title = computed(() => {
  const titleKey = route.meta.titleKey as string | undefined
  if (titleKey) {
    return t(titleKey)
  }
  return (route.meta.title as string) || t('settingsPage.siteInfo.defaultTitle')
})

const formValue = ref({
  titleZh: '',
  titleEn: '',
  descriptionZh: '',
  descriptionEn: '',
  siteTimezone: 'UTC+8',
})

// 表单验证规则
const rules = computed(() => ({
  titleZh: [
    { required: true, message: t('settingsPage.siteInfo.validation.titleZhRequired'), trigger: ['blur', 'input'] },
    { max: 100, message: t('settingsPage.siteInfo.validation.titleMax'), trigger: ['blur', 'input'] }
  ],
  titleEn: [
    { required: true, message: t('settingsPage.siteInfo.validation.titleEnRequired'), trigger: ['blur', 'input'] },
    { max: 100, message: t('settingsPage.siteInfo.validation.titleMax'), trigger: ['blur', 'input'] }
  ],
  descriptionZh: [
    { required: true, message: t('settingsPage.siteInfo.validation.descriptionZhRequired'), trigger: ['blur', 'input'] },
    { max: 500, message: t('settingsPage.siteInfo.validation.descriptionMax'), trigger: ['blur', 'input'] }
  ],
  descriptionEn: [
    { required: true, message: t('settingsPage.siteInfo.validation.descriptionEnRequired'), trigger: ['blur', 'input'] },
    { max: 500, message: t('settingsPage.siteInfo.validation.descriptionMax'), trigger: ['blur', 'input'] }
  ],
  siteTimezone: [
    { required: true, message: t('settingsPage.siteInfo.validation.timezoneRequired'), trigger: ['blur', 'input'] },
    {
      trigger: ['blur', 'input'],
      validator: (_rule: any, value: string) => {
        if (!value?.trim()) {
          return new Error(t('settingsPage.siteInfo.validation.timezoneRequired'))
        }
        if (!isValidUtcOffset(value)) {
          return new Error(t('settingsPage.siteInfo.validation.timezoneInvalid'))
        }
        return true
      },
    },
  ],
}))

// 获取网站信息
async function loadSiteInfo() {
  try {
    loading.value = true
    const response = await systemApi.getSiteInfo()
    const titleI18n = response.data.titleI18n || {
      'zh-CN': response.data.title || '',
      'en-US': response.data.title || ''
    }
    const descriptionI18n = response.data.descriptionI18n || {
      'zh-CN': response.data.description || '',
      'en-US': response.data.description || ''
    }
    formValue.value = {
      titleZh: titleI18n['zh-CN'] || '',
      titleEn: titleI18n['en-US'] || '',
      descriptionZh: descriptionI18n['zh-CN'] || '',
      descriptionEn: descriptionI18n['en-US'] || '',
      siteTimezone: normalizeUtcOffset(response.data.siteTimezone || 'UTC+8'),
    }
  } catch (error) {
    message.error(t('settingsPage.siteInfo.messages.loadFailed'))
    console.error('Failed to load site info:', error)
  } finally {
    loading.value = false
  }
}

// 保存网站信息
async function handleSave() {
  try {
    await formRef.value?.validate()
    saving.value = true

    const updated = await systemStore.updateConfig({
      titleI18n: {
        'zh-CN': formValue.value.titleZh,
        'en-US': formValue.value.titleEn
      },
      descriptionI18n: {
        'zh-CN': formValue.value.descriptionZh,
        'en-US': formValue.value.descriptionEn
      },
      siteTimezone: normalizeUtcOffset(formValue.value.siteTimezone),
    })

    formValue.value = {
      titleZh: updated.titleI18n['zh-CN'] || '',
      titleEn: updated.titleI18n['en-US'] || '',
      descriptionZh: updated.descriptionI18n['zh-CN'] || '',
      descriptionEn: updated.descriptionI18n['en-US'] || '',
      siteTimezone: normalizeUtcOffset(updated.siteTimezone || 'UTC+8'),
    }

    message.success(t('settingsPage.siteInfo.messages.saveSuccess'))
  } catch (error) {
    message.error(t('settingsPage.siteInfo.messages.saveFailed'))
    console.error('Failed to save site info:', error)
  } finally {
    saving.value = false
  }
}

// 重置表单
function handleReset() {
  loadSiteInfo()
  message.info(t('settingsPage.siteInfo.messages.resetSuccess'))
}

onMounted(() => {
  loadSiteInfo()
})
</script>

<template>
  <div class="settings-content">
    <div class="settings-header">
      <h2>{{ title }}</h2>
    </div>
    
    <n-card>
      <n-form
        ref="formRef"
        :model="formValue"
        :rules="rules"
        :disabled="loading || saving"
        label-placement="top"
        label-width="auto"
        require-mark-placement="right-hanging"
        class="form-wrapper"
      >
        <n-form-item :label="t('settingsPage.siteInfo.siteTimezone')" path="siteTimezone">
          <n-input
            v-model:value="formValue.siteTimezone"
            :placeholder="t('settingsPage.siteInfo.siteTimezonePlaceholder')"
            clearable
          />
          <template #feedback>
            {{ t('settingsPage.siteInfo.timezoneFeedback') }}
          </template>
        </n-form-item>

        <div class="form-columns">
          <div class="form-column">
            <n-form-item :label="t('settingsPage.siteInfo.siteTitleZh')" path="titleZh">
              <n-input
                v-model:value="formValue.titleZh"
                :placeholder="t('settingsPage.siteInfo.siteTitleZhPlaceholder')"
                :maxlength="100"
                show-count
                clearable
              />
            </n-form-item>

            <n-form-item :label="t('settingsPage.siteInfo.siteDescriptionZh')" path="descriptionZh">
              <n-input
                v-model:value="formValue.descriptionZh"
                :placeholder="t('settingsPage.siteInfo.siteDescriptionZhPlaceholder')"
                type="textarea"
                :maxlength="500"
                :autosize="{
                  minRows: 4,
                  maxRows: 8
                }"
                show-count
                clearable
              />
              <template #feedback>
                {{ t('settingsPage.siteInfo.descriptionFeedback') }}
              </template>
            </n-form-item>
          </div>

          <div class="form-column">
            <n-form-item :label="t('settingsPage.siteInfo.siteTitleEn')" path="titleEn">
              <n-input
                v-model:value="formValue.titleEn"
                :placeholder="t('settingsPage.siteInfo.siteTitleEnPlaceholder')"
                :maxlength="100"
                show-count
                clearable
              />
            </n-form-item>

            <n-form-item :label="t('settingsPage.siteInfo.siteDescriptionEn')" path="descriptionEn">
              <n-input
                v-model:value="formValue.descriptionEn"
                :placeholder="t('settingsPage.siteInfo.siteDescriptionEnPlaceholder')"
                type="textarea"
                :maxlength="500"
                :autosize="{
                  minRows: 4,
                  maxRows: 8
                }"
                show-count
                clearable
              />
              <template #feedback>
                {{ t('settingsPage.siteInfo.descriptionFeedback') }}
              </template>
            </n-form-item>
          </div>
        </div>

        <div class="form-actions">
          <n-space>
            <n-button
              type="primary"
              :loading="saving"
              :disabled="loading"
              @click="handleSave"
              size="large"
            >
              {{ saving ? t('settingsPage.siteInfo.saving') : t('settingsPage.siteInfo.saveChanges') }}
            </n-button>
            <n-button
              :disabled="loading || saving"
              @click="handleReset"
              size="large"
            >
              {{ t('settingsPage.siteInfo.reset') }}
            </n-button>
          </n-space>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<style scoped lang="scss">
.settings-content {
  padding: 24px;
  max-width: 1200px;
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

.form-wrapper {
  max-width: 100%;
}

.form-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.form-column {
  min-width: 0;
}

.form-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-start;
}

@media (max-width: 900px) {
  .settings-content {
    padding: 16px;
  }

  .form-columns {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
