import type { GitCommit, BranchSummary } from '~/types/git'

export function useGitSummary(commits: Ref<GitCommit[]>) {
  function computeSummary(commit: GitCommit): BranchSummary {
    const all = commits.value
    const branchCommits = all.filter(c => c.branch === commit.branch)
    const mainCommits = all.filter(c => c.branch === 'main')
    const authors = [...new Set(branchCommits.map(c => c.author))]
    const conflictFiles = branchCommits
      .filter(c => c.conflict)
      .flatMap(c => c.files > 0 ? ['components/auth.ts'] : [])

    if (commit.branch === 'main') {
      const count = mainCommits.length
      return {
        branch: 'main',
        isMain: true,
        commitsAhead: 0,
        divergedAt: 0,
        conflictFiles: [],
        authors,
        terse: `On main. ${count} commit${count !== 1 ? 's' : ''} total.`,
      }
    }

    // Find diverge point: how many main commits back before the branch forked
    let divergedAt = mainCommits.length
    for (let i = 0; i < mainCommits.length; i++) {
      const mainSlice = mainCommits.slice(i).map(m => m.id)
      if (branchCommits.some(b => b.parents.some(p => mainSlice.includes(p)))) {
        divergedAt = i + 1
        break
      }
    }

    const commitsAhead = branchCommits.length
    const terse = [
      `Branch ${commit.branch}.`,
      `Diverged ${divergedAt} commit${divergedAt !== 1 ? 's' : ''} ago from main.`,
      `${commitsAhead} commit${commitsAhead !== 1 ? 's' : ''} ahead.`,
      conflictFiles.length
        ? `Warning: merge conflict likely in ${conflictFiles.join(', ')}.`
        : '',
    ].filter(Boolean).join(' ')

    return {
      branch: commit.branch,
      isMain: false,
      commitsAhead,
      divergedAt,
      conflictFiles,
      authors,
      terse,
    }
  }

  return { computeSummary }
}