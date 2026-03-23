<template>
  <div class="setup-container">
    <n-card class="setup-card" :title="t('auth.setup.title')">
      <template #header-extra>
        <div class="header-toolbar">
          <n-button-group size="small" class="locale-switch" :aria-label="t('locale.switchLanguage')">
            <n-button
              :type="locale === 'zh-CN' ? 'primary' : 'default'"
              ghost
              @click="setLocale('zh-CN')"
            >
              中
            </n-button>
            <n-button
              :type="locale === 'en-US' ? 'primary' : 'default'"
              ghost
              @click="setLocale('en-US')"
            >
              EN
            </n-button>
          </n-button-group>

          <n-button
            quaternary
            circle
            class="theme-toggle"
            :title="isDark ? t('topNav.switchToLight') : t('topNav.switchToDark')"
            @click="toggleTheme"
          >
            <template #icon>
              <n-icon>
                <sunny-outline v-if="isDark" />
                <moon-outline v-else />
              </n-icon>
            </template>
          </n-button>
        </div>
      </template>

      <n-space vertical :size="16">
        <n-alert type="info" :show-icon="false">
          <template #default>
            {{ t('auth.setup.subtitle') }}
          </template>
        </n-alert>

        <n-spin :show="checkingSetup">
          <n-steps :current="currentStep" size="small" class="setup-steps">
            <n-step :title="t('auth.setup.steps.site')" />
            <n-step :title="t('auth.setup.steps.admin')" />
            <n-step :title="t('auth.setup.steps.confirm')" />
          </n-steps>

          <n-form
            ref="formRef"
            :model="formValue"
            :rules="rules"
            @submit.prevent="handleSubmit"
          >
            <template v-if="currentStep === 1">
              <div class="section-title">{{ t('auth.setup.sections.site') }}</div>

              <div class="site-locale-grid">
                <div>
                  <div class="locale-subtitle">{{ t('auth.setup.languages.zh') }}</div>
                  <n-form-item path="siteTitleZh" :label="t('auth.setup.fields.siteTitleZh')">
                    <n-input
                      v-model:value="formValue.siteTitleZh"
                      :placeholder="t('auth.setup.placeholders.siteTitleZh')"
                      :disabled="submitting"
                    />
                  </n-form-item>

                  <n-form-item path="siteDescriptionZh" :label="t('auth.setup.fields.siteDescriptionZh')">
                    <n-input
                      v-model:value="formValue.siteDescriptionZh"
                      type="textarea"
                      :autosize="{ minRows: 3, maxRows: 6 }"
                      :placeholder="t('auth.setup.placeholders.siteDescriptionZh')"
                      :disabled="submitting"
                    />
                  </n-form-item>
                </div>

                <div>
                  <div class="locale-subtitle">{{ t('auth.setup.languages.en') }}</div>
                  <n-form-item path="siteTitleEn" :label="t('auth.setup.fields.siteTitleEn')">
                    <n-input
                      v-model:value="formValue.siteTitleEn"
                      :placeholder="t('auth.setup.placeholders.siteTitleEn')"
                      :disabled="submitting"
                    />
                  </n-form-item>

                  <n-form-item path="siteDescriptionEn" :label="t('auth.setup.fields.siteDescriptionEn')">
                    <n-input
                      v-model:value="formValue.siteDescriptionEn"
                      type="textarea"
                      :autosize="{ minRows: 3, maxRows: 6 }"
                      :placeholder="t('auth.setup.placeholders.siteDescriptionEn')"
                      :disabled="submitting"
                    />
                  </n-form-item>
                </div>
              </div>

              <n-form-item path="siteTimezone" :label="t('auth.setup.fields.siteTimezone')">
                <n-input
                  v-model:value="formValue.siteTimezone"
                  :placeholder="t('auth.setup.placeholders.siteTimezone')"
                  :disabled="submitting"
                />
              </n-form-item>
            </template>

            <template v-else-if="currentStep === 2">
              <div class="section-title">{{ t('auth.setup.sections.admin') }}</div>

              <n-form-item path="adminEmail" :label="t('auth.setup.fields.adminEmail')">
                <n-input
                  v-model:value="formValue.adminEmail"
                  :placeholder="t('common.placeholder.email')"
                  type="email"
                  :disabled="submitting"
                />
              </n-form-item>

              <n-form-item path="adminDisplayName" :label="t('auth.setup.fields.adminDisplayName')">
                <n-input
                  v-model:value="formValue.adminDisplayName"
                  :placeholder="t('common.placeholder.displayNameOptional')"
                  :disabled="submitting"
                />
              </n-form-item>

              <n-form-item path="adminPassword" :label="t('auth.setup.fields.adminPassword')">
                <n-input
                  v-model:value="formValue.adminPassword"
                  :placeholder="t('common.placeholder.password')"
                  type="password"
                  show-password-on="mousedown"
                  :disabled="submitting"
                />
              </n-form-item>

              <n-form-item path="confirmPassword" :label="t('common.form.confirmPassword')">
                <n-input
                  v-model:value="formValue.confirmPassword"
                  :placeholder="t('common.placeholder.confirmPassword')"
                  type="password"
                  show-password-on="mousedown"
                  :disabled="submitting"
                />
              </n-form-item>
            </template>

            <template v-else>
              <div class="section-title">{{ t('auth.setup.steps.confirm') }}</div>
              <n-alert type="warning" :show-icon="false" class="confirm-alert">
                {{ t('auth.setup.confirmHint') }}
              </n-alert>

              <div class="review-section">
                <div class="review-section-header">
                  <div class="review-section-title">{{ t('auth.setup.sections.site') }}</div>
                  <div class="review-section-meta">
                    <span class="review-meta-label">{{ t('auth.setup.fields.siteTimezone') }}</span>
                    <span class="review-meta-value">{{ formValue.siteTimezone }}</span>
                  </div>
                </div>

                <div class="review-grid">
                  <div class="review-item">
                    <div class="review-label">{{ t('auth.setup.fields.siteTitleZh') }}</div>
                    <div class="review-value">{{ formValue.siteTitleZh }}</div>
                  </div>
                  <div class="review-item">
                    <div class="review-label">{{ t('auth.setup.fields.siteDescriptionZh') }}</div>
                    <div class="review-value">{{ formValue.siteDescriptionZh }}</div>
                  </div>
                  <div class="review-item">
                    <div class="review-label">{{ t('auth.setup.fields.siteTitleEn') }}</div>
                    <div class="review-value">{{ formValue.siteTitleEn }}</div>
                  </div>
                  <div class="review-item">
                    <div class="review-label">{{ t('auth.setup.fields.siteDescriptionEn') }}</div>
                    <div class="review-value">{{ formValue.siteDescriptionEn }}</div>
                  </div>
                </div>
              </div>

              <div class="review-section">
                <div class="review-section-header">
                  <div class="review-section-title">{{ t('auth.setup.sections.admin') }}</div>
                </div>
                <div class="review-grid review-grid--admin">
                  <div class="review-item">
                    <div class="review-label">{{ t('auth.setup.fields.adminEmail') }}</div>
                    <div class="review-value">{{ formValue.adminEmail }}</div>
                  </div>
                  <div class="review-item">
                    <div class="review-label">{{ t('auth.setup.fields.adminDisplayName') }}</div>
                    <div class="review-value">{{ formValue.adminDisplayName || t('auth.setup.review.notSet') }}</div>
                  </div>
                </div>
              </div>
            </template>

            <n-space :size="12" justify="space-between" class="wizard-actions">
              <n-button
                v-if="currentStep > 1"
                size="large"
                :disabled="submitting || checkingSetup"
                @click="handlePreviousStep"
              >
                {{ t('auth.setup.actions.previous') }}
              </n-button>
              <div v-else class="action-placeholder" />

              <n-button
                size="large"
                :disabled="submitting || checkingSetup"
                @click="handleNextStep"
                v-if="currentStep < 3"
                type="primary"
              >
                {{ t('auth.setup.actions.next') }}
              </n-button>

              <n-button
                v-else
                type="primary"
                size="large"
                attr-type="submit"
                :loading="submitting"
                :disabled="submitting || checkingSetup"
              >
                {{ t('auth.setup.submit') }}
              </n-button>
            </n-space>
          </n-form>
        </n-spin>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5'
import { systemApi } from '@/api/system'
import { useUserStore } from '@/stores/user'
import { useLocale } from '@/composables/useLocale'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const { locale, setLocale } = useLocale()
const { isDark, toggleTheme } = useTheme()
const message = useMessage()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInst | null>(null)
const checkingSetup = ref(true)
const initializing = ref(false)
const submitting = computed(() => userStore.loading || initializing.value)
const currentStep = ref(1)
const timezoneRegex = /^UTC\s*[+-]\s*\d{1,2}(?::?\s*\d{2})?$/i

const DEFAULT_SITE_SETUP = {
  titleZh: '知枢 - KnowHub',
  descriptionZh: '一个面向团队与组织的结构化知识协作系统。',
  titleEn: 'KnowHub',
  descriptionEn: 'A collaborative knowledge hub designed for individuals, teams, and organizations.',
}

const formValue = reactive({
  siteTitleZh: DEFAULT_SITE_SETUP.titleZh,
  siteDescriptionZh: DEFAULT_SITE_SETUP.descriptionZh,
  siteTitleEn: DEFAULT_SITE_SETUP.titleEn,
  siteDescriptionEn: DEFAULT_SITE_SETUP.descriptionEn,
  siteTimezone: 'UTC+8',
  adminEmail: '',
  adminDisplayName: '',
  adminPassword: '',
  confirmPassword: '',
})

const rules = computed<FormRules>(() => ({
  siteTitleZh: [
    { required: true, message: t('auth.setup.validation.siteTitleZhRequired'), trigger: 'blur' },
  ],
  siteTitleEn: [
    { required: true, message: t('auth.setup.validation.siteTitleEnRequired'), trigger: 'blur' },
  ],
  siteTimezone: [
    { required: true, message: t('auth.setup.validation.siteTimezoneRequired'), trigger: 'blur' },
    {
      validator: (_rule, value: string) => timezoneRegex.test(value?.trim() || ''),
      message: t('auth.setup.validation.siteTimezoneInvalid'),
      trigger: 'blur',
    },
  ],
  adminEmail: [
    { required: true, message: t('common.validation.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('common.validation.emailInvalid'), trigger: 'blur' },
  ],
  adminPassword: [
    { required: true, message: t('common.validation.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('common.validation.passwordMin'), trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: t('common.validation.confirmPasswordRequired'), trigger: 'blur' },
    {
      validator: (_rule, value: string) => value === formValue.adminPassword,
      message: t('common.validation.passwordNotMatch'),
      trigger: 'blur',
    },
  ],
}))

const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const validateSiteStep = () => {
  if (!formValue.siteTitleZh.trim()) {
    message.error(t('auth.setup.validation.siteTitleZhRequired'))
    return false
  }
  if (!formValue.siteTitleEn.trim()) {
    message.error(t('auth.setup.validation.siteTitleEnRequired'))
    return false
  }
  if (!formValue.siteTimezone.trim()) {
    message.error(t('auth.setup.validation.siteTimezoneRequired'))
    return false
  }
  if (!timezoneRegex.test(formValue.siteTimezone.trim())) {
    message.error(t('auth.setup.validation.siteTimezoneInvalid'))
    return false
  }
  return true
}

const validateAdminStep = () => {
  const email = formValue.adminEmail.trim()
  if (!email) {
    message.error(t('common.validation.emailRequired'))
    return false
  }
  if (!isEmailValid(email)) {
    message.error(t('common.validation.emailInvalid'))
    return false
  }
  if (!formValue.adminPassword) {
    message.error(t('common.validation.passwordRequired'))
    return false
  }
  if (formValue.adminPassword.length < 6) {
    message.error(t('common.validation.passwordMin'))
    return false
  }
  if (!formValue.confirmPassword) {
    message.error(t('common.validation.confirmPasswordRequired'))
    return false
  }
  if (formValue.confirmPassword !== formValue.adminPassword) {
    message.error(t('common.validation.passwordNotMatch'))
    return false
  }

  return true
}

const handleNextStep = () => {
  if (currentStep.value === 1 && !validateSiteStep()) {
    return
  }
  if (currentStep.value === 2 && !validateAdminStep()) {
    return
  }
  currentStep.value = Math.min(3, currentStep.value + 1)
}

const handlePreviousStep = () => {
  currentStep.value = Math.max(1, currentStep.value - 1)
}

const checkSetupStatus = async () => {
  checkingSetup.value = true
  try {
    const response = await systemApi.getSetupStatus()
    if (response.code === 0 && !response.data.needsSetup) {
      await router.replace(userStore.isAuthenticated ? '/home' : '/login')
    }
  } catch (error) {
    console.error('Failed to fetch setup status:', error)
  } finally {
    checkingSetup.value = false
  }
}

const handleSubmit = async () => {
  try {
    if (currentStep.value < 3) {
      handleNextStep()
      return
    }

    await formRef.value?.validate()
    initializing.value = true
    const normalizedAdminEmail = formValue.adminEmail.trim().toLowerCase()
    const siteTitleZh = formValue.siteTitleZh.trim() || DEFAULT_SITE_SETUP.titleZh
    const siteDescriptionZh = formValue.siteDescriptionZh.trim() || DEFAULT_SITE_SETUP.descriptionZh
    const siteTitleEn = formValue.siteTitleEn.trim() || DEFAULT_SITE_SETUP.titleEn
    const siteDescriptionEn = formValue.siteDescriptionEn.trim() || DEFAULT_SITE_SETUP.descriptionEn

    const setupResponse = await systemApi.initializeSystem({
      siteTitleI18n: {
        'zh-CN': siteTitleZh,
        'en-US': siteTitleEn,
      },
      siteDescriptionI18n: {
        'zh-CN': siteDescriptionZh,
        'en-US': siteDescriptionEn,
      },
      siteTimezone: formValue.siteTimezone.trim(),
      adminEmail: normalizedAdminEmail,
      adminDisplayName: formValue.adminDisplayName.trim() || undefined,
      adminPassword: formValue.adminPassword,
    })

    if (setupResponse.code !== 0) {
      message.error(t('auth.setup.failed'))
      return
    }

    message.success(t('auth.setup.success'))

    const loginResult = await userStore.login({
      email: normalizedAdminEmail,
      password: formValue.adminPassword,
    })

    if (loginResult.success) {
      const redirect = (route.query.redirect as string) || '/home'
      await router.replace(redirect === '/setup' ? '/home' : redirect)
      return
    }

    message.warning(t('auth.setup.loginAfterSetup'))
    await router.replace('/login')
  } catch (error: any) {
    message.error(error?.response?.data?.message || t('auth.setup.failed'))
  } finally {
    initializing.value = false
  }
}

onMounted(() => {
  checkSetupStatus()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: var(--color-bg-primary);

  @media (max-width: 480px) {
    padding: 12px;
  }
}

.setup-card {
  width: 100%;
  max-width: 900px;
  box-shadow: $ios-shadow-2;
  border-radius: $ios-border-radius-xl;
  background-color: var(--color-bg-secondary);
  border: none;

  :deep(.n-card-header) {
    position: relative;
    text-align: center;
    font-weight: 600;
    font-size: 20px;
    color: var(--color-text-primary);
    justify-content: center;
  }

  :deep(.n-card-header__main) {
    margin: 0 auto;
    text-align: center;
  }

  :deep(.n-card-header__extra) {
    position: absolute;
    left: 24px;
    right: 24px;
    top: 50%;
    transform: translateY(-50%);
    width: calc(100% - 48px);
  }

  :deep(.n-card__content) {
    padding: 28px 24px;

    @media (max-width: 480px) {
      padding: 22px 16px;
    }
  }
}

.setup-steps {
  width: 100%;
  margin: 0 auto 20px;
  display: flex;
  justify-content: center;

  :deep(.n-step) {
    flex: 0 0 auto;
  }

  :deep(.n-step-splitor) {
    flex: 0 0 170px;
    width: 170px;
  }

  @media (max-width: 860px) {
    :deep(.n-step-splitor) {
      flex-basis: 84px;
      width: 84px;
    }
  }
}

.section-title {
  margin: 6px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.locale-subtitle {
  margin: 4px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.site-locale-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

.confirm-alert {
  margin-bottom: 12px;
}

.review-section {
  margin-bottom: 14px;
}

.review-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 10px;

  @media (max-width: 860px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}

.review-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.review-section-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background-color: var(--color-bg-tertiary);
}

.review-meta-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.review-meta-value {
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 700;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}

.review-grid--admin {
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}

.review-item {
  background-color: var(--color-bg-tertiary);
  border-radius: $ios-border-radius-m;
  padding: 10px 12px;
}

.review-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 4px;
}

.review-value {
  font-size: 14px;
  color: var(--color-text-primary);
  word-break: break-word;
  white-space: pre-wrap;
}

.wizard-actions {
  margin-top: 12px;
}

.action-placeholder {
  width: 88px;
}

.locale-switch {
  :deep(.n-button) {
    min-width: 44px;
  }

  @media (max-width: 480px) {
    :deep(.n-button) {
      min-width: 40px;
    }
  }
}

.header-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
</style>
