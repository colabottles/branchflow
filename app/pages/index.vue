<template>
  <main id="main-content" class="explorer">
    <header class="explorer__header">
      <div class="explorer__heading-row">
        <h1 class="explorer__heading">BranchFlow</h1>
        <button
          class="explorer__theme-toggle"
          :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`"
          :aria-pressed="theme === 'dark'"
          @click="toggleTheme">{{ theme === 'light' ? '🌙 Dark' : '☀️ Light' }}</button>
      </div>
      <p class="explorer__sub">Keyboard-accessible visual Git history explorer.</p>

      <form class="explorer__form" @submit.prevent="loadRepo">
        <label for="repo-input" class="explorer__label">GitHub repository</label>
        <div class="explorer__input-row">
          <input
            id="repo-input"
            v-model="repoInput"
            type="text"
            class="explorer__input"
            placeholder="owner/repo"
            autocomplete="off"
            spellcheck="false"
            :aria-describedby="error ? 'repo-error' : 'repo-hint'"
            :aria-invalid="!!error">
          <button
            type="submit"
            class="explorer__btn"
            :disabled="loading">{{ loading ? 'Loading…' : 'Load' }}</button>
        </div>
        <p id="repo-hint" class="explorer__hint">e.g. <code>colabottles/branchflow</code></p>
        <p
          v-if="error"
          id="repo-error"
          class="explorer__error"
          role="alert">{{ error }}</p>
      </form>
    </header>

    <div
      v-if="loading"
      class="explorer__loading"
      aria-live="polite"
      aria-busy="true">
      <span class="explorer__spinner" aria-hidden="true" />
      <span>Loading repository…</span>
    </div>

    <div v-else-if="commits.length" class="explorer__graph">
      <GitGraph
        :commits="commits"
        :available-branches="availableBranches"
        :detail-loading="detailLoading"
        :repo-name="repoInput"
        @select="onCommitSelect"
        @filter-change="onFilterChange" />
    </div>

    <div v-else-if="!loading && !error" class="explorer__empty">
      <p>Enter a GitHub repository above and press <kbd>Enter</kbd> to load.</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { GitCommit } from '~/types/git'
import { useTheme } from '../composables/useTheme'

useHead({
  title: 'BranchFlow — Git History Explorer',
  meta: [{ name: 'description', content: 'Keyboard-first, screen reader-friendly visual Git history explorer.' }],
})

const { theme, toggle: toggleTheme } = useTheme()

const DEFAULT_REPO = 'colabottles/branchflow'
const repoInput = ref(DEFAULT_REPO)
const commits = ref<GitCommit[]>([])
const availableBranches = ref<string[]>([])
const loading = ref(false)
const detailLoading = ref(false)
const error = ref<string | null>(null)

onMounted(() => loadRepo())

async function loadRepo() {
  const repo = repoInput.value.trim()
  if (!repo) return
  loading.value = true
  error.value = null
  commits.value = []
  availableBranches.value = []
  try {
    const data = await $fetch<{ commits: GitCommit[]; branches: string[] }>(
      '/api/github/repo',
      { params: { repo, limit: 30 } }
    )
    commits.value = data.commits
    availableBranches.value = data.branches
    useHead({ title: `${repo} — BranchFlow` })
    if (data.commits[0]) onCommitSelect(data.commits[0])
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load repository.'
  } finally {
    loading.value = false
  }
}

async function onCommitSelect(commit: GitCommit) {
  if (commit.diff.length > 0 || commit.files > 0) return
  detailLoading.value = true
  try {
    const detail = await $fetch<{
      sha: string
      files: number
      diff: GitCommit['diff']
      changedFiles: string[]
    }>(`/api/github/commit/${commit.id}`, {
      params: { repo: repoInput.value.trim() },
    })
    const idx = commits.value.findIndex(c => c.id === commit.id)
    if (idx === -1) return
    const target = commits.value[idx]
    if (!target) return
    commits.value[idx] = { ...target, files: detail.files, diff: detail.diff }
  } catch {
    // non-fatal
  } finally {
    detailLoading.value = false
  }
}

async function onFilterChange(branch: string) {
  loading.value = true
  error.value = null
  commits.value = []
  try {
    const data = await $fetch<{ commits: GitCommit[]; branches: string[] }>(
      '/api/github/repo',
      { params: { repo: repoInput.value.trim(), limit: 30, branch: branch === 'all' ? '' : branch } }
    )
    commits.value = data.commits
    if (data.commits[0]) onCommitSelect(data.commits[0])
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load repository.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.explorer {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  font-family: var(--font-sans, system-ui);
  display: flex;
  flex-direction: column;
}

@media (min-width: 640px) {
  .explorer {
    padding: 2rem 1.5rem;
  }
}

.explorer__header {
  margin-bottom: 1.5rem;
}

.explorer__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.explorer__heading {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0;
}

.explorer__theme-toggle {
  font-size: 0.8125rem;
  padding: 0.25rem 0.75rem;
  white-space: nowrap;
}

.explorer__sub {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}

.explorer__form {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-width: 480px;
}

.explorer__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.explorer__input-row {
  display: flex;
  gap: 0.5rem;
}

.explorer__input {
  flex: 1;
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  min-width: 0;
}

.explorer__btn {
  white-space: nowrap;
}

.explorer__hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.explorer__hint code {
  font-family: var(--font-mono, monospace);
  color: #179287;
}

.explorer__error {
  font-size: 0.8125rem;
  color: var(--color-text-danger, #c0392b);
}

.explorer__error {
  font-size: 0.8125rem;
  color: var(--color-text-danger, #c0392b);
  background: rgba(192, 57, 43, 0.08);
  border: 0.5px solid var(--color-text-danger, #c0392b);
  border-radius: 6px;
  padding: 8px 12px;
  max-width: 480px;
}

.explorer__spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border-tertiary);
  border-top-color: var(--color-text-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .explorer__spinner {
    animation: none;
    border-style: dashed;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.explorer__graph {
  margin-top: 0;
  min-height: 0;
  flex: 1;
}

.explorer__empty {
  margin-top: 2rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.explorer__empty kbd {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-border-tertiary);
  border: 0.5px solid var(--color-border-secondary);
  border-radius: 3px;
  padding: 1px 5px;
}
</style>