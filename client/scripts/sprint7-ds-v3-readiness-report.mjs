import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientRoot = path.resolve(__dirname, '..')

const files = {
  components: path.join(clientRoot, 'src', 'mobile', 'design-system', 'MobileOpsV2Components.jsx'),
  css: path.join(clientRoot, 'src', 'mobile', 'design-system', 'MobileOpsV2.css'),
  showcase: path.join(clientRoot, 'src', 'pages', 'DesignSystemShowcasePage.jsx'),
}

const requiredComponents = [
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

const requiredStates = [
  'data-theme',
  'data-selected',
  'data-loading',
  'data-pressed',
  'data-hovered',
]

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function percent(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function scoreFromCounts(ok, total) {
  if (!total) return 0
  return percent((ok / total) * 100)
}

const componentsSource = readText(files.components)
const cssSource = readText(files.css)
const showcaseSource = readText(files.showcase)

const componentCoverageCount = requiredComponents.filter((name) => {
  const fn = new RegExp(`export\\s+function\\s+${name}\\b`)
  const cnst = new RegExp(`export\\s+const\\s+${name}\\b`)
  return fn.test(componentsSource) || cnst.test(componentsSource)
}).length

const stateCoverageCount = requiredStates.filter((token) => {
  return componentsSource.includes(token) && cssSource.includes(token)
}).length

const tokenDefs = (cssSource.match(/--evm-v[234]-[a-z0-9-]+\s*:/gi) || []).length
const tokenRefs = (cssSource.match(/var\(--evm-v[234]-[a-z0-9-]+\)/gi) || []).length
const hardcodedPx = (cssSource.match(/:\s*\d+px\b/g) || []).length

const reusableAliases = [
  'OperationCard',
  'PriorityBadge',
  'SearchField',
  'SegmentFilter',
  'ListItem',
  'ChevronRow',
  'ConfirmDialog',
]
const aliasCoverage = reusableAliases.filter((name) => componentsSource.includes(name)).length

const showcaseCoverage = requiredComponents.filter((name) => showcaseSource.includes(name)).length

const componentCoverage = scoreFromCounts(componentCoverageCount, requiredComponents.length)
const stateCoverage = scoreFromCounts(stateCoverageCount, requiredStates.length)
const tokenCoverage = percent((tokenRefs / Math.max(1, tokenRefs + hardcodedPx)) * 100)
const reuseCoverage = scoreFromCounts(aliasCoverage, reusableAliases.length)
const showcaseScore = scoreFromCounts(showcaseCoverage, requiredComponents.length)

const accessibilityScore = percent(
  (cssSource.includes(':focus-visible') ? 35 : 0) +
  (cssSource.includes('prefers-reduced-motion') ? 35 : 0) +
  (cssSource.includes('min-width: 44px') || cssSource.includes('min-height: 44px') ? 30 : 0)
)

const animationScore = percent(
  (cssSource.includes('--evm-v2-motion-fast') ? 40 : 0) +
  (cssSource.includes('@keyframes') ? 30 : 0) +
  (cssSource.includes('evm-v2-motion-ease') ? 30 : 0)
)

const responsiveScore = percent(
  (cssSource.includes('@media (max-width: 360px)') ? 34 : 0) +
  (cssSource.includes('@media (min-width: 768px) and (max-width: 1024px)') ? 33 : 0) +
  (cssSource.includes('@media (min-width: 1025px)') ? 33 : 0)
)

const designSystemScore = percent(
  componentCoverage * 0.3 +
  tokenCoverage * 0.2 +
  stateCoverage * 0.2 +
  reuseCoverage * 0.1 +
  showcaseScore * 0.2
)

const enterpriseReadinessScore = percent(
  designSystemScore * 0.35 +
  accessibilityScore * 0.25 +
  responsiveScore * 0.2 +
  animationScore * 0.2
)

const technicalDebt = {
  hardcodedPxValues: hardcodedPx,
  missingComponents: requiredComponents.filter((name) => !componentsSource.includes(name)),
  missingStates: requiredStates.filter((token) => !(componentsSource.includes(token) && cssSource.includes(token))),
}

const report = {
  sprint: '7',
  generatedAt: new Date().toISOString(),
  files,
  coverage: {
    components: { covered: componentCoverageCount, total: requiredComponents.length, percent: componentCoverage },
    states: { covered: stateCoverageCount, total: requiredStates.length, percent: stateCoverage },
    tokens: { definitions: tokenDefs, references: tokenRefs, hardcodedPx, percent: tokenCoverage },
    reuse: { aliases: aliasCoverage, total: reusableAliases.length, percent: reuseCoverage },
    showcase: { used: showcaseCoverage, total: requiredComponents.length, percent: showcaseScore },
  },
  quality: {
    accessibilityScore,
    animationScore,
    responsiveScore,
    designSystemScore,
    enterpriseReadinessScore,
  },
  technicalDebt,
}

const artifactsDir = path.join(clientRoot, 'test-artifacts')
fs.mkdirSync(artifactsDir, { recursive: true })

const jsonPath = path.join(artifactsDir, 'sprint7-ds-v3-readiness.json')
const mdPath = path.join(artifactsDir, 'sprint7-ds-v3-readiness.md')

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8')

const markdown = [
  '# Sprint 7 DS V3 Readiness Report',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  '## Coverage',
  `- Component Coverage: ${componentCoverage}% (${componentCoverageCount}/${requiredComponents.length})`,
  `- State Coverage: ${stateCoverage}% (${stateCoverageCount}/${requiredStates.length})`,
  `- Token Coverage: ${tokenCoverage}% (refs=${tokenRefs}, hardcodedPx=${hardcodedPx})`,
  `- Reuse Coverage: ${reuseCoverage}% (${aliasCoverage}/${reusableAliases.length})`,
  `- Showcase Coverage: ${showcaseScore}% (${showcaseCoverage}/${requiredComponents.length})`,
  '',
  '## Quality Scores',
  `- Accessibility: ${accessibilityScore}%`,
  `- Animation: ${animationScore}%`,
  `- Responsive: ${responsiveScore}%`,
  `- Design System Score: ${designSystemScore}%`,
  `- Enterprise Readiness Score: ${enterpriseReadinessScore}%`,
  '',
  '## Technical Debt',
  `- Hardcoded px values in DS CSS: ${technicalDebt.hardcodedPxValues}`,
  `- Missing Components: ${technicalDebt.missingComponents.length ? technicalDebt.missingComponents.join(', ') : 'None'}`,
  `- Missing States: ${technicalDebt.missingStates.length ? technicalDebt.missingStates.join(', ') : 'None'}`,
  '',
].join('\n')

fs.writeFileSync(mdPath, markdown, 'utf8')

console.log(`Sprint 7 DS V3 report written: ${path.relative(clientRoot, jsonPath)}`)
console.log(`Sprint 7 DS V3 report written: ${path.relative(clientRoot, mdPath)}`)
