<template>
  <!--
    Renders one commit node.
    Visual states:
      - ref ring:      extra outer circle when the commit has branch/tag refs
      - conflict ring: dashed orange ring for merge commits with conflicts
      - merge dot:     hollow center circle for any multi-parent (merge) commit
      - selected glow: a larger, semi-transparent circle behind the node
    All geometry is derived from props — no hardcoded positions.
  -->
  <g
    class="gnode"
    :style="delay > 0 ? `animation-delay:${delay}s` : ''"
    :aria-hidden="true">
    <!-- Selection glow ring -->
    <circle
      v-if="selected"
      :cx="cx"
      :cy="cy"
      :r="nodeR + 5"
      :fill="color"
      opacity="0.15" />

    <!-- Conflict dashed ring -->
    <circle
      v-if="isConflict"
      :cx="cx"
      :cy="cy"
      :r="nodeR + 4"
      :fill="highContrast ? '#1a0800' : '#FAECE7'"
      stroke="#993C1D"
      stroke-width="1.5"
      stroke-dasharray="3 2.5"
      opacity="0.85" />

    <!-- Ref solid ring (HEAD, branch tip) -->
    <circle
      v-if="hasRef && !isConflict"
      :cx="cx"
      :cy="cy"
      :r="nodeR + 3"
      fill="none"
      :stroke="color"
      stroke-width="1"
      opacity="0.5" />

    <!-- Primary node fill -->
    <circle
      :cx="cx"
      :cy="cy"
      :r="nodeR"
      :fill="color"
      opacity="0.95" />

    <!-- Merge hollow center -->
    <circle
      v-if="isMerge"
      :cx="cx"
      :cy="cy"
      :r="nodeR - 2.5"
      :fill="highContrast ? '#0a0a0a' : '#ffffff'"
      opacity="0.55" />
  </g>
</template>

<script setup lang="ts">
defineProps<{
  cx: number
  cy: number
  color: string
  isMerge: boolean
  isConflict: boolean
  hasRef: boolean
  selected: boolean
  delay: number
  nodeR: number
  highContrast: boolean
}>()
</script>