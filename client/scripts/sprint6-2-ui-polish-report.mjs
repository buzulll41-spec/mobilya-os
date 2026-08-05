import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientRoot = path.join(__dirname, '..')
const repoRoot = path.join(clientRoot, '..')

const dsCssPath = path.join(clientRoot, 'src/mobile/design-system/MobileOpsV2.css')
const shellCssPath = path.join(clientRoot, 'src/styles/mobile-pwa.css')
const timingPath = path.join(repoRoot, 'test-artifacts/sprint6-1-first-action.json')

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

function round(v) {
  return Math.round(v * 100) / 100
}

function pickNumber(text, regex, fallback = 0) {
  const m = text.match(regex)
  if (!m) return fallback
  return Number(m[1])
}

const [dsCss, shellCss, timingRaw] = await Promise.all([
  readFile(dsCssPath, 'utf8'),
  readFile(shellCssPath, 'utf8'),
  readFile(timingPath, 'utf8').catch(() => JSON.stringify({ firstAction: { startFromHomeSec: 5 } })),
])

const timing = JSON.parse(timingRaw)
const firstActionSec = Number(timing?.firstAction?.startFromHomeSec ?? 5)

const actionRadius = pickNumber(dsCss, /\.evm-v2-action-card[\s\S]*?border-radius:\s*(\d+)px;/)
const actionPadding = pickNumber(dsCss, /\.evm-v2-action-card[\s\S]*?padding:\s*(\d+)px;/)
const titleRem = pickNumber(dsCss, /\.evm-v2-action-card__title[\s\S]*?font-size:\s*([\d.]+)rem;/)
const subtitleRem = pickNumber(dsCss, /\.evm-v2-action-card__subtitle[\s\S]*?font-size:\s*([\d.]+)rem;/)
const badgeRem = pickNumber(dsCss, /\.evm-v2-badge[\s\S]*?font-size:\s*([\d.]+)rem;/)
const actionGap = pickNumber(dsCss, /\.evm-v2-action-stack[\s\S]*?gap:\s*(\d+)px;/)
const minTouchMatches = (dsCss.match(/min-height:\s*44px/g) || []).length + (shellCss.match(/min-height:\s*44px/g) || []).length

const activeNavStrong = /\.mos-mobile-tabbar__btn\[data-active='true'\][\s\S]*?opacity:\s*1;/.test(shellCss)
const passiveNavSoft = /\.mos-mobile-tabbar__btn[\s\S]*?opacity:\s*0\.9;/.test(shellCss)
const navIconSoft = /\.mos-mobile-tabbar__icon[\s\S]*?color:\s*#94a3b8;/.test(shellCss)

const motionFast = pickNumber(dsCss, /--evm-v2-motion-fast:\s*(\d+)ms;/)
const motionBase = pickNumber(dsCss, /--evm-v2-motion-base:\s*(\d+)ms;/)
const motionSlow = pickNumber(dsCss, /--evm-v2-motion-slow:\s*(\d+)ms;/)
const motionInRange = [motionFast, motionBase, motionSlow].every((v) => v >= 150 && v <= 200)

const emptyHasIcon = /\.evm-v2-empty__icon/.test(dsCss)
const emptyHasPrimary = /\.evm-v2-empty button[\s\S]*?min-height:\s*44px;/.test(dsCss)

const typographyQuality = clamp(
  40 +
    (titleRem >= 1.25 && titleRem <= 1.38 ? 30 : 10) +
    (subtitleRem >= 0.86 && subtitleRem <= 0.9 ? 20 : 10) +
    (badgeRem >= 0.75 ? 10 : 5),
)

const spacingQuality = clamp(
  35 +
    (actionPadding >= 18 ? 25 : 10) +
    (actionGap >= 12 ? 25 : 10) +
    (actionRadius >= 18 ? 15 : 8),
)

const touchQuality = clamp(
  45 +
    (minTouchMatches >= 15 ? 35 : 18) +
    (emptyHasPrimary ? 20 : 10),
)

const appleGuidelineScore = clamp(
  35 +
    (activeNavStrong ? 18 : 8) +
    (passiveNavSoft ? 12 : 6) +
    (navIconSoft ? 10 : 5) +
    (motionInRange ? 15 : 5) +
    (actionRadius >= 18 ? 10 : 4),
)

const premiumFeelScore = clamp(
  30 +
    (actionPadding >= 18 ? 20 : 8) +
    (actionRadius >= 18 ? 15 : 6) +
    (/\.evm-v2-action-card[\s\S]*?box-shadow:/.test(dsCss) ? 12 : 4) +
    (emptyHasIcon ? 8 : 2) +
    (actionGap >= 12 ? 15 : 6),
)

const firstActionSpeedScore = clamp(100 - (Math.max(firstActionSec, 0.5) - 0.5) * 16)

const uiScore = round((typographyQuality + spacingQuality + touchQuality + appleGuidelineScore + premiumFeelScore + firstActionSpeedScore) / 6)

const report = {
  timestamp: new Date().toISOString(),
  metrics: {
    uiScore: round(uiScore),
    premiumFeelScore: round(premiumFeelScore),
    appleGuidelineScore: round(appleGuidelineScore),
    touchQuality: round(touchQuality),
    spacingQuality: round(spacingQuality),
    typographyQuality: round(typographyQuality),
  },
  checks: {
    firstActionStartSec: round(firstActionSec),
    actionCardRadiusPx: actionRadius,
    actionCardPaddingPx: actionPadding,
    actionCardGapPx: actionGap,
    actionTitleRem: titleRem,
    actionSubtitleRem: subtitleRem,
    badgeRem,
    navActiveStrong: activeNavStrong,
    navPassiveSoft: passiveNavSoft,
    navIconSoft,
    motionMs: { fast: motionFast, base: motionBase, slow: motionSlow },
    motionInRange150to200: motionInRange,
    minTouch44Count: minTouchMatches,
    emptyStateHasIcon: emptyHasIcon,
    emptyStateHasPrimaryAction44: emptyHasPrimary,
  },
}

const outDir = path.join(repoRoot, 'test-artifacts')
await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, 'sprint6-2-ui-polish-report.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
