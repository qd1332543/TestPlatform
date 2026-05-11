import type { Dictionary } from '@/content/i18n'

type AnalysisPackageReport = {
  summary?: string | null
  logUrl?: string | null
  allureUrl?: string | null
}

type AnalysisPackageAnalysis = {
  failureReason?: string | null
  impact?: string | null
  suggestion?: string | null
  flakyProbability?: number | null
}

export type AnalysisPackageInput = {
  title: string
  taskId: string
  project?: string | null
  suite?: string | null
  environment?: string | null
  status?: string | null
  executor?: string | null
  createdAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  command?: string | null
  report?: AnalysisPackageReport | null
  analysis?: AnalysisPackageAnalysis | null
}

export function markdownValue(value: unknown) {
  if (value == null || value === '') return '-'
  return String(value).replace(/\r\n/g, '\n').trim() || '-'
}

export function markdownLink(label: string, url?: string | null) {
  return url ? `[${label}](${url})` : '-'
}

export function markdownDataUrl(markdown: string) {
  return `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`
}

function percent(value?: number | null) {
  return value != null ? `${(value * 100).toFixed(0)}%` : '-'
}

export function buildAnalysisPackageMarkdown(input: AnalysisPackageInput, t: Dictionary) {
  const copy = t.analysisPackage
  const lines = [
    `# ${input.title}`,
    ``,
    `## ${copy.taskSection}`,
    ``,
    `| ${copy.fieldColumn} | ${copy.valueColumn} |`,
    `|---|---|`,
    `| ${copy.fields.taskId} | ${markdownValue(input.taskId)} |`,
    `| ${copy.fields.project} | ${markdownValue(input.project)} |`,
    `| ${copy.fields.suite} | ${markdownValue(input.suite)} |`,
    `| ${copy.fields.environment} | ${markdownValue(input.environment)} |`,
    `| ${copy.fields.status} | ${markdownValue(input.status)} |`,
  ]

  if (input.executor !== undefined) {
    lines.push(`| ${copy.fields.executor} | ${markdownValue(input.executor)} |`)
  }

  lines.push(
    `| ${copy.fields.createdAt} | ${markdownValue(input.createdAt)} |`,
    `| ${copy.fields.startedAt} | ${markdownValue(input.startedAt)} |`,
    `| ${copy.fields.finishedAt} | ${markdownValue(input.finishedAt)} |`,
    ``,
  )

  if (input.command !== undefined) {
    lines.push(
      `## ${copy.commandSection}`,
      ``,
      '```bash',
      markdownValue(input.command),
      '```',
      ``,
    )
  }

  lines.push(
    `## ${copy.reportSection}`,
    ``,
    `- ${copy.summary}: ${markdownValue(input.report?.summary)}`,
    `- ${copy.log}: ${markdownLink(copy.log, input.report?.logUrl)}`,
    `- ${copy.allure}: ${markdownLink(copy.allure, input.report?.allureUrl)}`,
    ``,
    `## ${copy.aiSection}`,
    ``,
    `- ${copy.failureReason}: ${markdownValue(input.analysis?.failureReason)}`,
    `- ${copy.impact}: ${markdownValue(input.analysis?.impact)}`,
    `- ${copy.suggestion}: ${markdownValue(input.analysis?.suggestion)}`,
    `- ${copy.flakyProbability}: ${percent(input.analysis?.flakyProbability)}`,
    ``,
    `## ${copy.promptSection}`,
    ``,
    copy.prompt,
    ``,
  )

  return lines.join('\n')
}
