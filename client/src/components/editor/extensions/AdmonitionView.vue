<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  InformationCircleOutline,
  WarningOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
} from '@vicons/ionicons5'

const props = defineProps<{
  node: {
    attrs: {
      type: string
      title?: string | null
    }
  }
  updateAttributes: (attrs: any) => void
}>()
const { t } = useI18n()

const typeConfig = {
  info: {
    icon: InformationCircleOutline,
    bgColor: 'var(--color-adm-info-bg)',
    textColor: 'var(--color-adm-info-text)',
    titleKey: 'editor.slash.items.info.title',
  },
  warning: {
    icon: WarningOutline,
    bgColor: 'var(--color-adm-warning-bg)',
    textColor: 'var(--color-adm-warning-text)',
    titleKey: 'editor.slash.items.warning.title',
  },
  success: {
    icon: CheckmarkCircleOutline,
    bgColor: 'var(--color-adm-success-bg)',
    textColor: 'var(--color-adm-success-text)',
    titleKey: 'editor.slash.items.success.title',
  },
  danger: {
    icon: CloseCircleOutline,
    bgColor: 'var(--color-adm-danger-bg)',
    textColor: 'var(--color-adm-danger-text)',
    titleKey: 'editor.slash.items.danger.title',
  },
}

const config = computed(() => {
  const current = typeConfig[props.node.attrs.type as keyof typeof typeConfig] || typeConfig.info
  return {
    ...current,
    title: t(current.titleKey),
  }
})

</script>

<template>
  <node-view-wrapper class="admonition">
    <div
      class="admonition-content"
      :style="{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }"
    >
      <div class="admonition-icon">
        <n-icon size="24" :style="{ color: config.textColor }">
          <component :is="config.icon" />
        </n-icon>
      </div>
      <div class="admonition-main">
        <input
          class="admonition-title"
          :value="node.attrs.title"
          :placeholder="config.title"
          @input="
            updateAttributes({
              title: ($event.target as HTMLInputElement).value,
            })
          "
          :style="{ color: config.textColor }"
        />
        <div class="admonition-body">
          <node-view-content class="content" />
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<style scoped>
.admonition {
  margin: 1.5em 0;
}

.admonition-content {
  border-radius: 4px;
  padding: 16px;
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.admonition-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.admonition-main {
  flex-grow: 1;
  min-width: 0;
}

.admonition-title {
  font-weight: 600;
  font-size: 1em;
  border: none;
  background: transparent;
  width: 100%;
  outline: none;
  margin-bottom: 4px;
  font-family: inherit;
  line-height: 1.5;
  padding: 0;
}

.admonition-title::placeholder {
  opacity: 0.6;
}

.admonition-body {
  line-height: 1.6;
  font-size: 1em;
}

.admonition-body :deep(p) {
  margin: 0;
}

.admonition-body :deep(p + p) {
  margin-top: 0.5em;
}
</style>
