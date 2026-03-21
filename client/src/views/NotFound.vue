<template>
  <div class="not-found-container">
    <n-card class="not-found-card">
      <n-result
        status="404"
        :title="t('notFound.title')"
        :description="t('notFound.description')"
      >
        <template #footer>
          <n-space>
            <n-button type="primary" @click="$router.push('/home')">
              {{ t('notFound.backHome') }}
            </n-button>
            <n-button @click="$router.back()">
              {{ t('notFound.backPrevious') }}
            </n-button>
          </n-space>
        </template>
      </n-result>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--color-bg-primary);
  padding: 20px;
}

.not-found-card {
  width: 100%;
  max-width: 500px;
  box-shadow: $ios-shadow-2;
  border-radius: $ios-border-radius-xl;
  background-color: var(--color-bg-secondary);
  border: none;
  padding: 40px 20px;
}
</style>
