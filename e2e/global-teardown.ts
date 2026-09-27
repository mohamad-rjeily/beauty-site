import { runDbScript } from './global-setup'

/** After the run, passed or failed: delete every test booking, the temporary admin and the test rate-limit rows. */
export default function globalTeardown() {
  runDbScript('clean')
}
