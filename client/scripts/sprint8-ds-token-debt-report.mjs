import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientRoot = path.resolve(__dirname, '..')

const files = {
  dsCss: path.join(clientRoot, 'src', 'mobile', 'design-system', 'MobileOpsV2.css'),
  dsJsx: path.join(clientRoot, 'src', 'mobile', 'design-system', 'MobileOpsV2Components.jsx'),
  v1Css: path.join(clientRoot, 'src', 'mobile', 'design-system', 'EVMobileDesignSystemV1.css'),
  v1Jsx: path.join(clientRoot, 'src', 'mobile', 'design-system', 'EVMobileDesignSystemV1.jsx'),
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function percent(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

const dsCss = readText(files.dsCss)
const dsJsx = readText(files.dsJsx)
const v1Css = readText(files.v1Css)
const v1Jsx = readText(files.v1Jsx)

const dsLines = dsCss.split(/\r?\n/)
const declarationLines = dsLines.filter((line) => !/^\s*--[\w-]+\s*:/.test(line) && !/^\s*@media\b/.test(line))
const declarationText = declarationLines.join('\n')

const hardcodedPxCount = (declarationText.match(/\b\d+px\b/g) || []).length
const hardcodedMarginPaddingGapRadiusFontSizeLineHeightShadowOpacityColorCount =
  (declarationText.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|\b\d*\.?\d+rem\b|\b\d+ms\b|\b0\.[0-9]+\b/g) || []).length

const tokenDefs = (dsCss.match(/--[a-z0-9-]+\s*:/gi) || []).length
const tokenRefs = (declarationText.match(/var\(--[a-z0-9-]+\)/gi) || []).length
const tokenCoverage = percent((tokenRefs / Math.max(1, tokenRefs + hardcodedPxCount + hardcodedMarginPaddingGapRadiusFontSizeLineHeightShadowOpacityColorCount)) * 100)

const motionTokenRequired = ['--duration-fast', '--duration-normal', '--duration-slow', '--ease-standard', '--ease-out', '--ease-in']
const elevationRequired = ['--elevation-level0', '--elevation-level1', '--elevation-level2', '--elevation-level3']
const spacingRequired = ['--space-4', '--space-8', '--space-12', '--space-16', '--space-20', '--space-24', '--space-32', '--space-40', '--space-48']
const typographyRequired = ['--font-display', '--font-h1', '--font-h2', '--font-h3', '--font-title', '--font-body', '--font-caption', '--font-label']

const motionCoverage = percent((motionTokenRequired.filter((t) => dsCss.includes(t)).length / motionTokenRequired.length) * 100)
const elevationCoverage = percent((elevationRequired.filter((t) => dsCss.includes(t)).length / elevationRequired.length) * 100)
const spacingCoverage = percent((spacingRequired.filter((t) => dsCss.includes(t)).length / spacingRequired.length) * 100)
const typographyCoverage = percent((typographyRequired.filter((t) => dsCss.includes(t)).length / typographyRequired.length) * 100)

const v2Components = [
  'OperationCard',
  'PriorityBadge',
  'MetricBadge',
  'SectionHeader',
  'SearchField',
  'SegmentFilter',
  'ActionRow',
  'Avatar',
  'NotificationButton',
  'EmptyState',
  'LoadingSkeleton',
  'ListItem',
  'ChevronRow',
  'FloatingActionButton',
  'BottomSheet',
  'ConfirmDialog',
  'Toast',
]

const componentComplianceCovered = v2Components.filter((name) => {
  const hasFn = new RegExp(`export\\s+function\\s+${name}\\b`).test(dsJsx)
  const hasConst = new RegExp(`export\\s+const\\s+${name}\\b`).test(dsJsx)
  return hasFn || hasConst
}).length
const componentCompliance = percent((componentComplianceCovered / v2Components.length) * 100)

const v1Hardcoded = (v1Css.match(/\b\d+px\b|#[0-9a-fA-F]{3,8}\b|rgba?\(|\b\d*\.?\d+rem\b|\b\d+ms\b/g) || []).length
const v1TransitionLiteral = /transition:\s*'transform\s*\d+ms\s+ease'/.test(v1Jsx)

const designSystemHealth = percent(
  tokenCoverage * 0.45 +
  componentCompliance * 0.2 +
  motionCoverage * 0.1 +
  elevationCoverage * 0.1 +
  spacingCoverage * 0.075 +
  typographyCoverage * 0.075
)

const technicalDebtScore = Math.max(0, 100 - Math.min(100, hardcodedPxCount * 5 + hardcodedMarginPaddingGapRadiusFontSizeLineHeightShadowOpacityColorCount * 2 + (v1TransitionLiteral ? 5 : 0)))

const enterpriseScore = percent(
  designSystemHealth * 0.6 +
  technicalDebtScore * 0.25 +
  componentCompliance * 0.15
)

const report = {
  sprint: '8',
  generatedAt: new Date().toISOString(),
  files,
  summary: {
    tokenCoverage,
    hardcodedPxCount,
    hardcodedLiteralCount: hardcodedMarginPaddingGapRadiusFontSizeLineHeightShadowOpacityColorCount,
    componentCompliance,
    designSystemHealth,
    technicalDebtScore,
    enterpriseScore,
  },
  contracts: {
    motionCoverage,
    elevationCoverage,
    spacingCoverage,
    typographyCoverage,
  },
  notes: {
    mobileOpsV2DeclarationsAreTokenized: hardcodedPxCount === 0 && hardcodedMarginPaddingGapRadiusFontSizeLineHeightShadowOpacityColorCount === 0,
    v1LegacyLiteralCount: v1Hardcoded,
    v1TransitionLiteral,
  },
  targets: {
    tokenCoverage: tokenCoverage >= 90,
    hardcodedPxCount: hardcodedPxCount === 0,
  },
}

const outDir = path.join(clientRoot, 'test-artifacts')
fs.mkdirSync(outDir, { recursive: true })

const jsonPath = path.join(outDir, 'sprint8-ds-token-debt-report.json')
const mdPath = path.join(outDir, 'sprint8-ds-token-debt-report.md')

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8')

const markdown = [
  '# Sprint 8 Mobile DS Token Debt Report',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  '## KPI',
  `- Token Coverage: ${report.summary.tokenCoverage}%`,
  `- Hardcoded PX Count: ${report.summary.hardcodedPxCount}`,
  `- Hardcoded Literal Count: ${report.summary.hardcodedLiteralCount}`,
  `- Component Compliance: ${report.summary.componentCompliance}%`,
  `- Design System Health: ${report.summary.designSystemHealth}%`,
  `- Technical Debt Score: ${report.summary.technicalDebtScore}%`,
  `- Enterprise Score: ${report.summary.enterpriseScore}%`,
  '',
  '## Contracts',
  `- Motion Tokens: ${report.contracts.motionCoverage}%`,
  `- Elevation Tokens: ${report.contracts.elevationCoverage}%`,
  `- Spacing Scale: ${report.contracts.spacingCoverage}%`,
  `- Typography Scale: ${report.contracts.typographyCoverage}%`,
  '',
  '## Targets',
  `- Token Coverage >= 90: ${report.targets.tokenCoverage ? 'PASS' : 'FAIL'}`,
  `- Hardcoded PX Count == 0: ${report.targets.hardcodedPxCount ? 'PASS' : 'FAIL'}`,
  '',
  '## Notes',
  `- MobileOpsV2 declaration tokenization complete: ${report.notes.mobileOpsV2DeclarationsAreTokenized ? 'YES' : 'NO'}`,
  `- Legacy V1 literal count (informational): ${report.notes.v1LegacyLiteralCount}`,
].join('\n')

fs.writeFileSync(mdPath, markdown + '\n', 'utf8')

console.log(`Sprint 8 report written: ${path.relative(clientRoot, jsonPath)}`)
console.log(`Sprint 8 report written: ${path.relative(clientRoot, mdPath)}`)
