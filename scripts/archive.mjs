import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { targetConfig } from './release-config.mjs'

export async function extractAndInspectArchive(archive, target, directory) {
  const config = targetConfig(target)
  await mkdir(directory, { recursive: true })

  if (config.format === 'zip') {
    extractZip(archive, directory)
  } else {
    execFileSync('tar', ['-xzf', archive, '-C', directory], { stdio: 'inherit' })
  }

  const entries = await listEntries(directory)
  assert.deepEqual(entries, [config.executable], `${path.basename(archive)} has unexpected contents`)

  const executable = path.join(directory, config.executable)
  const metadata = await stat(executable)
  assert.ok(metadata.isFile(), `${config.executable} is not a file`)
  if (config.platform !== 'win32' && process.platform !== 'win32') {
    assert.equal(metadata.mode & 0o777, 0o755, `${config.executable} mode is not 0755`)
  }
  return executable
}

function extractZip(archive, directory) {
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Expand-Archive -LiteralPath '${escapePowerShell(archive)}' -DestinationPath '${escapePowerShell(directory)}' -Force`,
    ], { stdio: 'inherit' })
    return
  }
  execFileSync('unzip', ['-q', archive, '-d', directory], { stdio: 'inherit' })
}

async function listEntries(directory, prefix = '') {
  const entries = []
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name)
    if (entry.isDirectory()) entries.push(...await listEntries(directory, relative))
    else entries.push(relative)
  }
  return entries.sort()
}

function escapePowerShell(value) {
  return value.replaceAll("'", "''")
}
