import type { GitCommit } from '~/types/git'

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

function buildLaneMap(branches: GHBranch[]): Map<string, number> {
  const map = new Map<string, number>()
  map.set('main', 0)
  map.set('master', 0)
  let next = 1
  for (const b of branches) {
    if (!map.has(b.name)) map.set(b.name, next++)
  }
  return map
}

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

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const repo = String(query.repo ?? 'colabottles/branchflow')
  const perPage = Math.min(Number(query.limit ?? 30), 100)
  const branch = String(query.branch ?? '')

  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw createError({ statusCode: 400, message: `Invalid repo format: "${repo}". Expected owner/repo.` })
  }

  const token = useRuntimeConfig().githubToken as string | undefined

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

  const laneMap = buildLaneMap(branches)
  const commitShaSet = new Set(rawCommits.map(c => c.sha))

  // Build a definitive sha→branch map by fetching commits for each
  // non-default branch tip. Limit to 5 branches to stay within rate limits.
  const defaultBranch = branches[0]?.name ?? 'main'
  const featureBranches = branches
    .filter(b => b.name !== defaultBranch && b.name !== 'main' && b.name !== 'master')
    .slice(0, 5)

  const shaBranchMap = new Map<string, string>()

  // Seed with branch tip SHAs first — these are definitive
  for (const b of branches) {
    shaBranchMap.set(b.commit.sha, b.name)
  }

  // For each feature branch, fetch its recent commits and map them
  await Promise.all(
    featureBranches.map(async b => {
      const branchCommits = await ghFetch<GHCommitSummary[]>(
        `/repos/${repo}/commits`,
        token,
        { sha: b.name, per_page: String(perPage) }
      ).catch(() => [] as GHCommitSummary[])

      for (const c of branchCommits) {
        // Only map commits that appear in our visible window
        // and haven't already been claimed by another branch
        if (commitShaSet.has(c.sha) && !shaBranchMap.has(c.sha)) {
          shaBranchMap.set(c.sha, b.name)
        }
      }
    })
  )

  const branchTips = new Map<string, string>(branches.map(b => [b.commit.sha, b.name]))

  const commits: GitCommit[] = rawCommits.map((c, i) => {
    const branch = shaBranchMap.get(c.sha) ?? defaultBranch
    const lane = laneMap.get(branch) ?? 0
    const refs: string[] = []
    if (i === 0) refs.push('HEAD')
    const tip = branchTips.get(c.sha)
    if (tip) refs.push(tip)

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