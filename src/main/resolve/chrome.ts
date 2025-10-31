import { launch, LaunchedChrome } from 'chrome-launcher'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { dataDir } from '../utils/dirs'
import { getAppConfig } from '../config'
import { pacPort, startPacServer } from './server'

let launchedChrome: LaunchedChrome | null = null
let launchingChrome: Promise<void> | null = null

function chromeProfileDir(): string {
  const dir = path.join(dataDir(), 'Chrome')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function isChromeRunning(): boolean {
  if (!launchedChrome) {
    return false
  }
  if (launchedChrome.process?.exitCode !== null && launchedChrome.process?.exitCode !== undefined) {
    return false
  }
  if (launchedChrome.pid) {
    try {
      process.kill(launchedChrome.pid, 0)
      return true
    } catch {
      return false
    }
  }
  return false
}

export async function launchChrome(): Promise<void> {
  if (launchingChrome) {
    await launchingChrome
    return
  }

  launchingChrome = (async () => {
    const { sysProxy } = await getAppConfig()
    const host = sysProxy?.host || '127.0.0.1'

    await startPacServer(true)
    if (!pacPort) {
      throw new Error('PAC server is not available')
    }

    const pacUrl = `http://${host}:${pacPort}/pac`
    const profileDir = chromeProfileDir()

    if (isChromeRunning()) {
      return
    }

    launchedChrome = await launch({
      userDataDir: profileDir,
      ignoreDefaultFlags: true,
      chromeFlags: [
        `--proxy-pac-url=${pacUrl}`,
        '--proxy-bypass-list=<-loopback>',
        '--disable-background-networking',
        '--no-first-run',
        '--no-default-browser-check'
      ],
      startingUrl: 'chrome://newtab'
    })

    launchedChrome.process?.once('exit', () => {
      launchedChrome = null
    })
  })()

  try {
    await launchingChrome
  } finally {
    launchingChrome = null
  }
}
