import type { GitDiffLine } from '~/types/git'

interface GHFile {
  filename: string
  status: string
  additions: number
  deletions: number
  patch?: string
}

interface GHCommitDetail {
  sha: string
  parents: { sha: string }[]
  files: GHFile[]
  stats: { additions: number; deletions: number; total: number }
}

async function ghFetch<T>(path: string, token: string | undefined): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`https://api.github.com${path}`, { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw createError({
      statusCode: res.status,
      message: `GitHub API error ${res.status}: ${body}`,
    })
  }
  return res.json() as Promise<T>
}

function parsePatch(patch: string): GitDiffLine[] {
  return patch
    .split('\n')
    .filter(l => l.startsWith('+') || l.startsWith('-') || l.startsWith(' '))
    .filter(l => !l.startsWith('+++') && !l.startsWith('---'))
    .slice(0, 16)
    .map(l => ({
      type: (l.startsWith('+') ? 'add' : l.startsWith('-') ? 'del' : 'ctx') as GitDiffLine['type'],
      content: l,
    }))
}

export default defineEventHandler(async event => {
  const sha = getRouterParam(event, 'sha')
  const query = getQuery(event)
  const repo = String(query.repo ?? 'colabottles/branchflow')

  if (!sha || !/^[0-9a-f]{7,40}$/i.test(sha)) {
    throw createError({ statusCode: 400, message: 'Invalid SHA.' })
  }

  const token = useRuntimeConfig().githubToken as string | undefined
  const detail = await ghFetch<GHCommitDetail>(`/repos/${repo}/commits/${sha}`, token)

  // Use the first file with a patch for the diff preview
  const previewFile = detail.files.find(f => f.patch) ?? detail.files[0]
  const diff: GitDiffLine[] = previewFile?.patch
    ? parsePatch(previewFile.patch)
    : [{ type: 'ctx', content: previewFile ? '(diff too large to preview)' : '(no diff available)' }]

  return {
    sha: detail.sha,
    files: detail.files.length,
    additions: detail.stats.additions,
    deletions: detail.stats.deletions,
    changedFiles: detail.files.map(f => f.filename),
    diff,
  }
})