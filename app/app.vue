<template>
  <div class="app">
    <a href="#main-content" class="app__skip-link">Skip to main content</a>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
/* Tokens */
:root {
  --color-background-primary: #ffffff;
  --color-background-secondary: #f7f7f8;
  --color-text-primary: #111111;
  --color-text-secondary: #6b7280;
  --color-text-danger: #c0392b;
  --color-border-primary: #d1d5db;
  --color-border-secondary: #e5e7eb;
  --color-border-tertiary: #f0f0f0;
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'Fira Mono', 'Cascadia Code', 'Consolas', monospace;
  --border-radius-lg: 12px;
}

/* Global reset */
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
}

/* Form element resets */
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

/* Skip link */
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
</style>