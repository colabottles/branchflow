# BranchFlow

**A keyboard-accessible, WCAG AA/AAA visual Git history explorer built with Nuxt 4, TypeScript, and the GitHub API.**

🔗 **[Live demo](https://branchflow.netlify.app)** — loads the GitKraken vscode-gitlens repository by default.

---

## Why this exists

Most Git visualization tools are built for mouse users. GitKraken itself is one of the few that gets Git UX right — but even the best tools in this space treat accessibility as an afterthought: graphs rendered on Canvas with no DOM representation, no keyboard traversal, no screen reader support.

BranchFlow is an attempt to answer the question: *what does a Git history explorer look like if accessibility is the first design constraint, not the last?*

The result is a tool that a sighted mouse user and a screen reader user can both use to explore a repository's commit history, understand branch relationships, and read diffs — without either experience being degraded.

---

## Features

### Keyboard-first navigation

Every interaction in BranchFlow is reachable and operable by keyboard alone.

| Key | Action |
| ----- | -------- |
| `↑` `↓` | Move through commits linearly |
| `←` `→` | Jump spatially between branches |
| `Home` | First commit |
| `End` | Last commit |
| `B` | Cycle branch filter |

The commit list is implemented as a `role="listbox"` with `role="option"` items, meaning assistive technologies understand it as a structured, navigable list — not a generic scrollable region.

### Screen reader support

Every commit selection fires an ARIA live region announcement with the full commit context: hash, message, author, date, branch, and whether a merge conflict is likely. A screen reader user gets the same information density as a sighted user reading the detail panel.

```plaintext
"Commit a1b2c3d: feat: add OAuth2 middleware.
 By Todd Libby, 2 hours ago. Branch feat/auth."
```

The SVG graph is `aria-hidden="true"` entirely. It is a decorative representation of the same data that lives in the accessible listbox. No redundant ARIA labelling, no fake roles on SVG elements — just a clean separation between the visual and the accessible layer.

### Branch summary

Selecting any commit generates a plain-language branch summary:

> Branch **feat/keyboard-nav** diverged **3** commits ago from **main**. **2** commits ahead. Authors: Todd Libby.

This is computed from the commit data — no AI, no magic. It demonstrates that useful, human-readable context can be derived from structured data without a language model.

### Visual design

- SVG commit graph with lane spine guides, cubic Bézier merge edges, and staggered entrance animations
- Merge commits visually distinguished with a hollow center node
- Conflict commits flagged with a dashed ring
- Color key in DOM (not SVG) so it reflows correctly at any zoom level or magnification
- High contrast mode with WCAG AAA-compliant lane colors
- Light and dark mode with system preference detection and manual toggle, persisted to `localStorage`

### Accessibility compliance

- WCAG 2.2 AA baseline throughout; AAA where achievable
- `prefers-reduced-motion` respected at the system level — no JavaScript toggle required, though one is provided
- Skip to main content link as the first focusable element
- No `aria-label` on generic elements
- No inline styles on text that carries meaning — all color is via CSS custom properties so dark mode overrides work correctly
- Scrollable regions are keyboard focusable
- Tested with axe DevTools

---

## Engineering decisions

### SVG over Canvas

Canvas is the obvious choice for performance at scale. It is also an accessibility dead end. A Canvas element has no DOM children — to make it accessible you need a parallel, hidden DOM structure that mirrors the visual content, which means maintaining two representations of the same data.

SVG gives you real DOM nodes, real focus management, and real ARIA. The graph nodes are `<g>` elements inside an `aria-hidden` SVG — decorative by design — while the actual navigable content lives in a `role="listbox"` overlay. One source of truth, two presentations.

### No inline styles on semantic text

A recurring accessibility trap in component libraries is using JavaScript-computed colors as inline styles on text elements. Inline styles have higher specificity than any CSS rule, which means dark mode overrides — defined as CSS custom property reassignments — are silently ignored.

BranchFlow uses lane color classes (`.git-graph__lane-0` through `.git-graph__lane-3`) that reference CSS custom properties (`var(--c0)` through `var(--c3)`). Dark mode reassigns those properties. The component never needs to know which theme is active.

### On-demand commit detail

The GitHub API's `/repos/{owner}/{repo}/commits` endpoint returns summary data only. Full diff and file count require a separate call to `/repos/{owner}/{repo}/commits/{sha}`.

Rather than making N requests on load — which would hit rate limits fast and slow the initial render — BranchFlow fetches commit detail on demand when a commit is selected. The initial load is fast. The detail panel populates as you navigate.

### Typed GitHub API responses

The server route uses a typed `LOG_FIELDS` tuple and a `LogEntry` record type to avoid `any` casts on API responses. Every field the server uses is declared upfront. TypeScript catches mismatches at build time, not at runtime in production.

### Lane assignment

Branches are assigned horizontal lanes by first-seen order from the GitHub branches API, with `main` always at lane 0. A `Map<number, string>` derived from commit data drives the color key — the key is always accurate because it comes from the same data as the graph.

### CSS custom properties for theming

All color values flow through a single token system defined in `app.vue`. The component defines its own local aliases (`--bg`, `--surf`, `--txt`, etc.) that reference the global tokens. This means:

- Light and dark mode require zero JavaScript — just a `data-theme` attribute on `<html>`
- High contrast mode overrides only the values it needs to change
- The component is portable — drop it into any app that defines the same token names

---

## Tech stack

| Layer | Choice | Reason |
| ------- | -------- | -------- |
| Framework | Nuxt 4 | SSR, file-based routing, server routes without a separate API server |
| Language | TypeScript (strict) | Catches API shape mismatches at build time |
| State | Vue 3 `ref`/`computed` | Composables keep component logic testable and portable |
| Graph | SVG | DOM accessibility; Canvas has none |
| API | GitHub REST v3 | No auth required for public repos; 5,000 req/hr with token |
| Deployment | Netlify + Nitro | Zero-config server routes via Netlify Functions |
| Styling | Vanilla CSS | No framework overhead; custom properties handle theming cleanly |

---

## Running locally

```bash
git clone https://github.com/colabottles/branchflow.git
cd branchflow
npm install
npm run dev
```

The app runs at `http://localhost:3000`. It loads `gitkraken/vscode-gitlens` by default.

### GitHub token (optional but recommended)

Without a token the GitHub API allows 60 unauthenticated requests per hour. With a fine-grained personal access token scoped to public repositories, the limit is 5,000 per hour.

Create a `.env` file:

```plaintext
GITHUB_TOKEN=your_token_here
```

To generate a token: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained → Repository access: Public repositories → No additional permissions required.

---

## Project structure

```plaintext
app/
  components/
    GitGraph.vue         # Root graph component
    GitGraphEdge.vue     # Single commit edge (line or Bézier curve)
    GitGraphNode.vue     # Single commit node with all visual states
  composables/
    useGitGraph.ts       # Selection state, keyboard navigation, filters
    useGitSummary.ts     # Branch verbal summary computation
    useTheme.ts          # Light/dark mode toggle, persisted to localStorage
  pages/
    index.vue            # Repo input, data fetching, layout
  types/
    git.ts               # Shared TypeScript types
server/
  api/github/
    repo.get.ts          # Commit list + branch list from GitHub API
    commit/[sha].get.ts  # On-demand commit detail (diff, file count)
```

---

## Keyboard shortcut reference

| Shortcut | Action |
| ---------- | -------- |
| `Tab` | Move focus into the commit list |
| `↑` / `↓` | Navigate commits |
| `←` / `→` | Jump between branches spatially |
| `Home` | Jump to most recent commit |
| `End` | Jump to oldest commit |
| `B` | Cycle branch filter |
| `Tab` to toolbar | Access branch filter chips and toggles |

---

## Accessibility statement

BranchFlow targets WCAG 2.2 AA compliance throughout and AAA where achievable. It has been tested with:

- axe DevTools (Firefox)
- Keyboard-only navigation
- `prefers-reduced-motion` system setting
- `prefers-color-scheme: dark` system setting
- High contrast mode (built-in toggle)

Known limitations: the branch summary diverge calculation is an approximation based on the 30-commit API window. Repositories with complex merge histories may show inaccurate diverge counts.

---

## Author

**Todd Libby** — web developer and accessibility advocate.

- [toddl.dev](https://toddl.dev)
- [GitHub @colabottles](https://github.com/colabottles)
