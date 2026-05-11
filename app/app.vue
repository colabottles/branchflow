<template>
  <div class="app">
    <a href="#main-content" class="app__skip-link">Skip to main content</a>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'alternate icon', href: '/favicon.ico' },
  ],
})
</script>

<style>
/* Light theme tokens */
:root {
  --color-background-primary: #ffffff;
  --color-background-secondary: #f7f7f8;
  --color-text-primary: #111111;
  --color-text-secondary: #5a6270;
  --color-text-danger: #c0392b;
  --color-border-primary: #d1d5db;
  --color-border-secondary: #e5e7eb;
  --color-border-tertiary: #f0f0f0;
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'Fira Mono', 'Cascadia Code', 'Consolas', monospace;
  --border-radius-lg: 12px;
}

/* Dark theme tokens */
[data-theme="dark"] {
  --color-background-primary: #0f0f0f;
  --color-background-secondary: #1a1a1a;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #9ca3af;
  --color-text-danger: #f87171;
  --color-border-primary: #374151;
  --color-border-secondary: #2d2d2d;
  --color-border-tertiary: #222222;
}

[data-theme="dark"] .git-graph,
:root:not([data-theme="light"]) .git-graph {
  --c0: #a8d4ff;
  --c1: #6ee8be;
  --c2: #ffaa80;
  --c3: #ccbbff;
  --c0l: #0a1f33;
  --c1l: #082018;
  --c2l: #2a0f00;
  --c3l: #150f30;
  --diff-add-txt: #7ec87e;
  --diff-del-txt: #e08080;
}

/* System preference fallback */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-background-primary: #0f0f0f;
    --color-background-secondary: #1a1a1a;
    --color-text-primary: #f0f0f0;
    --color-text-secondary: #9ca3af;
    --color-text-danger: #f87171;
    --color-border-primary: #374151;
    --color-border-secondary: #2d2d2d;
    --color-border-tertiary: #222222;
  }
}

*,
*::before,
*::after {
  box-sizing: content-box;
}

html {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  transition: background 0.15s, color 0.15s;
}

input,
button {
  font-family: inherit;
  font-size: inherit;
}

input[type="text"] {
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  outline: none;
  width: 100%;
}

input[type="text"]:focus-visible {
  border-color: #378ADD;
  box-shadow: 0 0 0 2px rgba(55, 138, 221, 0.2);
}

input[aria-invalid="true"] {
  border-color: var(--color-text-danger);
}

button {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.12s;
}

button:hover:not(:disabled) {
  background: var(--color-background-secondary);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:focus-visible {
  outline: 2px solid #378ADD;
  outline-offset: 2px;
}

.app__skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  z-index: 9999;
  padding: 0.5rem 1rem;
  background: #111;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0 0 4px 4px;
  text-decoration: none;
  transition: top 0.1s;
}

.app__skip-link:focus {
  top: 0;
}

.explorer__footer {
  margin-top: 2em;
  font-size: 0.675rem;
  color: var(--muted);
  text-align: center;
}

.explorer__footer p a {
  color: var(--color-text-secondary);
  text-decoration: underline;
}

.explorer__footer p a:hover {
  color: var(--color-text-primary);
  text-decoration-thickness: 2px;
}

.explorer__footer p a:focus,
.explorer__footer p a:focus-visible {
  outline: 2px solid #378ADD;
  outline-offset: 2px;
}
</style>