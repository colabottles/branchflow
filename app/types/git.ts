export interface GitCommit {
  id: string
  short: string
  message: string
  author: string
  email: string
  date: string
  dateIso: string
  branch: string
  lane: number
  refs: string[]
  parents: string[]
  files: number
  conflict: boolean
  diff: GitDiffLine[]
}

export interface GitDiffLine {
  type: 'add' | 'del' | 'ctx'
  content: string
}

export interface GitBranch {
  name: string
  current: boolean
  lane: number
  color: string
}

export interface GitGraphState {
  commits: GitCommit[]
  branches: GitBranch[]
  selectedIndex: number
  filter: string
  highContrast: boolean
  reduceMotion: boolean
  loading: boolean
  error: string | null
}

export interface BranchSummary {
  branch: string
  isMain: boolean
  commitsAhead: number
  divergedAt: number
  conflictFiles: string[]
  authors: string[]
  // terse is used for the ARIA live region announcement (plain text only)
  terse: string
}