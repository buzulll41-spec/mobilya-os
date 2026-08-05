import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'src')
const issues = []

const checks = [
  { name: 'ErpOpsSummaryStrip', defaultImport: true },
  { name: 'useModalDismiss', defaultImport: false },
  { name: 'PUBLISH_STATUS', defaultImport: false },
  { name: 'erpDetailActionClass', defaultImport: false },
  { name: 'erpOpsButtonClass', defaultImport: false },
  { name: 'erpTableOpClass', defaultImport: false },
  { name: 'formatProductMoney', defaultImport: false },
]

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (fs.statSync(full).isDirectory()) walk(full)
    else if (/\.(jsx|js)$/.test(entry)) check(full)
  }
}

function check(file) {
  const src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/')
  const importNames = new Set()
  const defaultImports = new Set()

  for (const m of src.matchAll(/^import\s+(.+?)\s+from\s+['"][^'"]+['"]/gm)) {
    const clause = m[1].trim()
    if (clause.startsWith('{')) {
      clause
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((part) => {
          const [name] = part.split(/\s+as\s+/)
          importNames.add(name.trim())
        })
    } else if (!clause.startsWith('*')) {
      defaultImports.add(clause.split(',')[0].trim())
    }
  }

  for (const { name, defaultImport } of checks) {
    if (!new RegExp(`\\b${name}\\b`).test(src)) continue
    const ok = defaultImport
      ? defaultImports.has(name) || importNames.has(name)
      : importNames.has(name)
    if (!ok) issues.push(`${rel}: missing ${name}`)
  }
}

walk(root)
console.log(issues.length ? issues.join('\n') : 'no issues')
