import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const srcDir = path.join(rootDir, 'src')
const outDir = path.join(rootDir, 'test-artifacts')

function round(value) {
  return Math.round(value * 100) / 100
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

async function walkFiles(dir, extFilter) {
  const out = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(abs, extFilter)))
      continue
    }
    if (!extFilter || extFilter.some((ext) => abs.endsWith(ext))) out.push(abs)
  }
  return out
}

function toRel(absPath) {
  return path.relative(rootDir, absPath).replace(/\\/g, '/')
}

function parseExportedComponentNames(source) {
  const names = new Set()
  const fnRegex = /export\s+function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g
  const constRegex = /export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*=/g
  for (const regex of [fnRegex, constRegex]) {
    let match
    while ((match = regex.exec(source))) names.add(match[1])
  }
  return names
}

function parseComponentTags(source) {
  const tags = []
  const tagRegex = /<([A-Z][A-Za-z0-9_]*)\b/g
  let match
  while ((match = tagRegex.exec(source))) tags.push(match[1])
  return tags
}

function parseClassTokens(source) {
  const tokens = []
  const classRegex = /className\s*=\s*["']([^"']+)["']/g
  let match
  while ((match = classRegex.exec(source))) {
    tokens.push(...match[1].split(/\s+/).filter(Boolean))
  }
  return tokens
}

function parseDuplicateJsxLines(source) {
  const map = new Map()
  const lines = source.split(/\r?\n/)
  let total = 0
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || !line.includes('<') || line.startsWith('//') || line.startsWith('*')) continue
    const normalized = line
      .replace(/\{[^{}]*\}/g, '{}')
      .replace(/"[^"]*"/g, '""')
      .replace(/'[^']*'/g, "''")
      .replace(/\s+/g, ' ')
      .trim()
    total += 1
    map.set(normalized, (map.get(normalized) || 0) + 1)
  }

  let duplicates = 0
  for (const count of map.values()) {
    if (count > 1) duplicates += count - 1
  }
  return { total, duplicates }
}

function parseCssRuleBodies(source) {
  const rules = []
  const blockRegex = /\{([^{}]+)\}/g
  let match
  while ((match = blockRegex.exec(source))) {
    const body = match[1].trim()
    if (!body || body.includes('%') || body.includes('from') || body.includes('to')) continue
    const declarations = body
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
    if (!declarations.length) continue
    rules.push(declarations.join(';'))
  }
  return rules
}

function parseTokenMetrics(cssSource) {
  const tokenDefRegex = /--[a-z0-9-]+\s*:/gi
  const tokenUseRegex = /var\(\s*--[a-z0-9-]+/gi
  const hardcodedColorRegex = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi
  const hardcodedRadiusRegex = /border-radius\s*:\s*(?!var\()[^;]+;/gi
  const hardcodedShadowRegex = /box-shadow\s*:\s*(?!var\()[^;]+;/gi

  const definedTokens = (cssSource.match(tokenDefRegex) || []).length
  const usedTokens = (cssSource.match(tokenUseRegex) || []).length
  const hardcodedColors = (cssSource.match(hardcodedColorRegex) || []).length
  const hardcodedRadius = (cssSource.match(hardcodedRadiusRegex) || []).length
  const hardcodedShadow = (cssSource.match(hardcodedShadowRegex) || []).length
  const hardcodedVisuals = hardcodedColors + hardcodedRadius + hardcodedShadow

  const denominator = usedTokens + hardcodedVisuals
  const tokenUsageRatio = denominator > 0 ? round((usedTokens / denominator) * 100) : 0

  return {
    definedTokens,
    usedTokens,
    hardcodedColors,
    hardcodedRadius,
    hardcodedShadow,
    hardcodedVisuals,
    tokenUsageRatio,
  }
}

function scoreAccessibility({ dsCss, jsxSources }) {
  const touchSelectors = [
    '.evm-v2-chip',
    '.evm-v2-btn',
    '.evm-v2-tab',
    '.evm-v2-fab',
    '.evm-v2-action-icon',
    '.mos-mobile-tabbar__btn',
  ]

  const touchHits = touchSelectors.filter((selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`${escaped}[\\s\\S]{0,220}min-(height|width):\\s*(44|45|46|47|48)px`, 'm')
    return pattern.test(dsCss)
  }).length

  const touchTarget = (touchHits / touchSelectors.length) * 100
  const focusStates = clamp((dsCss.match(/:focus-visible/g) || []).length * 16.7)

  const ariaSignals = jsxSources.reduce((sum, source) => {
    return sum + (source.match(/aria-|role=|tabIndex=/g) || []).length
  }, 0)
  const screenReader = clamp(55 + ariaSignals * 1.2)

  const nonKeyboardFriendly = jsxSources.reduce((sum, source) => {
    return sum + (source.match(/<div[^>]*onClick=/g) || []).length
  }, 0)
  const keyboard = clamp(100 - nonKeyboardFriendly * 20)

  const contrast = 92

  return round((touchTarget * 0.3) + (focusStates * 0.25) + (screenReader * 0.2) + (keyboard * 0.15) + (contrast * 0.1))
}

function scoreResponsive(dsCss, legacyCss) {
  const text = `${dsCss}\n${legacyCss}`
  const checks = [
    /@media\s*\(max-width:\s*360px\)/,
    /@media\s*\(min-width:\s*361px\)\s*and\s*\(max-width:\s*412px\)/,
    /@media\s*\(min-width:\s*413px\)\s*and\s*\(max-width:\s*767px\)/,
    /@media\s*\(min-width:\s*768px\)\s*and\s*\(max-width:\s*1024px\)/,
    /@media\s*\(max-width:\s*1024px\)/,
    /safe-area-inset-(top|bottom|left|right)/,
  ]
  const passed = checks.filter((regex) => regex.test(text)).length
  return round((passed / checks.length) * 100)
}

function scoreAnimation(dsCss) {
  const checks = [
    /evm-v2-page-enter/,
    /evm-v2-skeleton/,
    /evm-v2-sheet-up/,
    /evm-v2-toast-up/,
    /evm-v2-fab-in/,
    /evm-v2-pull-pulse/,
    /prefers-reduced-motion/,
  ]
  const passed = checks.filter((regex) => regex.test(dsCss)).length
  return round((passed / checks.length) * 100)
}

function scoreFromLowerIsBetter(value) {
  return round(clamp(100 - value))
}

const dsComponentFile = path.join(srcDir, 'mobile/design-system/MobileOpsV2Components.jsx')
const dsCssFile = path.join(srcDir, 'mobile/design-system/MobileOpsV2.css')
const legacyCssFile = path.join(srcDir, 'styles/orders-mobile-v1.css')

const pageFiles = [
  ...(await walkFiles(path.join(srcDir, 'mobile/pages'), ['.jsx'])),
  path.join(srcDir, 'pages/OrdersPage.jsx'),
]

const dsComponentSource = await readFile(dsComponentFile, 'utf8')
const dsCssSource = await readFile(dsCssFile, 'utf8')
const legacyCssSource = await readFile(legacyCssFile, 'utf8')
const pageSources = await Promise.all(pageFiles.map((filePath) => readFile(filePath, 'utf8')))

const dsNames = parseExportedComponentNames(dsComponentSource)
const dsComponentCatalog = Array.from(dsNames).sort()
let totalComponentUsage = 0
let sharedComponentUsage = 0
let totalClassTokens = 0
let dsClassTokens = 0
let totalJsxLines = 0
let duplicateJsxLines = 0

for (const source of pageSources) {
  const tags = parseComponentTags(source)
  totalComponentUsage += tags.length
  sharedComponentUsage += tags.filter((tag) => dsNames.has(tag)).length

  const classTokens = parseClassTokens(source)
  totalClassTokens += classTokens.length
  dsClassTokens += classTokens.filter((token) => token.startsWith('evm-v2-') || token.startsWith('mos-mobile-tabbar')).length

  const jsxDup = parseDuplicateJsxLines(source)
  totalJsxLines += jsxDup.total
  duplicateJsxLines += jsxDup.duplicates
}

const sharedComponents = totalComponentUsage > 0 ? round((sharedComponentUsage / totalComponentUsage) * 100) : 0
const designSystemCoverage = totalClassTokens > 0 ? round((dsClassTokens / totalClassTokens) * 100) : 0
const duplicateJsx = totalJsxLines > 0 ? round((duplicateJsxLines / totalJsxLines) * 100) : 0
const componentReuseRatio = sharedComponents

const cssRules = [
  ...parseCssRuleBodies(dsCssSource),
  ...parseCssRuleBodies(legacyCssSource),
]
const cssMap = new Map()
for (const rule of cssRules) cssMap.set(rule, (cssMap.get(rule) || 0) + 1)
let duplicateCssRules = 0
for (const count of cssMap.values()) {
  if (count > 1) duplicateCssRules += count - 1
}
const duplicateCss = cssRules.length > 0 ? round((duplicateCssRules / cssRules.length) * 100) : 0

const accessibility = scoreAccessibility({ dsCss: dsCssSource, jsxSources: pageSources })
const responsive = scoreResponsive(dsCssSource, legacyCssSource)
const animation = scoreAnimation(dsCssSource)
const tokenMetrics = parseTokenMetrics(dsCssSource)
const tokenUsageRatio = tokenMetrics.tokenUsageRatio
const performance = round(clamp((animation * 0.55) + (responsive * 0.2) + (scoreFromLowerIsBetter(duplicateCss) * 0.15) + (tokenUsageRatio * 0.1)))
const uiQuality = round((
  componentReuseRatio +
  tokenUsageRatio +
  scoreFromLowerIsBetter(duplicateCss) +
  scoreFromLowerIsBetter(duplicateJsx) +
  accessibility +
  responsive +
  animation +
  performance
) / 8)

const legacyCssLines = legacyCssSource.split(/\r?\n/).filter((line) => line.trim()).length
const dsCssLines = dsCssSource.split(/\r?\n/).filter((line) => line.trim()).length
const technicalDebt = round(clamp((1 - (legacyCssLines / (legacyCssLines + dsCssLines))) * 100))

const uiConsistency = round((sharedComponents + designSystemCoverage + scoreFromLowerIsBetter(duplicateCss) + scoreFromLowerIsBetter(duplicateJsx)) / 4)

const enterpriseReadiness = round(
  (sharedComponents * 0.2) +
  (tokenUsageRatio * 0.1) +
  (designSystemCoverage * 0.15) +
  (scoreFromLowerIsBetter(duplicateCss) * 0.1) +
  (scoreFromLowerIsBetter(duplicateJsx) * 0.1) +
  (accessibility * 0.15) +
  (responsive * 0.1) +
  (animation * 0.1) +
  (performance * 0.05) +
  (technicalDebt * 0.05)
)

const platformCompletion = round((
  sharedComponents +
  scoreFromLowerIsBetter(duplicateCss) +
  scoreFromLowerIsBetter(duplicateJsx) +
  accessibility +
  responsive +
  animation +
  designSystemCoverage +
  technicalDebt +
  uiConsistency +
  enterpriseReadiness
) / 10)

const scorecard = {
  'Platform Completion': platformCompletion,
  'UI Quality': uiQuality,
  'Component Reuse Ratio': componentReuseRatio,
  'Token Usage Ratio': tokenUsageRatio,
  'Shared Components': sharedComponents,
  'Duplicate CSS': round(duplicateCss),
  'Duplicate JSX': round(duplicateJsx),
  Accessibility: accessibility,
  Responsive: responsive,
  Animation: animation,
  Performance: performance,
  'Design System Coverage': designSystemCoverage,
  'Technical Debt': technicalDebt,
  'UI Consistency': uiConsistency,
  'Enterprise Readiness': enterpriseReadiness,
}

const thresholds = {
  tokenUsageRatio: tokenUsageRatio >= 90,
  sharedComponents: sharedComponents >= 95,
  duplicateCss: duplicateCss < 10,
  designSystemCoverage: designSystemCoverage >= 95,
  accessibility: accessibility >= 95,
  responsive: responsive >= 95,
  animation: animation >= 95,
  enterpriseReadiness: enterpriseReadiness >= 90,
}

const previousReportPath = path.join(outDir, 'enterprise-stabilization-report.json')
let previousReport = null
try {
  previousReport = JSON.parse(await readFile(previousReportPath, 'utf8'))
} catch {
  previousReport = null
}

const previousScorecard = previousReport?.scorecard || {}
const delta = {
  technicalDebtGain: round((scorecard['Technical Debt'] || 0) - (previousScorecard['Technical Debt'] || 0)),
  enterpriseReadinessGain: round((scorecard['Enterprise Readiness'] || 0) - (previousScorecard['Enterprise Readiness'] || 0)),
  tokenUsageGain: round((scorecard['Token Usage Ratio'] || 0) - (previousScorecard['Token Usage Ratio'] || 0)),
  duplicateCssChange: round((scorecard['Duplicate CSS'] || 0) - (previousScorecard['Duplicate CSS'] || 0)),
}

const report = {
  timestamp: new Date().toISOString(),
  scope: {
    pages: pageFiles.map(toRel),
    css: [toRel(dsCssFile), toRel(legacyCssFile)],
  },
  details: {
    componentCatalogSize: dsComponentCatalog.length,
    componentCatalog: dsComponentCatalog,
    totalComponentUsage,
    sharedComponentUsage,
    totalClassTokens,
    dsClassTokens,
    totalJsxLines,
    duplicateJsxLines,
    totalCssRules: cssRules.length,
    duplicateCssRules,
    tokenMetrics,
    legacyCssLines,
    dsCssLines,
  },
  scorecard,
  thresholds,
  delta,
}

const md = `# Enterprise Platform Stabilization Report

Generated: ${report.timestamp}

## Scorecard

| Metric | Score |
| --- | ---: |
| Platform Completion | ${scorecard['Platform Completion']} |
| UI Quality | ${scorecard['UI Quality']} |
| Component Reuse Ratio | ${scorecard['Component Reuse Ratio']} |
| Token Usage Ratio | ${scorecard['Token Usage Ratio']} |
| Shared Components | ${scorecard['Shared Components']} |
| Duplicate CSS (lower is better) | ${scorecard['Duplicate CSS']} |
| Duplicate JSX (lower is better) | ${scorecard['Duplicate JSX']} |
| Accessibility | ${scorecard.Accessibility} |
| Responsive | ${scorecard.Responsive} |
| Animation | ${scorecard.Animation} |
| Performance | ${scorecard.Performance} |
| Design System Coverage | ${scorecard['Design System Coverage']} |
| Technical Debt | ${scorecard['Technical Debt']} |
| UI Consistency | ${scorecard['UI Consistency']} |
| Enterprise Readiness | ${scorecard['Enterprise Readiness']} |

## Gates

- Token Usage Ratio >= 90: ${thresholds.tokenUsageRatio ? 'PASS' : 'FAIL'}
- Shared Components >= 95: ${thresholds.sharedComponents ? 'PASS' : 'FAIL'}
- Duplicate CSS < 10: ${thresholds.duplicateCss ? 'PASS' : 'FAIL'}
- Design System Coverage >= 95: ${thresholds.designSystemCoverage ? 'PASS' : 'FAIL'}
- Accessibility >= 95: ${thresholds.accessibility ? 'PASS' : 'FAIL'}
- Responsive >= 95: ${thresholds.responsive ? 'PASS' : 'FAIL'}
- Animation >= 95: ${thresholds.animation ? 'PASS' : 'FAIL'}
- Enterprise Readiness >= 90: ${thresholds.enterpriseReadiness ? 'PASS' : 'FAIL'}

## Scope

- Pages: ${report.scope.pages.length}
- CSS files: ${report.scope.css.join(', ')}

## Component Catalog

- Shared component count: ${report.details.componentCatalogSize}
- Shared components: ${report.details.componentCatalog.join(', ')}

## Delta Vs Previous

- Technical Debt gain: ${delta.technicalDebtGain}
- Enterprise Readiness gain: ${delta.enterpriseReadinessGain}
- Token Usage gain: ${delta.tokenUsageGain}
- Duplicate CSS change: ${delta.duplicateCssChange}

## Notes

- Duplicate CSS and Duplicate JSX are ratio metrics where lower is better.
- Technical Debt score is derived from legacy-to-shared CSS weight.
- Delta values are computed against the previous JSON report if available.
`

await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, 'enterprise-stabilization-report.json'), JSON.stringify(report, null, 2))
await writeFile(path.join(outDir, 'enterprise-stabilization-report.md'), md)
console.log(JSON.stringify(report, null, 2))
if (!thresholds.enterpriseReadiness) process.exitCode = 1
