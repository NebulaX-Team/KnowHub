<script setup lang="ts">
import { ref, reactive, computed, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useSystemStore } from '@/stores/system'
import { userApi } from '@/api/user'
import { formatDateByOffset } from '@/utils/datetime'
import {
  useMessage,
  useDialog,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NCard,
  NAlert,
  NDescriptions,
  NDescriptionsItem,
  type FormRules,
  type FormInst
} from 'naive-ui'

const userStore = useUserStore()
const systemStore = useSystemStore()
const message = useMessage()
const dialog = useDialog()
const router = useRouter()
const { t, locale } = useI18n()

// ---- Change Password ----
const passwordFormRef = ref<FormInst | null>(null)
const passwordLoading = ref(false)
const passwordModel = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordRules = computed<FormRules>(() => ({
  currentPassword: [
    { required: true, message: t('settingsPage.security.validation.currentPasswordRequired'), trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: t('settingsPage.security.validation.newPasswordRequired'), trigger: 'blur' },
    { min: 6, max: 50, message: t('settingsPage.security.validation.newPasswordLength'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('settingsPage.security.validation.confirmPasswordRequired'), trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (value !== passwordModel.newPassword) {
          return new Error(t('settingsPage.security.validation.passwordNotMatch'))
        }
        return true
      },
      trigger: 'blur'
    }
  ]
}))

async function handleChangePassword() {
  try {
    await passwordFormRef.value?.validate()
  } catch {
    return
  }

  passwordLoading.value = true
  try {
    const response = await userApi.changePassword({
      currentPassword: passwordModel.currentPassword,
      newPassword: passwordModel.newPassword
    })
    if (response.code === 0) {
      message.success(t('settingsPage.security.passwordChanged'))
      passwordModel.currentPassword = ''
      passwordModel.newPassword = ''
      passwordModel.confirmPassword = ''
    }
  } catch (error: any) {
    message.error(error.response?.data?.message || t('settingsPage.security.changePasswordFailed'))
  } finally {
    passwordLoading.value = false
  }
}

// ---- Account Info ----
const accountEmail = computed(() => userStore.user?.email || '')
const accountCreated = computed(() => {
  if (!userStore.user?.createdAt) return '-'
  return formatDateByOffset(userStore.user.createdAt, systemStore.siteTimezone, locale.value)
})

// ---- Delete Account ----
const deletePassword = ref('')
const deleteLoading = ref(false)

function handleDeleteAccount() {
  dialog.warning({
    title: t('settingsPage.security.deleteDialog.title'),
    content: t('settingsPage.security.deleteDialog.content'),
    positiveText: t('settingsPage.security.deleteDialog.positiveText'),
    negativeText: t('common.actions.cancel'),
    positiveButtonProps: { type: 'error' },
    onPositiveClick: () => {
      showDeleteConfirm()
    }
  })
}

function showDeleteConfirm() {
  dialog.error({
    title: t('settingsPage.security.confirmDialog.title'),
    content: () =>
      h('div', { style: 'margin-top: 8px' }, [
        h('p', { style: 'margin-bottom: 12px; color: var(--n-text-color)' }, t('settingsPage.security.confirmDialog.passwordPrompt')),
        h(NInput, {
          type: 'password',
          showPasswordOn: 'click',
          placeholder: t('settingsPage.security.confirmDialog.passwordPlaceholder'),
          value: deletePassword.value,
          onUpdateValue: (v: string) => { deletePassword.value = v }
        })
      ]),
    positiveText: t('settingsPage.security.confirmDialog.positiveText'),
    negativeText: t('common.actions.cancel'),
    positiveButtonProps: { type: 'error', loading: deleteLoading.value },
    onPositiveClick: async () => {
      if (!deletePassword.value) {
        message.warning(t('settingsPage.security.passwordRequiredForDelete'))
        return false
      }
      deleteLoading.value = true
      try {
        const response = await userApi.deleteAccount(deletePassword.value)
        if (response.code === 0) {
          message.success(t('settingsPage.security.deleteSuccess'))
          userStore.logout()
          router.push('/login')
        }
      } catch (error: any) {
        message.error(error.response?.data?.message || t('settingsPage.security.deleteFailed'))
        return false
      } finally {
        deleteLoading.value = false
        deletePassword.value = ''
      }
    },
    onNegativeClick: () => {
      deletePassword.value = ''
    }
  })
}

onMounted(async () => {
  if (userStore.isAuthenticated && !userStore.user?.createdAt) {
    await userStore.fetchProfile()
  }
})
</script>

<template>
  <div class="settings-content">
    <div class="settings-header">
      <h2>{{ t('settingsPage.security.title') }}</h2>
    </div>

    <!-- Change Password -->
    <n-card :title="t('settingsPage.security.changePassword')" class="section-card">
      <n-form
        ref="passwordFormRef"
        :model="passwordModel"
        :rules="passwordRules"
        label-placement="top"
        class="form-wrapper"
      >
        <n-form-item :label="t('settingsPage.security.currentPassword')" path="currentPassword">
          <n-input
            v-model:value="passwordModel.currentPassword"
            type="password"
            show-password-on="click"
            :placeholder="t('settingsPage.security.currentPasswordPlaceholder')"
          />
        </n-form-item>

        <n-form-item :label="t('settingsPage.security.newPassword')" path="newPassword">
          <n-input
            v-model:value="passwordModel.newPassword"
            type="password"
            show-password-on="click"
            :placeholder="t('settingsPage.security.newPasswordPlaceholder')"
          />
        </n-form-item>

        <n-form-item :label="t('settingsPage.security.confirmNewPassword')" path="confirmPassword">
          <n-input
            v-model:value="passwordModel.confirmPassword"
            type="password"
            show-password-on="click"
            :placeholder="t('settingsPage.security.confirmNewPasswordPlaceholder')"
          />
        </n-form-item>

        <div class="form-actions">
          <n-button
            type="primary"
            :loading="passwordLoading"
            @click="handleChangePassword"
            size="large"
          >
            {{ t('settingsPage.security.updatePassword') }}
          </n-button>
        </div>
      </n-form>
    </n-card>

    <!-- Account Information -->
    <n-card :title="t('settingsPage.security.accountInfo')" class="section-card">
      <n-descriptions label-placement="left" bordered :column="1">
        <n-descriptions-item :label="t('common.form.email')">
          {{ accountEmail }}
        </n-descriptions-item>
        <n-descriptions-item :label="t('settingsPage.security.accountCreated')">
          {{ accountCreated }}
        </n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- Danger Zone -->
    <n-card class="section-card danger-zone">
      <template #header>
        <span class="danger-title">{{ t('settingsPage.security.dangerZone') }}</span>
      </template>
      <n-alert type="error" :bordered="false">
        <p style="margin: 0 0 4px 0; font-weight: 500;">{{ t('settingsPage.security.deleteAccount') }}</p>
        <p style="margin: 0 0 12px 0;">{{ t('settingsPage.security.dangerDescription') }}</p>
        <n-button type="error" ghost @click="handleDeleteAccount">
          {{ t('settingsPage.security.deleteAccount') }}
        </n-button>
      </n-alert>
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

.section-card {
  margin-bottom: 24px;
}

.form-wrapper {
  max-width: 600px;
}

.form-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-start;
}

.danger-zone {
  :deep(.n-card-header) {
    padding-bottom: 12px;
  }
}

.danger-title {
  color: #e03e3e;
  font-weight: 600;
}
</style>
