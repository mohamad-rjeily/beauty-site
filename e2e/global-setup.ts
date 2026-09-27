import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'

import { assertTestDatabase } from './guard'
import { ADMIN_EMAIL_DOMAIN, ADMIN_EMAIL_PREFIX } from './visitors'

/** Runs scripts/e2e-db.ts through `payload run` (it loads .env and the Payload config). */
export const runDbScript = (command: 'clean' | 'setup', env: Record<string, string> = {}) => {
  const result = spawnSync('npx', ['payload', 'run', 'scripts/e2e-db.ts', command], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation', ...env },
  })
  if (result.status !== 0) throw new Error(`scripts/e2e-db.ts ${command} failed.`)
}

/**
 * Before the run: guard, remove anything left by an interrupted run, fresh screenshot folder,
 * then a temporary admin with a random email and password. The credentials only live in this
 * process's environment (Playwright passes it on to the test worker); they are never printed
 * or written to disk.
 */
export default function globalSetup() {
  assertTestDatabase()
  rmSync('test-results/screens', { recursive: true, force: true })
  mkdirSync('test-results/screens', { recursive: true })
  rmSync('test-results/.visitor-counter', { force: true })

  runDbScript('clean')

  const email = `${ADMIN_EMAIL_PREFIX}${randomBytes(6).toString('hex')}${ADMIN_EMAIL_DOMAIN}`
  const password = randomBytes(24).toString('base64url')
  process.env.E2E_ADMIN_EMAIL = email
  process.env.E2E_ADMIN_PASSWORD = password
  try {
    runDbScript('setup', { E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password })
  } catch (error) {
    runDbScript('clean')
    throw error
  }
}
