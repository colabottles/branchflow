type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = ref<Theme>('light')

  onMounted(() => {
    const stored = localStorage.getItem('bf-theme') as Theme | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    theme.value = stored ?? preferred
    apply(theme.value)
  })

  function apply(t: Theme) {
    document.documentElement.setAttribute('data-theme', t)
  }

  function toggle() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    apply(theme.value)
    localStorage.setItem('bf-theme', theme.value)
  }

  return { theme, toggle }
}