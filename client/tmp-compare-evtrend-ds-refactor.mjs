import { readdir, mkdir, writeFile } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { join, basename } from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const rootDir = join(process.cwd(), 'screenshots', 'evtrend-ds-refactor')
const beforeDir = join(rootDir, 'before')
const afterDir = join(rootDir, 'after')
const diffDir = join(rootDir, 'diff')
const reportPath = join(rootDir, 'pixel-compare-report.json')

await mkdir(diffDir, { recursive: true })

function loadPng(path) {
  return new Promise((resolve, reject) => {
    createReadStream(path)
      .pipe(new PNG())
      .on('parsed', function onParsed() {
        resolve(this)
      })
      .on('error', reject)
  })
}

const files = (await readdir(beforeDir)).filter((name) => name.endsWith('.png')).sort()
const report = []

for (const file of files) {
  const beforePath = join(beforeDir, file)
  const afterPath = join(afterDir, file)
  const beforePng = await loadPng(beforePath)
  const afterPng = await loadPng(afterPath)

  if (beforePng.width !== afterPng.width || beforePng.height !== afterPng.height) {
    report.push({
      screen: basename(file, '.png'),
      file,
      error: 'DIMENSION_MISMATCH',
      before: { width: beforePng.width, height: beforePng.height },
      after: { width: afterPng.width, height: afterPng.height },
    })
    continue
  }

  const diffPng = new PNG({ width: beforePng.width, height: beforePng.height })
  const diffPixels = pixelmatch(
    beforePng.data,
    afterPng.data,
    diffPng.data,
    beforePng.width,
    beforePng.height,
    { threshold: 0.1 },
  )

  const totalPixels = beforePng.width * beforePng.height
  const diffPercent = totalPixels > 0 ? (diffPixels / totalPixels) * 100 : 0

  const diffFile = join(diffDir, file)
  await new Promise((resolve, reject) => {
    diffPng
      .pack()
      .pipe(createWriteStream(diffFile))
      .on('finish', resolve)
      .on('error', reject)
  })

  report.push({
    screen: basename(file, '.png'),
    file,
    diffPixels,
    totalPixels,
    diffPercent: Number(diffPercent.toFixed(4)),
    diffImage: join('screenshots', 'evtrend-ds-refactor', 'diff', file),
  })
}

await writeFile(reportPath, JSON.stringify(report, null, 2))
console.log('PIXEL_COMPARE_OK', reportPath)
