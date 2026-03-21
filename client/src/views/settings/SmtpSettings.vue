<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSwitch,
  NButton,
  NTabs,
  NTabPane,
  NCard,
  NSpace
} from 'naive-ui'
import { systemApi, type SmtpConfig } from '@/api/system'

const route = useRoute()
const message = useMessage()
const { t } = useI18n()
const loading = ref(false)
const testing = ref(false)
const testEmail = ref('')

const title = computed(() => {
  const titleKey = route.meta.titleKey as string | undefined
  if (titleKey) {
    return t(titleKey)
  }
  return (route.meta.title as string) || t('settingsPage.smtp.defaultTitle')
})

function createDefaultFormValue(): SmtpConfig {
  return {
    host: '',
    port: 465,
    user: '',
    pass: '',
    from: '',
    secure: true,
    registerSubject: t('settingsPage.smtp.defaults.registerSubject'),
    registerTemplate: t('settingsPage.smtp.defaults.registerTemplate'),
    resetPasswordSubject: t('settingsPage.smtp.defaults.resetPasswordSubject'),
    resetPasswordTemplate: t('settingsPage.smtp.defaults.resetPasswordTemplate')
  }
}

const formValue = ref<SmtpConfig>(createDefaultFormValue())

import type { FormRules } from 'naive-ui'

const rules = computed<FormRules>(() => ({
  host: { required: true, message: t('settingsPage.smtp.validation.hostRequired'), trigger: 'blur' },
  port: { required: true, type: 'number', message: t('settingsPage.smtp.validation.portRequired'), trigger: 'blur' },
  user: { required: true, message: t('settingsPage.smtp.validation.userRequired'), trigger: 'blur' },
  pass: { required: true, message: t('settingsPage.smtp.validation.passRequired'), trigger: 'blur' },
  from: { required: true, message: t('settingsPage.smtp.validation.fromRequired'), trigger: 'blur' }
}))

async function fetchData() {
  loading.value = true
  try {
    const { data } = await systemApi.getSmtpConfig()
    if (Object.keys(data).length > 0) {
      formValue.value = { ...createDefaultFormValue(), ...data }
    }
  } catch (error) {
    message.error(t('settingsPage.smtp.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  loading.value = true
  try {
    await systemApi.updateSmtpConfig(formValue.value)
    message.success(t('settingsPage.smtp.messages.saveSuccess'))
  } catch (error) {
    message.error(t('settingsPage.smtp.messages.saveFailed'))
  } finally {
    loading.value = false
  }
}

async function handleTest() {
  if (!testEmail.value) {
    message.warning(t('settingsPage.smtp.messages.testEmailRequired'))
    return
  }
  testing.value = true
  try {
    const testConfig = {
      host: formValue.value.host || '',
      port: formValue.value.port || 465,
      user: formValue.value.user || '',
      pass: formValue.value.pass || '',
      from: formValue.value.from || '',
      secure: formValue.value.secure ?? true,
      testEmail: testEmail.value
    }
    const response = await systemApi.testSmtpConnection(testConfig)
    message.success(response.data.message || t('settingsPage.smtp.messages.connectionSuccess'))
  } catch (error: any) {
    const msg = error.response?.data?.message || error.message || t('settingsPage.smtp.messages.connectionFailed')
    message.error(Array.isArray(msg) ? msg[0] : msg)
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="settings-content">
    <div class="settings-header">
      <h2>{{ title }}</h2>
    </div>
    <n-card :bordered="false">
      <n-tabs type="line" animated>
        <n-tab-pane name="server" :tab="t('settingsPage.smtp.tabs.server')">
          <n-form
            ref="formRef"
            :model="formValue"
            :rules="rules"
            label-placement="left"
            label-width="120"
            style="max-width: 600px"
          >
            <n-form-item :label="t('settingsPage.smtp.form.host')" path="host">
              <n-input v-model:value="formValue.host" :placeholder="t('settingsPage.smtp.placeholders.host')" />
            </n-form-item>
            <n-form-item :label="t('settingsPage.smtp.form.port')" path="port">
              <n-input-number v-model:value="formValue.port" :placeholder="t('settingsPage.smtp.placeholders.port')" />
            </n-form-item>
            <n-form-item :label="t('settingsPage.smtp.form.user')" path="user">
              <n-input v-model:value="formValue.user" :placeholder="t('settingsPage.smtp.placeholders.user')" />
            </n-form-item>
            <n-form-item :label="t('settingsPage.smtp.form.pass')" path="pass">
              <n-input
                v-model:value="formValue.pass"
                type="password"
                show-password-on="click"
                :placeholder="t('settingsPage.smtp.placeholders.pass')"
              />
            </n-form-item>
            <n-form-item :label="t('settingsPage.smtp.form.from')" path="from">
              <n-input v-model:value="formValue.from" :placeholder="t('settingsPage.smtp.placeholders.from')" />
            </n-form-item>
            <n-form-item :label="t('settingsPage.smtp.form.secure')" path="secure">
              <n-switch v-model:value="formValue.secure" />
            </n-form-item>
            <n-form-item :label="t('settingsPage.smtp.form.testEmail')" path="testEmail">
              <n-input v-model:value="testEmail" :placeholder="t('settingsPage.smtp.placeholders.testEmail')" />
            </n-form-item>
            <n-form-item>
              <n-space>
                <n-button type="primary" @click="handleSave" :loading="loading">{{ t('settingsPage.smtp.buttons.save') }}</n-button>
                <n-button @click="handleTest" :loading="testing">{{ t('settingsPage.smtp.buttons.test') }}</n-button>
              </n-space>
            </n-form-item>
          </n-form>
        </n-tab-pane>
        <n-tab-pane name="templates" :tab="t('settingsPage.smtp.tabs.templates')">
          <n-form
            :model="formValue"
            label-placement="top"
            style="max-width: 800px"
          >
            <n-card :title="t('settingsPage.smtp.cards.registration')" size="small" style="margin-bottom: 24px">
              <n-form-item :label="t('settingsPage.smtp.form.registerSubject')" path="registerSubject">
                <n-input v-model:value="formValue.registerSubject" />
              </n-form-item>
              <n-form-item :label="t('settingsPage.smtp.form.registerTemplate')" path="registerTemplate">
                <n-input
                  v-model:value="formValue.registerTemplate"
                  type="textarea"
                  :rows="6"
                  :placeholder="t('settingsPage.smtp.placeholders.templateCodeHint')"
                />
              </n-form-item>
            </n-card>

            <n-card :title="t('settingsPage.smtp.cards.resetPassword')" size="small">
              <n-form-item :label="t('settingsPage.smtp.form.resetPasswordSubject')" path="resetPasswordSubject">
                <n-input v-model:value="formValue.resetPasswordSubject" />
              </n-form-item>
              <n-form-item :label="t('settingsPage.smtp.form.resetPasswordTemplate')" path="resetPasswordTemplate">
                <n-input
                  v-model:value="formValue.resetPasswordTemplate"
                  type="textarea"
                  :rows="6"
                  :placeholder="t('settingsPage.smtp.placeholders.templateCodeHint')"
                />
              </n-form-item>
            </n-card>
            
            <div style="margin-top: 24px">
              <n-button type="primary" @click="handleSave" :loading="loading">{{ t('settingsPage.smtp.buttons.saveTemplates') }}</n-button>
            </div>
          </n-form>
        </n-tab-pane>
      </n-tabs>
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
