<template>
  <div class="register-container">
    <n-card class="register-card" :title="cardTitle">
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

	          <n-alert v-if="!registrationEnabled" type="warning" style="margin-bottom: 16px;">
	            {{ t('auth.register.closed') }}
	          </n-alert>

	          <n-space vertical :size="16">
	            <n-button
	              type="primary"
	              size="large"
	              :loading="userStore.loading"
	              :disabled="userStore.loading || accessLoading || !registrationEnabled"
	              block
	              attr-type="submit"
	            >
              {{ t('auth.register.verifyEmail') }}
            </n-button>

            <n-button
              text
              type="primary"
              @click="$router.push('/login')"
              :disabled="userStore.loading"
            >
              {{ t('auth.register.goLogin') }}
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
              {{ t('auth.register.verifyCode') }}
            </n-button>

            <n-button
              text
              type="primary"
              @click="handleResendCode"
              :disabled="userStore.loading || countdown > 0"
            >
              {{
                countdown > 0
                  ? t('auth.register.resendWithCountdown', { seconds: countdown })
                  : t('auth.register.resend')
              }}
            </n-button>

            <n-button
              text
              type="primary"
              @click="currentStep = 1"
              :disabled="userStore.loading"
            >
              {{ t('auth.register.backToEmail') }}
            </n-button>
          </n-space>
        </n-form>
      </div>

      <!-- Step 3: 完成注册 -->
      <div v-if="currentStep === 3">
        <n-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          @submit.prevent="handleCompleteRegister"
        >
          <n-form-item path="displayName" :label="t('common.form.displayName')">
            <n-input
              v-model:value="registerForm.displayName"
              :placeholder="t('common.placeholder.displayNameOptional')"
              :disabled="userStore.loading"
            />
          </n-form-item>

          <n-form-item path="password" :label="t('common.form.password')">
            <n-input
              v-model:value="registerForm.password"
              :placeholder="t('common.placeholder.password')"
              type="password"
              show-password-on="mousedown"
              :disabled="userStore.loading"
            />
          </n-form-item>

          <n-form-item path="confirmPassword" :label="t('common.form.confirmPassword')">
            <n-input
              v-model:value="registerForm.confirmPassword"
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
              {{ t('auth.register.complete') }}
            </n-button>

            <n-button
              text
              type="primary"
              @click="currentStep = 2"
              :disabled="userStore.loading"
            >
              {{ t('auth.register.backToCode') }}
            </n-button>
          </n-space>
        </n-form>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { systemApi, type AccessConfig } from '@/api/system'

const userStore = useUserStore()
const router = useRouter()
const message = useMessage()
const { t } = useI18n()

// Step state
const currentStep = ref<1 | 2 | 3>(1)
const countdown = ref(0)
let countdownTimer: NodeJS.Timeout | null = null
const accessLoading = ref(false)
const accessConfig = ref<AccessConfig>({
  allowRegistration: true,
  allowPasswordReset: true,
})

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

// Step 3: Register form
const registerFormRef = ref<FormInst | null>(null)
const registerForm = reactive({
  displayName: '',
  password: '',
  confirmPassword: ''
})

const registerRules = computed<FormRules>(() => ({
  password: [
    { required: true, message: t('common.validation.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('common.validation.passwordMin'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('common.validation.confirmPasswordRequired'), trigger: 'blur' },
    {
      validator: (_rule, value) => value === registerForm.password,
      message: t('common.validation.passwordNotMatch'),
      trigger: ['blur', 'input']
    }
  ]
}))

// Computed
const cardTitle = computed(() => {
  switch (currentStep.value) {
    case 1:
      return t('auth.register.titleStep1')
    case 2:
      return t('auth.register.titleStep2')
    case 3:
      return t('auth.register.titleStep3')
    default:
      return t('auth.register.titleDefault')
  }
})

const registrationEnabled = computed(() => accessConfig.value.allowRegistration)

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
  if (!registrationEnabled.value) {
    message.warning(t('auth.register.closed'))
    return
  }

  try {
    await emailFormRef.value?.validate()

    const result = await userStore.sendVerification({
      email: emailForm.email
    })

    if (result.success) {
      message.success(t('auth.register.sent'))
      const debugCode = result.data?.debugCode
      if (debugCode) {
        message.info(t('auth.register.debugCode', { code: debugCode }))
      }
      startCountdown(60)
      currentStep.value = 2
    } else {
      message.error(result.error || t('auth.register.sendFailed'))
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
      message.success(t('auth.register.verifySuccess'))
      currentStep.value = 3
    } else {
      message.error(result.error || t('auth.register.verifyFailed'))
    }
  } catch (error) {
    message.error(t('common.validation.checkFormInput'))
  }
}

const handleResendCode = async () => {
  if (!registrationEnabled.value) {
    message.warning(t('auth.register.closed'))
    return
  }

  if (countdown.value > 0) return

  const result = await userStore.sendVerification({
    email: emailForm.email
  })

  if (result.success) {
    message.success(t('auth.register.resent'))
    const debugCode = result.data?.debugCode
    if (debugCode) {
      message.info(t('auth.register.debugCode', { code: debugCode }))
    }
    startCountdown(60)
  } else {
    message.error(result.error || t('auth.register.sendFailed'))
  }
}

const handleCompleteRegister = async () => {
  if (!registrationEnabled.value) {
    message.warning(t('auth.register.closed'))
    return
  }

  try {
    await registerFormRef.value?.validate()

    const result = await userStore.registerWithCode({
      email: emailForm.email,
      password: registerForm.password,
      displayName: registerForm.displayName || undefined,
      verificationCode: codeForm.code
    })

    if (result.success) {
      message.success(t('auth.register.success'))
      router.push('/home')
    } else {
      message.error(result.error || t('auth.register.failed'))
    }
  } catch (error) {
    message.error(t('common.validation.checkFormInput'))
  }
}

const loadAccessConfig = async () => {
  accessLoading.value = true
  try {
    const response = await systemApi.getAccessConfig()
    if (response.code === 0) {
      accessConfig.value = {
        allowRegistration: !!response.data.allowRegistration,
        allowPasswordReset: !!response.data.allowPasswordReset,
      }
      return
    }
  } catch {
    // ignore and keep default
  } finally {
    accessLoading.value = false
  }
}

// Cleanup countdown timer on unmount
onMounted(() => {
  loadAccessConfig()
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.register-container {
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

.register-card {
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
