<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useMessage, NForm, NFormItem, NInput, NButton, NUpload, NAvatar, NCard, NSwitch, NText, type UploadCustomRequestOptions } from 'naive-ui'
import { uploadApi } from '@/api/upload'

const userStore = useUserStore()
const message = useMessage()
const { t } = useI18n()

const model = reactive({
  displayName: '',
  email: '',
  avatar: '',
  isProfilePublic: false
})
const loading = ref(false)

const profileUrl = computed(() => {
  if (!userStore.user) return ''
  const name = userStore.user.displayName || userStore.user.id
  return `${window.location.origin}/public/users/${encodeURIComponent(name)}`
})

// Function to populate model from userStore
const populateModel = () => {
  if (userStore.user) {
    model.displayName = userStore.user.displayName || ''
    model.email = userStore.user.email
    model.avatar = userStore.user.avatar || ''
    model.isProfilePublic = !!userStore.user.isProfilePublic
  }
}

onMounted(() => {
  populateModel()
})

// Update model if user store changes (e.g. initial load)
watch(() => userStore.user, () => {
  populateModel()
})

async function handleSave() {
  loading.value = true
  const result = await userStore.updateProfile({
    displayName: model.displayName,
    avatar: model.avatar
  })
  
  if (result.success) {
    message.success(t('settingsPage.profile.saveSuccess'))
  } else {
    message.error(result.error || t('settingsPage.profile.saveFailed'))
  }
  loading.value = false
}

async function handleTogglePublic(value: boolean) {
  model.isProfilePublic = value
  const result = await userStore.updateProfile({
    isProfilePublic: value
  })
  if (result.success) {
    message.success(
      value
        ? t('settingsPage.profile.publicEnabledSuccess')
        : t('settingsPage.profile.publicDisabledSuccess')
    )
  } else {
    // Revert on failure
    model.isProfilePublic = !value
    message.error(result.error || t('settingsPage.profile.saveFailed'))
  }
}

async function handleUpload({ file, onFinish, onError }: UploadCustomRequestOptions) {
  try {
    const res = await uploadApi.uploadImage(file.file as File)
    if (res && res.url) {
      model.avatar = res.url
      onFinish()
      message.success(t('settingsPage.profile.avatarUpdated'))
    } else {
      throw new Error(t('settingsPage.profile.invalidUploadResponse'))
    }
  } catch (e) {
    message.error(t('settingsPage.profile.uploadFailed'))
    onError()
  }
}
</script>

<template>
  <div class="settings-content">
    <div class="settings-header">
      <h2>{{ t('settingsPage.profile.title') }}</h2>
    </div>

    <n-card>
      <n-form :model="model" label-placement="top" class="form-wrapper">
        <div class="avatar-section">
          <n-avatar :size="80" :src="model.avatar" class="avatar" fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
          <div class="avatar-info">
            <div class="upload-row">
              <n-upload 
                action="" 
                :custom-request="handleUpload" 
                :show-file-list="false"
                accept="image/*"
              >
                <n-button secondary>{{ t('settingsPage.profile.changeAvatar') }}</n-button>
              </n-upload>
            </div>
            <div class="upload-hint">
              {{ t('settingsPage.profile.uploadHint') }}
            </div>
          </div>
        </div>

        <n-form-item :label="t('settingsPage.profile.displayName')" path="displayName">
          <n-input v-model:value="model.displayName" :placeholder="t('settingsPage.profile.displayNamePlaceholder')" />
        </n-form-item>
        
        <n-form-item :label="t('settingsPage.profile.emailAddress')" path="email">
          <n-input v-model:value="model.email" disabled :placeholder="t('settingsPage.profile.emailPlaceholder')" />
          <template #feedback>
            {{ t('settingsPage.profile.emailFeedback') }}
          </template>
        </n-form-item>
        
        <div class="form-actions">
          <n-button type="primary" :loading="loading" @click="handleSave" size="large">
            {{ t('settingsPage.profile.saveChanges') }}
          </n-button>
        </div>
      </n-form>
    </n-card>

    <n-card style="margin-top: 16px">
      <div class="profile-public-section">
        <div class="section-title">
          <h3>{{ t('settingsPage.profile.publicProfile') }}</h3>
        </div>
        <div class="switch-row">
          <n-switch v-model:value="model.isProfilePublic" @update:value="handleTogglePublic" />
          <n-text v-if="model.isProfilePublic" type="success">{{ t('settingsPage.profile.publicEnabled') }}</n-text>
          <n-text v-else depth="3">{{ t('settingsPage.profile.publicDisabled') }}</n-text>
        </div>
        <div class="profile-public-hint">
          {{ t('settingsPage.profile.publicHint') }}
        </div>
        <div v-if="userStore.user?.isProfilePublic && profileUrl" class="profile-url">
          <n-text depth="3">{{ t('settingsPage.profile.profileUrl') }}</n-text>
          <a :href="profileUrl" target="_blank" class="profile-link">{{ profileUrl }}</a>
        </div>
      </div>
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

.form-wrapper {
  max-width: 600px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  
  .avatar {
    flex-shrink: 0;
    border: 1px solid var(--n-border-color);
  }
  
  .avatar-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .upload-hint {
      font-size: 12px;
      color: var(--n-text-color-3);
    }
  }
}

.form-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-start;
}

.profile-public-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  .section-title {
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }
  
  .switch-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .profile-public-hint {
    font-size: 13px;
    color: var(--n-text-color-3);
  }
  
  .profile-url {
    font-size: 13px;
    padding: 8px 12px;
    background: var(--n-color-embedded);
    border-radius: 4px;
    
    .profile-link {
      color: var(--n-text-color);
      text-decoration: underline;
      word-break: break-all;
    }
  }
}
</style>
