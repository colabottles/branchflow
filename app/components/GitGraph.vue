<template>
  <!-- ARIA live region — screen reader announcements, visually hidden -->
  <div
    id="git-graph-live"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="git-graph__live">{{ liveMessage }}</div>

  <section
    class="git-graph"
    :class="{
      'git-graph--hc': highContrast,
      'git-graph--reduced': reduceMotion,
    }"
    aria-label="Git history explorer">
    <!-- Toolbar  -->
    <div
      class="git-graph__toolbar"
      role="toolbar"
      aria-label="Graph controls">
      <span class="git-graph__title" aria-hidden="true">Git History Explorer</span>

      <div role="group" aria-label="Filter by branch" class="git-graph__filters">
        <button
          v-for="b in branches"
          :key="b"
          class="git-graph__chip"
          :class="{ 'git-graph__chip--on': filter === b }"
          :aria-pressed="filter === b"
          @click="setFilter(b)">{{ b === 'all' ? 'All branches' : b }}</button>
      </div>

      <button
        class="git-graph__chip"
        :class="{ 'git-graph__chip--on': highContrast }"
        :aria-pressed="highContrast"
        @click="toggleHighContrast">High contrast</button>

      <button
        class="git-graph__chip"
        :class="{ 'git-graph__chip--on': reduceMotion }"
        :aria-pressed="reduceMotion"
        @click="toggleReduceMotion">Reduce motion</button>
    </div>

    <!-- Color key -->
    <div class="git-graph__key" role="list" aria-label="Branch color key">
      <div
        v-for="lane in activeLanes"
        :key="lane"
        class="git-graph__key-item"
        role="listitem">
        <span
          class="git-graph__key-swatch"
          :class="`git-graph__lane-bg-${lane}`"
          aria-hidden="true" />
        <span class="git-graph__key-name">{{ laneNameMap.get(lane) ?? '' }}</span>
      </div>
    </div>

    <!-- Body -->
    <div class="git-graph__body">

      <!-- Graph panel -->
      <div
        class="git-graph__panel"
        role="region"
        aria-label="Commit graph">
        <div
          ref="graphScrollRef"
          class="git-graph__scroll"
          :style="{ height: graphHeight + 'px' }">
          <!-- SVG graph — decorative, aria-hidden; real data is in the listbox -->
          <svg
            ref="svgRef"
            class="git-graph__svg"
            aria-hidden="true"
            :viewBox="`0 0 ${SVG_W} ${graphHeight}`"
            :height="graphHeight"
            :width="SVG_W"
            style="display:block;position:absolute;top:0;left:0">
            <!-- Lane spine guides -->
            <line
              v-for="lane in activeLanes"
              :key="`spine-${lane}`"
              :x1="laneX(lane)"
              :y1="PAD_T"
              :x2="laneX(lane)"
              :y2="graphHeight - PAD_T"
              :stroke="laneColor(lane)"
              stroke-width="1"
              opacity="0.1" />

            <!-- Edges -->
            <template v-for="(c, i) in visibleCommits" :key="`edges-${c.id}`">
              <template v-for="pid in c.parents" :key="`edge-${c.id}-${pid}`">
                <GitGraphEdge
                  v-if="parentCommit(pid)"
                  :x1="laneX(c.lane)"
                  :y1="commitY(i)"
                  :x2="laneX(parentCommit(pid)!.lane)"
                  :y2="commitY(parentIndex(pid))"
                  :color="laneColor(c.lane)"
                  :dashed="c.conflict"
                  :delay="reduceMotion ? 0 : i * 0.035"
                  :node-r="NODE_R"
                  :commit-h="COMMIT_H" />
              </template>
            </template>

            <!-- Nodes -->
            <GitGraphNode
v-for="(c, i) in visibleCommits" :key="`node-${c.id}`" :cx="laneX(c.lane)"
              :cy="commitY(i)" :color="laneColor(c.lane)" :is-merge="c.parents.length > 1"
              :is-conflict="c.conflict" :has-ref="c.refs.length > 0" :selected="i === selectedIndex"
              :delay="reduceMotion ? 0 : i * 0.04 + 0.1" :node-r="NODE_R"
              :high-contrast="highContrast" />

          </svg>

          <!-- Commit rows — keyboard-navigable listbox overlaid on SVG -->
          <div
ref="rowsRef" class="git-graph__rows" role="listbox" aria-label="Commits"
            aria-multiselectable="false" :style="{ height: graphHeight + 'px' }">
            <div
v-for="(c, i) in visibleCommits" :key="`row-${c.id}`" class="git-graph__row"
              role="option"
              :aria-selected="i === selectedIndex" :tabindex="i === selectedIndex ? 0 : -1"
              :data-index="i"
              :style="{
                top: (PAD_T + i * COMMIT_H) + 'px',
                height: COMMIT_H + 'px',
                paddingLeft: rowPaddingLeft,
              }" @click="select(i)" @keydown="onKeydown">
              <div class="git-graph__row-info">
                <div class="git-graph__row-hash">{{ c.short }}</div>
                <div class="git-graph__row-msg">
                  <span
v-for="ref in c.refs" :key="ref" class="git-graph__tag"
                    :class="ref === 'HEAD' ? 'git-graph__tag--head' : 'git-graph__tag--ref'">{{ ref
                    }}</span>
                  <span v-if="c.conflict" class="git-graph__tag git-graph__tag--warn">
                    <span class="git-graph__sr-only">merge conflict</span>
                    <span aria-hidden="true">⚠ conflict</span>
                  </span>
                  {{ c.message }}
                </div>
                <div class="git-graph__row-meta">{{ c.author }} · {{ c.date }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail panel -->
      <aside class="git-graph__detail" aria-label="Commit details">
        <div class="git-graph__detail-inner" tabindex="0">
          <template v-if="selectedCommit">
            <div class="git-graph__dl">DETAILS</div>
            <div class="git-graph__hash">{{ selectedCommit.id }}</div>
            <div class="git-graph__detail-msg">
              <span
                v-for="ref in selectedCommit.refs"
                :key="ref"
                class="git-graph__tag"
                :class="ref === 'HEAD' ? 'git-graph__tag--head' : 'git-graph__tag--ref'">{{ ref
                }}</span>
              <span
                v-if="selectedCommit.conflict"
                class="git-graph__tag git-graph__tag--warn">⚠ conflict</span>
              {{ selectedCommit.message }}
            </div>

            <div class="git-graph__dr">
              <span class="git-graph__dk">Author</span>
              <span class="git-graph__dv">{{ selectedCommit.author }}</span>
            </div>
            <div class="git-graph__dr">
              <span class="git-graph__dk">Date</span>
              <span class="git-graph__dv">{{ selectedCommit.date }}</span>
            </div>
            <div class="git-graph__dr">
              <span class="git-graph__dk">Branch</span>
              <span
                class="git-graph__dv"
                :class="`git-graph__lane-${selectedCommit.lane}`">{{ selectedCommit.branch }}</span>
            </div>
            <div class="git-graph__dr">
              <span class="git-graph__dk">Files</span>
              <span class="git-graph__dv">{{ selectedCommit.files }} changed</span>
            </div>
            <div class="git-graph__dr">
              <span class="git-graph__dk">Parents</span>
              <span class="git-graph__dv">
                {{selectedCommit.parents.length
                  ? selectedCommit.parents.map(p => p.slice(0, 7)).join(', ')
                  : '—'}}
              </span>
            </div>

            <div class="git-graph__divider" />
            <div class="git-graph__dl">DIFF PREVIEW</div>
            <div
              v-if="detailLoading"
              class="git-graph__diff-loading"
              aria-live="polite"
              aria-busy="true">Loading diff…</div>
            <div
              v-else
              class="git-graph__diff"
              role="region"
              :aria-label="`Diff preview for commit ${selectedCommit.short}`">
              <div
                v-for="(line, li) in selectedCommit.diff"
                :key="li"
                class="git-graph__diff-line"
                :class="`git-graph__diff-line--${line.type}`">{{ line.content }}</div>
            </div>
          </template>
          <template v-else>
            <div class="git-graph__dl">DETAILS</div>
            <p class="git-graph__placeholder">Select a commit to inspect it.</p>
          </template>
        </div>

        <!-- Branch summary panel — rendered from structured data, no v-html -->
        <div class="git-graph__summary">
          <div class="git-graph__dl">BRANCH SUMMARY</div>
          <template v-if="summary">
            <!-- main branch -->
            <p v-if="summary.isMain" class="git-graph__summary-text">
              On <strong>main</strong> —
              <strong>{{ summary.authors.length }}</strong>
              contributor{{ summary.authors.length !== 1 ? 's' : '' }}:
              {{ summary.authors.join(', ') }}.
            </p>
            <!-- feature / fix branch -->
            <p v-else class="git-graph__summary-text">
              <span v-if="summary.divergedAt === 0">
                Branch <strong>{{ summary.branch }}</strong> is the current branch.
              </span>
              <span v-else>
                Branch <strong>{{ summary.branch }}</strong> diverged
                <strong>{{ summary.divergedAt }}</strong>
                commit{{ summary.divergedAt !== 1 ? 's' : '' }} ago from
                <strong>main</strong>.
              </span>
              <strong>{{ summary.commitsAhead }}</strong>
              commit{{ summary.commitsAhead !== 1 ? 's' : '' }} ahead.
              <span
                v-if="summary.conflictFiles.length"
                class="git-graph__summary-conflict"
                role="note"
                :aria-label="`Warning: merge conflict likely in ${summary.conflictFiles.join(', ')}`">
                ⚠ {{ summary.conflictFiles.length }}
                merge conflict{{ summary.conflictFiles.length !== 1 ? 's' : '' }} likely in
                <code
                  v-for="file in summary.conflictFiles"
                  :key="file"
                  class="git-graph__summary-file">{{ file }}</code>.
              </span>
              Author{{ summary.authors.length !== 1 ? 's' : '' }}:
              {{ summary.authors.join(', ') }}.
            </p>
          </template>
          <p v-else class="git-graph__placeholder">
            Navigate to a commit to see its branch summary.
          </p>
        </div>
      </aside>
    </div>

    <!-- Status bar  -->
    <div class="git-graph__statusbar" aria-hidden="true">
      <span><kbd>↑↓</kbd> navigate</span>
      <span><kbd>←→</kbd> switch branch</span>
      <span><kbd>Home</kbd> <kbd>End</kbd> first / last</span>
      <span><kbd>B</kbd> cycle filter</span>
      <span class="git-graph__statusbar-sep" />
      <span>{{ visibleCommits.length }} commits</span>
    </div>
  </section>

  <footer class="explorer__footer">
    <p>Made by <a href="https://toddl.dev" target="_blank" rel="noopener">Todd Libby</a>. View on <a href="https://github.com/colabottles/branchflow" target="_blank" rel="noopener">GitHub</a>.</p>
  </footer>
</template>

<script setup lang="ts">
import type { GitCommit } from '~/types/git'
import { useGitGraph } from '~/composables/useGitGraph'
import { useGitSummary } from '~/composables/useGitSummary'

const props = defineProps<{
  commits: GitCommit[]
  availableBranches: string[]
  detailLoading: boolean
}>()

const emit = defineEmits<{
  select: [commit: GitCommit]
}>()

// Constants for layout and styling
const COMMIT_H = 56
const NODE_R = 6
const PAD_T = 28
const LANE_W = 24
const GRAPH_L = 12
const LANE_COLORS = ['#185FA5', '#0F6E56', '#993C1D', '#534AB7']
const LANE_COLORS_HC = ['#60b0ff', '#00e699', '#ff7040', '#cc99ff']

const branches = computed(() => ['all', ...props.availableBranches])

// Maps lane number → branch name, derived from the commit data
const laneNameMap = computed<Map<number, string>>(() => {
  const m = new Map<number, string>()
  for (const c of allCommits.value) {
    if (!m.has(c.lane)) m.set(c.lane, c.branch)
  }
  return m
})

// SVG is only as wide as the lane area — text rows sit beside it via paddingLeft
const maxLane = computed(() =>
  Math.max(0, ...allCommits.value.map(c => c.lane))
)
const SVG_W = computed(() =>
  GRAPH_L + (maxLane.value + 1) * LANE_W + NODE_R + 8
)
const rowPaddingLeft = computed(() =>
  `${SVG_W.value + 8}px`
)

// Composables for graph state and branch summary logic
const allCommits = computed(() => props.commits)
const {
  visibleCommits,
  selectedIndex,
  selectedCommit,
  filter,
  highContrast,
  reduceMotion,
  liveMessage,
  select,
  onKeydown,
  setFilter,
  toggleHighContrast,
  toggleReduceMotion,
} = useGitGraph(allCommits)

const { computeSummary } = useGitSummary(allCommits)
const summary = computed(() =>
  selectedCommit.value ? computeSummary(selectedCommit.value) : null
)

// Layout helpers const graphHeight = computed(() =>
const graphHeight = computed(() =>
  PAD_T + visibleCommits.value.length * COMMIT_H + PAD_T
)

function laneX(lane: number): number {
  return GRAPH_L + lane * LANE_W + NODE_R + 4
}

function commitY(index: number): number {
  return PAD_T + index * COMMIT_H + COMMIT_H / 2
}

function laneColor(lane: number): string {
  const colors = highContrast.value ? LANE_COLORS_HC : LANE_COLORS
  return colors[lane] ?? colors[0]!
}

// Build id→index map for parent lookups — O(1)
const idxMap = computed<Map<string, number>>(() => {
  const m = new Map<string, number>()
  visibleCommits.value.forEach((c, i) => m.set(c.id, i))
  return m
})

function parentIndex(pid: string): number {
  return idxMap.value.get(pid) ?? -1
}

function parentCommit(pid: string) {
  const idx = parentIndex(pid)
  return idx !== -1 ? visibleCommits.value[idx] : undefined
}

const activeLanes = computed<number[]>(() =>
  [...new Set(visibleCommits.value.map(c => c.lane))].sort()
)

// Refs for imperative DOM access
const graphScrollRef = useTemplateRef<HTMLDivElement>('graphScrollRef')
const rowsRef = useTemplateRef<HTMLDivElement>('rowsRef')
const svgRef = useTemplateRef<SVGSVGElement>('svgRef')

// Scroll selected row into view and emit for on-demand detail fetching
watch(selectedIndex, async idx => {
  await nextTick()
  const row = rowsRef.value?.querySelector<HTMLElement>(`[data-index="${idx}"]`)
  if (!row) return
  row.focus({ preventScroll: true })
  row.scrollIntoView({
    block: 'nearest',
    behavior: reduceMotion.value ? 'instant' : 'smooth',
  })
  const c = visibleCommits.value[idx]
  if (c) emit('select', c)
})
</script>

<style scoped>
/* Live region (visually hidden, screen reader only) */
.git-graph__live {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.git-graph__sr-only {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

/* Root */
.git-graph {
  --c0: #185FA5;
  --c1: #0F6E56;
  --c2: #993C1D;
  --c3: #534AB7;
  --c0l: #E6F1FB;
  --c1l: #E1F5EE;
  --c2l: #FAECE7;
  --c3l: #EEEDFE;
  --bg: var(--color-background-primary);
  --surf: var(--color-background-secondary);
  --brd: var(--color-border-tertiary);
  --brd2: var(--color-border-secondary);
  --txt: var(--color-text-primary);
  --muted: var(--color-text-secondary);
  --focus: #378ADD;
  --sel: rgba(55, 138, 221, 0.08);
  --diff-add-bg: rgba(99, 153, 34, 0.12);
  --diff-add-txt: #3B6D11;
  --diff-del-bg: rgba(226, 75, 74, 0.10);
  --diff-del-txt: #A32D2D;

  display: grid;
  grid-template-rows: auto auto 1fr 32px;
  height: clamp(400px, 80vh, 800px);
  border: 0.5px solid var(--brd);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg);
  color: var(--txt);
  font-family: var(--font-sans, system-ui);
  font-size: 13px;
}

/* High contrast overrides */
.git-graph--hc {
  --c0: #60b0ff;
  --c1: #00e699;
  --c2: #ff7040;
  --c3: #cc99ff;
  --c0l: #001830;
  --c1l: #001a10;
  --c2l: #1a0800;
  --c3l: #120020;
  --bg: #0a0a0a;
  --surf: #111;
  --brd: #333;
  --brd2: #555;
  --txt: #f0f0f0;
  --muted: #888;
  --sel: rgba(96, 176, 255, 0.15);
  --diff-add-bg: rgba(0, 230, 153, 0.10);
  --diff-add-txt: #00e699;
  --diff-del-bg: rgba(255, 112, 64, 0.10);
  --diff-del-txt: #ff7040;
}

/* Toolbar */
.git-graph__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 0.5px solid var(--brd);
  background: var(--surf);
  flex-shrink: 0;
  flex-wrap: wrap;
  max-height: 160px;
  overflow-y: auto;
}

.git-graph__title {
  font-size: 12px;
  font-weight: 500;
  flex: 1;
  letter-spacing: 0.03em;
  color: var(--txt);
  white-space: nowrap;
}

.git-graph__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.git-graph__chip {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 20px;
  border: 0.5px solid var(--brd2);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
  white-space: nowrap;
}

.git-graph__chip:hover,
.git-graph__chip--on {
  border-color: var(--focus);
  color: var(--txt);
  background: var(--sel);
}

.git-graph__chip--on {
  font-weight: 500;
}

/* Body */
.git-graph__body {
  display: grid;
  grid-template-columns: 1fr;
  overflow: hidden;
  min-height: 0;
}

@media (min-width: 768px) {
  .git-graph__body {
    grid-template-columns: 1fr 272px;
  }
}

.git-graph__dv.git-graph__lane-0 {
  color: var(--c0);
}

.git-graph__dv.git-graph__lane-1 {
  color: var(--c1);
}

.git-graph__dv.git-graph__lane-2 {
  color: var(--c2);
}

.git-graph__dv.git-graph__lane-3 {
  color: var(--c3);
}

.git-graph__lane-bg-0 {
  background: var(--c0);
}

.git-graph__lane-bg-1 {
  background: var(--c1);
}

.git-graph__lane-bg-2 {
  background: var(--c2);
}

.git-graph__lane-bg-3 {
  background: var(--c3);
}

/* Graph panel */
.git-graph__panel {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  background: var(--bg);
}

.git-graph__scroll {
  position: relative;
}

/* Commit rows */
.git-graph__rows {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.git-graph__row {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: all;
  outline: none;
  transition: background 0.1s;
}

.git-graph__row:hover,
.git-graph__row[aria-selected="true"] {
  background: var(--sel);
}

.git-graph__row:focus-visible {
  box-shadow: inset 0 0 0 1.5px var(--focus);
}

.git-graph__row-info {
  min-width: 0;
  flex: 1;
}

.git-graph__row-hash {
  font-size: 10px;
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  margin-bottom: 1px;
}

.git-graph__row-msg {
  font-size: 12px;
  color: var(--txt);
  font-weight: 500;
  white-space: normal;
  word-break: break-word;
  padding-right: 8px;
}

.git-graph__row-meta {
  font-size: 10px;
  color: var(--muted);
  margin-top: 1px;
}

/* Tags & badges */
.git-graph__tag {
  display: inline-flex;
  align-items: center;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 4px;
  letter-spacing: 0.03em;
  border: 0.5px solid currentColor;
}

.git-graph__tag--ref {
  background: var(--c0l);
  color: var(--c0);
}

.git-graph__tag--head {
  background: var(--c3l);
  color: var(--c3);
}

.git-graph__tag--warn {
  background: var(--c2l);
  color: var(--c2);
}

/* Detail panel */
.git-graph__detail {
  border-left: 0.5px solid var(--brd);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surf);
}

.git-graph__detail-inner {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.git-graph__diff-loading {
  font-size: 11px;
  color: var(--muted);
  padding: 8px;
}

.git-graph__dl {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.07em;
  margin-bottom: 8px;
}

.git-graph__hash {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 3px;
}

.git-graph__detail-msg {
  font-size: 13px;
  font-weight: 500;
  color: var(--txt);
  line-height: 1.4;
  margin-bottom: 10px;
}

.git-graph__dr {
  display: flex;
  gap: 6px;
  font-size: 11px;
  margin-bottom: 5px;
  align-items: baseline;
}

.git-graph__dk {
  color: var(--muted);
  min-width: 52px;
  flex-shrink: 0;
  font-size: 10px;
}

.git-graph__dv {
  color: var(--txt);
  font-family: var(--font-mono, monospace);
  overflow-wrap: break-word;
  font-size: 11px;
}

.git-graph__divider {
  height: 0.5px;
  background: var(--brd);
  margin: 10px 0;
}

.git-graph__diff {
  border: 0.5px solid var(--brd);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 4px;
}

.git-graph__diff-line {
  padding: 2px 8px;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  line-height: 1.6;
  white-space: pre;
}

.git-graph__diff-line--add {
  background: var(--diff-add-bg);
  color: var(--diff-add-txt);
}

.git-graph__diff-line--del {
  background: var(--diff-del-bg);
  color: var(--diff-del-txt);
}

.git-graph__diff-line--ctx {
  color: var(--muted);
}

.git-graph__placeholder {
  font-size: 11px;
  color: var(--muted);
}

/* Branch summary */
.git-graph__summary {
  padding: 10px 12px;
  border-top: 0.5px solid var(--brd);
  flex-shrink: 0;
}

.git-graph__summary-text {
  font-size: 11px;
  color: var(--txt);
  line-height: 1.65;
}

.git-graph__summary-text strong {
  font-weight: 600;
}

.git-graph__summary-conflict {
  color: var(--c2);
}

.git-graph__summary-file {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  background: var(--brd);
  padding: 1px 4px;
  border-radius: 3px;
  margin: 0 2px;
}

/* Color key */
.git-graph__key {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding: 6px 12px;
  border-bottom: 0.5px solid var(--brd);
  background: var(--surf);
}

.git-graph__key-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.git-graph__key-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.git-graph__key-name {
  font-size: 11px;
  color: var(--txt);
  font-family: var(--font-mono, monospace);
}

/* Status bar */
.git-graph__statusbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 12px;
  border-top: 0.5px solid var(--brd);
  background: var(--surf);
  font-size: 10px;
  color: var(--muted);
  flex-shrink: 0;
}

.git-graph__statusbar-sep {
  flex: 1;
}

kbd {
  font-family: inherit;
  font-size: 9px;
  font-weight: 600;
  color: var(--txt);
  background: var(--brd);
  border: 0.5px solid var(--brd2);
  border-radius: 3px;
  padding: 1px 4px;
}


/* Graph animations (gated on prefers-reduced-motion system pref) */
@media (prefers-reduced-motion: no-preference) {
  .git-graph:not(.git-graph--reduced) :deep(.gnode) {
    animation: git-pop-in 0.2s ease-out both;
  }

  .git-graph:not(.git-graph--reduced) :deep(.gedge) {
    animation: git-draw-in 0.35s ease-out both;
  }
}

@keyframes git-pop-in {
  from {
    opacity: 0;
    transform: scale(0.3);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes git-draw-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>