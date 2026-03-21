import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'

const COLOR_MODE_KEY = 'knowhub_color_mode'

const colorMode = useColorMode({
  storageKey: COLOR_MODE_KEY,
})

export function useTheme() {
  const isDark = computed(() => colorMode.value === 'dark')

  const naiveTheme = computed(() => (isDark.value ? darkTheme : null))

  const lightOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#007AFF',
      primaryColorHover: '#0071E3',
      primaryColorPressed: '#005BB5',
      primaryColorSuppl: '#007AFF',
      borderRadius: '10px',
      borderRadiusSmall: '6px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
      bodyColor: '#F2F2F7',
      cardColor: '#FFFFFF',
      textColorBase: '#000000',
      textColor1: '#000000',
      textColor2: '#8E8E93',
      textColor3: '#C7C7CC',
    },
    Button: {
      borderRadiusMedium: '10px',
      fontWeight: '500',
    },
    Card: {
      borderRadius: '12px',
      borderColor: 'transparent',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    },
    Input: {
      borderRadius: '10px',
    },
  }

  const darkOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#0A84FF',
      primaryColorHover: '#409EFF',
      primaryColorPressed: '#0066CC',
      primaryColorSuppl: '#0A84FF',
      borderRadius: '10px',
      borderRadiusSmall: '6px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
      bodyColor: '#1C1C1E',
      cardColor: '#2C2C2E',
      modalColor: '#2C2C2E',
      popoverColor: '#2C2C2E',
      textColorBase: '#F5F5F7',
      textColor1: '#F5F5F7',
      textColor2: '#98989D',
      textColor3: '#636366',
      dividerColor: '#48484A',
      borderColor: '#48484A',
      hoverColor: 'rgba(255, 255, 255, 0.08)',
    },
    Button: {
      borderRadiusMedium: '10px',
      fontWeight: '500',
    },
    Card: {
      borderRadius: '12px',
      borderColor: '#48484A',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    },
    Input: {
      borderRadius: '10px',
    },
  }

  const themeOverrides = computed(() => (isDark.value ? darkOverrides : lightOverrides))

  function toggleTheme() {
    colorMode.value = isDark.value ? 'light' : 'dark'
  }

  function setTheme(mode: 'light' | 'dark' | 'auto') {
    colorMode.value = mode
  }

  return {
    isDark,
    colorMode,
    naiveTheme,
    themeOverrides,
    toggleTheme,
    setTheme,
  }
}
