<template>
  <!--
    Renders one directed edge between a child commit (x1, y1) and its parent (x2, y2).
    Uses a cubic Bézier when the lanes differ, a straight line when they match.
    The animation-delay prop staggers the entrance reveal per commit row.
  -->
  <path
    v-if="x1 !== x2"
    class="gedge"
    :d="curvePath"
    fill="none"
    :stroke="color"
    stroke-width="2"
    opacity="0.45"
    :stroke-dasharray="dashed ? '5 3' : 'none'"
    :style="delay > 0 ? `animation-delay:${delay}s` : ''" />
  <line
    v-else
    class="gedge"
    :x1="x1"
    :y1="y1 + nodeR + 1"
    :x2="x2"
    :y2="y2 - nodeR - 1"
    :stroke="color"
    stroke-width="2"
    opacity="0.55"
    :stroke-dasharray="dashed ? '5 3' : 'none'"
    :style="delay > 0 ? `animation-delay:${delay}s` : ''" />
</template>

<script setup lang="ts">
const props = defineProps<{
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  dashed: boolean
  delay: number
  nodeR: number
  commitH: number
}>()

// Cubic Bézier: depart vertically from the child node, arrive vertically at the parent.
// Control points are offset by 55% of the vertical distance so the curve feels natural.
const curvePath = computed(() => {
  const dy = props.y2 - props.y1
  const cp1y = props.y1 + props.nodeR + 1 + dy * 0.55
  const cp2y = props.y2 - props.nodeR - 1 - dy * 0.55
  return [
    `M${props.x1} ${props.y1 + props.nodeR + 1}`,
    `C${props.x1} ${cp1y}`,
    `${props.x2} ${cp2y}`,
    `${props.x2} ${props.y2 - props.nodeR - 1}`,
  ].join(' ')
})
</script>