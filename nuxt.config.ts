// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: [
    '@nuxt/a11y',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/hints',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/test-utils',
    '@pinia/nuxt'
  ],
  typescript: {
    strict: true,
    typeCheck: true,
  },
  runtimeConfig: {
    // GITHUB_TOKEN env var — set in Netlify dashboard, never committed.
    // Fine-grained personal access token needs: Contents (read), Metadata (read).
    // Without a token the GitHub API allows 60 unauthenticated requests/hour.
    githubToken: '',
  },
})
