<template>
  <div class="login-container">
    <n-card class="login-card" :title="t('auth.login.title')">
      <n-form
        ref="formRef"
        :model="formValue"
        :rules="rules"
        @submit.prevent="handleSubmit"
      >
        <n-form-item path="email" :label="t('common.form.email')">
          <n-input
            v-model:value="formValue.email"
            :placeholder="t('common.placeholder.email')"
            type="email"
            :disabled="userStore.loading"
          />
        </n-form-item>
        
        <n-form-item path="password" :label="t('common.form.password')">
          <n-input
            v-model:value="formValue.password"
            :placeholder="t('common.placeholder.password')"
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
            {{ t('auth.login.submit') }}
          </n-button>

          <n-space justify="space-between">
            <n-button
              text
              type="primary"
              @click="$router.push('/register')"
              :disabled="userStore.loading"
            >
              {{ t('auth.login.noAccount') }}
            </n-button>
            <n-button
              text
              type="primary"
              @click="$router.push('/forget-password')"
              :disabled="userStore.loading"
            >
              {{ t('auth.login.forgotPassword') }}
            </n-button>
          </n-space>
        </n-space>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useRoute, useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const message = useMessage()
const { t } = useI18n()

const formRef = ref<FormInst | null>(null)

const formValue = reactive({
  email: '',
  password: ''
})

const rules = computed<FormRules>(() => ({
  email: [
    { required: true, message: t('common.validation.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('common.validation.emailInvalid'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('common.validation.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('common.validation.passwordMin'), trigger: 'blur' }
  ]
}))

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    const result = await userStore.login({
      email: formValue.email,
      password: formValue.password
    })
    
    if (result.success) {
      message.success(t('auth.login.success'))
      
      // Redirect to original destination or home
      const redirect = route.query.redirect as string
      router.push(redirect || '/home')
    } else {
      message.error(result.error || t('auth.login.failed'))
    }
  } catch (error) {
    message.error(t('common.validation.checkFormInput'))
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.login-container {
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

.login-card {
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
