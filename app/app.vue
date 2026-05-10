<template>
  <div class="app">
    <!-- Skip to main content — first focusable element on the page -->
    <a href="#main-content" class="app__skip-link">Skip to main content</a>

    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
/* Global reset */
*,
*::before,
*::after {
  box-sizing: content-box;
}

html {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
  background: #fff;
  color: #111;
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