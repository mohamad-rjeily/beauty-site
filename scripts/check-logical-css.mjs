/**
 * RTL guard: the public site must use logical CSS (ms-/me-/ps-/pe-/start-/end-), never
 * physical left/right classes, so Arabic mirrors correctly. Runs as part of `npm run lint`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['src/components', 'src/app/(frontend)']
// Physical utilities: ml-, mr-, pl-, pr-, left-, right-, border-l/r, rounded-l/r(-..), text-left/right, float-left/right.
const PHYSICAL = /(?<![\w-])-?(?:m[lr]|p[lr]|left|right|border-[lr]|rounded-[lr]|rounded-[tb][lr]|text-(?:left|right)|float-(?:left|right)|scroll-[mp][lr])(?:-|(?=["'\s`]))/

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(tsx|ts|css)$/.test(entry)) files.push(path)
  }
}
ROOTS.forEach(walk)

const problems = []
for (const file of files) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const attr of line.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const classes = (attr[1] ?? attr[2]).split(/\s+/)
        for (const cls of classes) {
          const bare = cls.split(':').pop()
          if (PHYSICAL.test(` ${bare} `.replace(/^ /, ' ').trim() + ' ')) problems.push(`${file}:${i + 1}  ${cls}`)
        }
      }
    })
}

if (problems.length) {
  console.error('Physical left/right classes found (use logical ms-/me-/ps-/pe-/start-/end-):\n' + problems.join('\n'))
  process.exit(1)
}
console.log(`Logical CSS check: ${files.length} files, no physical left/right classes.`)
