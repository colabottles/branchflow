import type { GitCommit } from '~/types/git'

// GitHub API response shapes (minimal — only fields we use)

interface GHBranch {
  name: string
  commit: { sha: string }
}

interface GHCommitSummary {
  sha: string
  commit: {
    message: string
    author: { name: string; email: string; date: string }
  }
  parents: { sha: string }[]
}

// Lane assignment

// main is always lane 0. Other branches get assigned in first-seen order.
function buildLaneMap(branches: GHBranch[]): Map<string, number> {
  const map = new Map<string, number>()
  map.set('main', 0)
  // Also accept 'master' as lane 0 for repos that haven't renamed
  map.set('master', 0)
  let next = 1
  for (const b of branches) {
    if (!map.has(b.name)) {
      map.set(b.name, next++)
    }
  }
  return map
}

// Relative date formatting

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// GitHub fetch helper

async function ghFetch<T>(
  path: string,
  token: string | undefined,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`https://api.github.com${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw createError({
      statusCode: res.status,
      message: `GitHub API error ${res.status} for ${path}: ${body}`,
    })
  }
  return res.json() as Promise<T>
}

// Route handler

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const repo = String(query.repo ?? 'colabottles/branchflow')
  const perPage = Math.min(Number(query.limit ?? 30), 100)
  const branch = String(query.branch ?? '')

  // Validate owner/repo format
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw createError({ statusCode: 400, message: `Invalid repo format: "${repo}". Expected owner/repo.` })
  }

  const token = useRuntimeConfig().githubToken as string | undefined

  // Fetch branches and commits in parallel
  const [branches, rawCommits] = await Promise.all([
    ghFetch<GHBranch[]>(`/repos/${repo}/branches`, token, { per_page: '30' }),
    ghFetch<GHCommitSummary[]>(`/repos/${repo}/commits`, token, {
      per_page: String(perPage),
      ...(branch ? { sha: branch } : {}),
    }),
  ])

  if (!rawCommits.length) {
    return { commits: [], repo, branches: branches.map(b => b.name) }
  }

  // Build a sha→branch map: walk each branch tip and mark commits
  // GitHub doesn't tell us which branch a commit belongs to in /commits,
  // so we assign each commit to the first branch whose tip it matches or
  // falls in the parent chain of — approximated here via the branch list.
  const laneMap = buildLaneMap(branches)

  // Build sha→index for parent edge resolution
  const shaIndex = new Map<string, number>()
  rawCommits.forEach((c, i) => shaIndex.set(c.sha, i))

  // Assign branch: check if any branch tip sha matches; otherwise infer from
  // commit position relative to branch tips.
  const branchTips = new Map<string, string>(branches.map(b => [b.commit.sha, b.name]))

  function inferBranch(sha: string, idx: number): string {
    // Direct tip match
    if (branchTips.has(sha)) return branchTips.get(sha)!
    // Walk forward from this commit — if a tip is the first commit above it
    // on the same chain, attribute to that branch
    for (const [tipSha, name] of branchTips) {
      const tipIdx = shaIndex.get(tipSha)
      if (tipIdx !== undefined && tipIdx <= idx) return name
    }
    return branches[0]?.name ?? 'main'
  }

  const commits: GitCommit[] = rawCommits.map((c, i) => {
    const branch = inferBranch(c.sha, i)
    const lane = laneMap.get(branch) ?? 0
    const refs: string[] = []
    if (i === 0) refs.push('HEAD')
    const tip = branches.find(b => b.commit.sha === c.sha)
    if (tip) refs.push(tip.name)

    return {
      id: c.sha,
      short: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0] ?? c.commit.message,
      author: c.commit.author.name,
      email: c.commit.author.email,
      date: relativeDate(c.commit.author.date),
      dateIso: c.commit.author.date,
      branch,
      lane,
      refs,
      parents: c.parents.map(p => p.sha),
      // files and diff are loaded on demand via /api/github/commit/[sha]
      files: 0,
      conflict: c.parents.length > 1,
      diff: [],
    } satisfies GitCommit
  })

  return {
    commits,
    repo,
    branches: branches.map(b => b.name),
  }
})