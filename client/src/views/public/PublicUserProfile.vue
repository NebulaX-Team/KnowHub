<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NSpin, NResult, NCard, NAvatar, NText, NIcon, NEmpty, NTime, NButton, NLayoutHeader } from 'naive-ui'
import { LibraryOutline, BookOutline, SunnyOutline, MoonOutline } from '@vicons/ionicons5'
import { userApi, type PublicUserProfile } from '@/api/user'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const { t } = useI18n()
const profile = ref<PublicUserProfile | null>(null)
const loading = ref(false)
const error = ref('')

async function fetchProfile() {
  const name = route.params.name as string
  if (!name) return

  loading.value = true
  error.value = ''
  try {
    const res = await userApi.getPublicProfile(name)
    if (res.code === 0) {
      profile.value = res.data
      document.title = `${profile.value.displayName} - ${t('publicProfile.profileTitleSuffix')}`
    } else {
      error.value = t('publicProfile.notFound')
    }
  } catch {
    error.value = t('publicProfile.notFound')
  } finally {
    loading.value = false
  }
}

function navigateToLibrary(slug: string) {
  router.push(`/public/libraries/${slug}`)
}

watch(() => route.params.name, fetchProfile, { immediate: true })
</script>

<template>
  <div class="public-profile-layout">
    <NLayoutHeader bordered class="profile-topbar">
      <span class="site-name">{{ t('common.appName') }}</span>
      <NButton quaternary circle @click="toggleTheme">
        <template #icon>
          <NIcon><MoonOutline v-if="!isDark" /><SunnyOutline v-else /></NIcon>
        </template>
      </NButton>
    </NLayoutHeader>

    <div class="profile-content">
      <div v-if="loading" class="loading-state">
        <NSpin size="large" />
      </div>
      <div v-else-if="error" class="error-state">
        <NResult status="404" :title="t('publicProfile.errorTitle')" :description="error" />
      </div>
      <div v-else-if="profile" class="profile-page">
    <!-- User Info Header -->
    <div class="profile-header">
      <NAvatar 
        :size="96" 
        :src="profile.avatar" 
        round 
        fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
        class="profile-avatar"
      />
      <div class="profile-info">
        <h1 class="profile-name">{{ profile.displayName }}</h1>
        <NText depth="3" class="profile-joined">
          {{ t('publicProfile.joined') }}
          <NTime :time="new Date(profile.createdAt).getTime()" type="date" />
        </NText>
      </div>
    </div>

    <!-- Public Libraries -->
    <div class="libraries-section">
      <div class="section-header">
        <NIcon :size="20"><LibraryOutline /></NIcon>
        <h2>{{ t('publicProfile.publicLibraries') }}</h2>
        <NText depth="3" class="library-count">{{ profile.libraries.length }}</NText>
      </div>

      <div v-if="profile.libraries.length === 0" class="empty-state">
        <NEmpty :description="t('publicProfile.noPublicLibraries')" />
      </div>

      <div v-else class="library-grid">
        <NCard 
          v-for="lib in profile.libraries" 
          :key="lib.id"
          hoverable
          class="library-card"
          @click="navigateToLibrary(lib.publicSlug || lib.id)"
        >
          <div class="library-card-content">
            <div class="library-icon">
              <span v-if="lib.icon" class="emoji-icon">{{ lib.icon }}</span>
              <NIcon v-else :size="24" color="var(--n-text-color-3)"><BookOutline /></NIcon>
            </div>
            <div class="library-details">
              <div class="library-title">{{ lib.title }}</div>
              <div v-if="lib.description" class="library-description">{{ lib.description }}</div>
              <div class="library-meta">
                <NText depth="3" style="font-size: 12px">
                  {{ t('publicProfile.publicPagesCount', { count: lib.pageCount || 0 }) }}
                </NText>
                <NText depth="3" style="font-size: 12px">
                  {{ t('publicProfile.updated') }}
                  <NTime :time="new Date(lib.updatedAt).getTime()" type="relative" />
                </NText>
              </div>
            </div>
          </div>
        </NCard>
      </div>
    </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.public-profile-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.profile-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  flex-shrink: 0;

  .site-name {
    font-size: 18px;
    font-weight: 700;
  }
}

.profile-content {
  flex: 1;
  overflow-y: auto;
}

.profile-page {
  padding: 32px 24px;
  max-width: 900px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--n-border-color);
  
  .profile-avatar {
    flex-shrink: 0;
    border: 2px solid var(--n-border-color);
  }
  
  .profile-info {
    .profile-name {
      margin: 0 0 4px 0;
      font-size: 28px;
      font-weight: 700;
    }
    
    .profile-joined {
      font-size: 14px;
    }
  }
}

.libraries-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    
    .library-count {
      font-size: 14px;
    }
  }
}

.empty-state {
  padding: 48px 0;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.library-card {
  cursor: pointer;
  transition: transform 0.15s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  .library-card-content {
    display: flex;
    gap: 16px;
    
    .library-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .emoji-icon {
        font-size: 28px;
      }
    }
    
    .library-details {
      flex: 1;
      min-width: 0;
      
      .library-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .library-description {
        font-size: 13px;
        color: var(--n-text-color-3);
        margin-bottom: 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      
      .library-meta {
        display: flex;
        gap: 16px;
      }
    }
  }
}

.loading-state, .error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
}
</style>
