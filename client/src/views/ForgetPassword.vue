<template>
  <div class="forget-password-container">
    <n-card class="forget-password-card" :title="cardTitle">
      <!-- Step 1: 输入邮箱 -->
      <div v-if="currentStep === 1">
        <n-form
          ref="emailFormRef"
          :model="emailForm"
          :rules="emailRules"
          @submit.prevent="handleSendVerification"
        >
          <n-form-item path="email" :label="t('common.form.email')">
            <n-input
              v-model:value="emailForm.email"
              :placeholder="t('common.placeholder.email')"
              type="email"
              :disabled="userStore.loading"
            />
          </n-form-item>

          <n-space vertical :size="16">
            <n-button
              type="primary"
              size="large"
              :loading="userStore.loading"
              :disabled="userStore.loading"
              block
              attr-type="submit"
            >
              {{ t('auth.forgetPassword.sendCode') }}
            </n-button>

            <n-button
              text
              type="primary"
              @click="$router.push('/login')"
              :disabled="userStore.loading"
            >
              {{ t('auth.forgetPassword.backToLogin') }}
            </n-button>
          </n-space>
        </n-form>
      </div>

      <!-- Step 2: 输入验证码 -->
      <div v-if="currentStep === 2">
        <n-form
          ref="codeFormRef"
          :model="codeForm"
          :rules="codeRules"
          @submit.prevent="handleVerifyCode"
        >
          <n-form-item path="code" :label="t('common.form.verificationCode')">
            <n-input
              v-model:value="codeForm.code"
              :placeholder="t('common.placeholder.verificationCode6')"
              :maxlength="6"
              :disabled="userStore.loading"
            />
          </n-form-item>

          <n-space vertical :size="16">
            <n-button
              type="primary"
              size="large"
              :loading="userStore.loading"
              :disabled="userStore.loading"
              block
              attr-type="submit"
            >
              {{ t('auth.forgetPassword.verifyCode') }}
            </n-button>

            <n-button
              text
              type="primary"
              @click="handleResendCode"
              :disabled="userStore.loading || countdown > 0"
            >
              {{
                countdown > 0
                  ? t('auth.forgetPassword.resendWithCountdown', { seconds: countdown })
                  : t('auth.forgetPassword.resend')
              }}
            </n-button>

            <n-button
              text
              type="primary"
              @click="currentStep = 1"
              :disabled="userStore.loading"
            >
              {{ t('auth.forgetPassword.backToEmail') }}
            </n-button>
          </n-space>
        </n-form>
      </div>

      <!-- Step 3: 重置密码 -->
      <div v-if="currentStep === 3">
        <n-form
          ref="resetFormRef"
          :model="resetForm"
          :rules="resetRules"
          @submit.prevent="handleCompleteReset"
        >
          <n-form-item path="newPassword" :label="t('common.form.newPassword')">
            <n-input
              v-model:value="resetForm.newPassword"
              :placeholder="t('common.placeholder.newPassword')"
              type="password"
              show-password-on="mousedown"
              :disabled="userStore.loading"
            />
          </n-form-item>

          <n-form-item path="confirmPassword" :label="t('common.form.confirmPassword')">
            <n-input
              v-model:value="resetForm.confirmPassword"
              :placeholder="t('common.placeholder.confirmPassword')"
              type="password"
              show-password-on="mousedown"
              :disabled="userStore.loading"
            />
          </n-form-item>

          <n-space vertical :size="16">
            <n-button
              type="primary"
              size="large"
              :loading="userStore.loading"
              :disabled="userStore.loading"
              block
              attr-type="submit"
            >
              {{ t('auth.forgetPassword.resetPassword') }}
            </n-button>

            <n-button
              text
              type="primary"
              @click="currentStep = 2"
              :disabled="userStore.loading"
            >
              {{ t('auth.forgetPassword.backToCode') }}
            </n-button>
          </n-space>
        </n-form>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()
const message = useMessage()
const { t } = useI18n()

// Step state
const currentStep = ref<1 | 2 | 3>(1)
const countdown = ref(0)
let countdownTimer: NodeJS.Timeout | null = null

// Step 1: Email form
const emailFormRef = ref<FormInst | null>(null)
const emailForm = reactive({
  email: ''
})

const emailRules = computed<FormRules>(() => ({
  email: [
    { required: true, message: t('common.validation.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('common.validation.emailInvalid'), trigger: 'blur' }
  ]
}))

// Step 2: Code form
const codeFormRef = ref<FormInst | null>(null)
const codeForm = reactive({
  code: ''
})

const codeRules = computed<FormRules>(() => ({
  code: [
    { required: true, message: t('common.validation.verificationCodeRequired'), trigger: 'blur' },
    { len: 6, message: t('common.validation.verificationCodeLen'), trigger: 'blur' }
  ]
}))

// Step 3: Reset password form
const resetFormRef = ref<FormInst | null>(null)
const resetForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const resetRules = computed<FormRules>(() => ({
  newPassword: [
    { required: true, message: t('common.validation.newPasswordRequired'), trigger: 'blur' },
    { min: 6, message: t('common.validation.passwordMin'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('common.validation.confirmPasswordRequired'), trigger: 'blur' },
    {
      validator: (_rule, value) => value === resetForm.newPassword,
      message: t('common.validation.passwordNotMatch'),
      trigger: ['blur', 'input']
    }
  ]
}))

// Computed
const cardTitle = computed(() => {
  switch (currentStep.value) {
    case 1:
      return t('auth.forgetPassword.titleStep1')
    case 2:
      return t('auth.forgetPassword.titleStep2')
    case 3:
      return t('auth.forgetPassword.titleStep3')
    default:
      return t('auth.forgetPassword.titleDefault')
  }
})

// Methods
const startCountdown = (seconds: number = 60) => {
  countdown.value = seconds
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
    }
  }, 1000)
}

const handleSendVerification = async () => {
  try {
    await emailFormRef.value?.validate()

    const result = await userStore.sendResetPassword({
      email: emailForm.email
    })

    if (result.success) {
      message.success(t('auth.forgetPassword.sent'))
      const debugCode = result.data?.debugCode
      if (debugCode) {
        message.info(t('auth.forgetPassword.debugCode', { code: debugCode }))
      }
      startCountdown(60)
      currentStep.value = 2
    } else {
      message.error(result.error || t('auth.forgetPassword.sendFailed'))
    }
  } catch (error) {
    message.error(t('common.validation.checkFormInput'))
  }
}

const handleVerifyCode = async () => {
  try {
    await codeFormRef.value?.validate()

    const result = await userStore.verifyCode({
      email: emailForm.email,
      code: codeForm.code
    })

    if (result.success) {
      message.success(t('auth.forgetPassword.verifySuccess'))
      currentStep.value = 3
    } else {
      message.error(result.error || t('auth.forgetPassword.verifyFailed'))
    }
  } catch (error) {
    message.error(t('common.validation.checkFormInput'))
  }
}

const handleResendCode = async () => {
  if (countdown.value > 0) return

  const result = await userStore.sendResetPassword({
    email: emailForm.email
  })

  if (result.success) {
    message.success(t('auth.forgetPassword.resent'))
    const debugCode = result.data?.debugCode
    if (debugCode) {
      message.info(t('auth.forgetPassword.debugCode', { code: debugCode }))
    }
    startCountdown(60)
  } else {
    message.error(result.error || t('auth.forgetPassword.sendFailed'))
  }
}

const handleCompleteReset = async () => {
  try {
    await resetFormRef.value?.validate()

    const result = await userStore.resetPassword({
      email: emailForm.email,
      verificationCode: codeForm.code,
      newPassword: resetForm.newPassword
    })

    if (result.success) {
      message.success(t('auth.forgetPassword.resetSuccess'))
      router.push('/login')
    } else {
      message.error(result.error || t('auth.forgetPassword.resetFailed'))
    }
  } catch (error) {
    message.error(t('common.validation.checkFormInput'))
  }
}

// Cleanup countdown timer on unmount
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.forget-password-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--color-bg-primary);
  padding: 20px;

  @media (max-width: 480px) {
    padding: 12px;
  }
}

.forget-password-card {
  width: 100%;
  max-width: 400px;
  box-shadow: $ios-shadow-2;
  border-radius: $ios-border-radius-xl;
  background-color: var(--color-bg-secondary);
  border: none;

  :deep(.n-card-header) {
    text-align: center;
    font-weight: 600;
    font-size: 20px;
    color: var(--color-text-primary);
  }

  :deep(.n-card__content) {
    padding: 32px 24px;
    
    @media (max-width: 480px) {
      padding: 24px 16px;
    }
  }
}
</style>
