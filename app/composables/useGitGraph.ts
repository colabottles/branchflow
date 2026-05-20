import type { GitCommit } from '~/types/git'

export function useGitGraph(allCommits: Ref<GitCommit[]>) {
  const selectedIndex = ref(0)
  const filter = ref('all')
  const highContrast = ref(false)
  const reduceMotion = ref(false)
  const liveMessage = ref('')

  // Respect system prefers-reduced-motion on mount
  onMounted(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotion.value = mq.matches
    mq.addEventListener('change', e => { reduceMotion.value = e.matches })
  })

  const visibleCommits = computed<GitCommit[]>(() => {
    if (filter.value === 'all') return allCommits.value
    // Always include main for graph continuity; filter adds selected branch on top
    return allCommits.value.filter(
      c => c.branch === filter.value || c.branch === 'main'
    )
  })

  const selectedCommit = computed<GitCommit | null>(
    () => visibleCommits.value[selectedIndex.value] ?? null
  )

  function announce(msg: string) {
    liveMessage.value = ''
    nextTick(() => { liveMessage.value = msg })
  }

  function select(idx: number) {
    const clamped = Math.max(0, Math.min(idx, visibleCommits.value.length - 1))
    selectedIndex.value = clamped
    const c = visibleCommits.value[clamped]
    if (!c) return
    announce(
      `Commit ${c.short}: ${c.message}. By ${c.author}, ${c.date}. Branch ${c.branch}.${c.conflict ? ' Merge conflict detected.' : ''}`
    )
  }

  function selectNext() { select(selectedIndex.value + 1) }
  function selectPrev() { select(selectedIndex.value - 1) }
  function selectFirst() { select(0) }
  function selectLast() { select(visibleCommits.value.length - 1) }

  // Jump to the next commit on a *different* lane (spatial branch navigation)
  function selectNextBranch() {
    const cur = visibleCommits.value[selectedIndex.value]
    if (!cur) return

    for (let i = selectedIndex.value + 1; i < visibleCommits.value.length; i++) {
      const commit = visibleCommits.value[i]
      if (!commit) continue
      if (commit.lane !== cur.lane) {
        select(i)
        return
      }
    }
    // No different lane found — move to next commit
    select(selectedIndex.value + 1)
  }

  function selectPrevBranch() {
    const cur = visibleCommits.value[selectedIndex.value]
    if (!cur) return

    for (let i = selectedIndex.value - 1; i >= 0; i--) {
      const commit = visibleCommits.value[i]
      if (!commit) continue
      if (commit.lane !== cur.lane) {
        select(i)
        return
      }
    }
    // No different lane found — move to previous commit
    select(selectedIndex.value - 1)
  }

  function onKeydown(e: KeyboardEvent) {
    const map: Record<string, () => void> = {
      ArrowDown: selectNext,
      ArrowUp: selectPrev,
      Home: selectFirst,
      End: selectLast,
      ArrowRight: selectNextBranch,
      ArrowLeft: selectPrevBranch,
    }
    const handler = map[e.key]

    if (handler) {
      e.preventDefault()
      handler()
      return
    }
    if (e.key === 'b' || e.key === 'B') {
      const branches = ['all', ...new Set(allCommits.value.map(c => c.branch))]
      const idx = branches.indexOf(filter.value)
      const next = branches[(idx + 1) % branches.length]!
      setFilter(next)
    }
  }

  function setFilter(b: string) {
    filter.value = b
    selectedIndex.value = 0
    announce(`Showing ${b === 'all' ? 'all branches' : 'branch ' + b}. ${visibleCommits.value.length} commits.`)
  }

  function toggleHighContrast() {
    highContrast.value = !highContrast.value
    announce(highContrast.value ? 'High contrast mode enabled' : 'High contrast mode disabled')
  }

  function toggleReduceMotion() {
    reduceMotion.value = !reduceMotion.value
    announce(reduceMotion.value ? 'Animations disabled' : 'Animations enabled')
  }

  // Reset selection when filter changes visible commits
  watch(visibleCommits, () => {
    if (selectedIndex.value >= visibleCommits.value.length) {
      selectedIndex.value = 0
    }
  })

  return {
    visibleCommits,
    selectedIndex,
    selectedCommit,
    filter,
    highContrast,
    reduceMotion,
    liveMessage,
    select,
    selectNext,
    selectPrev,
    selectFirst,
    selectLast,
    selectNextBranch,
    selectPrevBranch,
    onKeydown,
    setFilter,
    toggleHighContrast,
    toggleReduceMotion,
  }
}