import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { after, before, test } from 'node:test'
import {
  archiveName,
  checksumName,
  hostTarget,
  NODE_VERSION,
  TARGETS,
  targetConfig,
} from '../scripts/release-config.mjs'
import { parseArguments, validateBuildEnvironment } from '../scripts/build-sea.mjs'
import { generateRelease } from '../scripts/generate-release.mjs'
import { verifyRelease } from '../scripts/verify-release.mjs'

const exec = promisify(execFile)
let releaseDirectory

before(async () => {
  releaseDirectory = await mkdtemp(path.join(os.tmpdir(), 'kriterion-release-test-'))
  await createTestArchives(releaseDirectory)
})

after(async () => {
  await rm(releaseDirectory, { recursive: true, force: true })
})

test('defines all supported native targets and archive names', () => {
  assert.deepEqual(Object.keys(TARGETS), [
    'darwin-arm64',
    'darwin-x64',
    'linux-arm64',
    'linux-x64',
    'windows-x64',
  ])
  assert.equal(archiveName('0.1.0', 'darwin-arm64'), 'kriterion-v0.1.0-darwin-arm64.tar.gz')
  assert.equal(archiveName('0.1.0', 'windows-x64'), 'kriterion-v0.1.0-windows-x64.zip')
  assert.equal(checksumName('0.1.0'), 'kriterion-v0.1.0-SHA256SUMS')
})

test('rejects unsupported and cross-architecture build targets', () => {
  assert.throws(() => targetConfig('freebsd-x64'), /unsupported target/)
  assert.throws(
    () => validateBuildEnvironment('freebsd-x64', NODE_VERSION),
    /unsupported target/,
  )
  const differentTarget = hostTarget() === 'linux-x64' ? 'darwin-arm64' : 'linux-x64'
  assert.throws(
    () => validateBuildEnvironment(differentTarget, NODE_VERSION),
    /does not match this/,
  )
})

test('rejects a different Node.js version for native builds', () => {
  assert.throws(
    () => validateBuildEnvironment(hostTarget(), '24.20.0'),
    /Node\.js 24\.21\.0 is required/,
  )
})

test('parses required native build options', () => {
  assert.equal(parseArguments(['--target', hostTarget()]).target, hostTarget())
  assert.throws(() => parseArguments([]), /give --target/)
  assert.throws(() => parseArguments(['--bad', 'value']), /unknown or incomplete option/)
})

test('generates and checks the release manifest and checksums', async () => {
  const manifest = await generateRelease(releaseDirectory)
  await verifyRelease(releaseDirectory)

  assert.equal(manifest.nodeVersion, NODE_VERSION)
  assert.equal(manifest.assets.length, 5)
  assert.deepEqual(manifest.assets.map((asset) => asset.target), Object.keys(TARGETS).sort())
  const checksums = await readFile(path.join(releaseDirectory, checksumName('0.1.0')), 'utf8')
  assert.equal(checksums.trimEnd().split('\n').length, 5)
  assert.match(checksums, /^[0-9a-f]{64}  kriterion-v0\.1\.0-/m)
})

test('rejects missing checksum entries', async () => {
  const checksumFile = path.join(releaseDirectory, checksumName('0.1.0'))
  const original = await readFile(checksumFile, 'utf8')
  await writeFile(checksumFile, `${original.split('\n')[0]}\n`)
  await assert.rejects(verifyRelease(releaseDirectory), /Expected values to be strictly equal/)
  await writeFile(checksumFile, original)
  await verifyRelease(releaseDirectory)
})

test('rejects incorrect manifest metadata', async () => {
  const manifestFile = path.join(releaseDirectory, 'release-manifest.json')
  const original = await readFile(manifestFile, 'utf8')
  const mutations = [
    (manifest) => { manifest.name = 'other' },
    (manifest) => { manifest.assets[0].target = 'other-target' },
    (manifest) => { manifest.assets[0].file = 'other-file.tar.gz' },
    (manifest) => { manifest.assets[0].size += 1 },
    (manifest) => { manifest.assets[0].format = 'zip' },
  ]
  for (const mutate of mutations) {
    const manifest = JSON.parse(original)
    mutate(manifest)
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`)
    await assert.rejects(verifyRelease(releaseDirectory))
  }
  await writeFile(manifestFile, original)
  await verifyRelease(releaseDirectory)
})

test('detects an archive changed after checksum generation', async () => {
  const archive = path.join(releaseDirectory, archiveName('0.1.0', 'linux-x64'))
  const original = await readFile(archive)
  await writeFile(archive, 'changed archive\n')
  await assert.rejects(verifyRelease(releaseDirectory), /size differs|checksum differs/)
  await writeFile(archive, original)
  await verifyRelease(releaseDirectory)
})

test('accepts only the package release tag', async () => {
  const script = fileURLToPath(new URL('../scripts/check-release-tag.mjs', import.meta.url))
  const accepted = await exec(process.execPath, [script, 'v0.1.0'])
  assert.match(accepted.stdout, /checked release tag v0\.1\.0/)
  await assert.rejects(
    exec(process.execPath, [script, 'v0.2.0']),
    (error) => error.code === 1 && error.stderr.includes('does not match package version'),
  )
})

async function createTestArchives(directory) {
  const source = path.join(directory, 'archive-source')
  await mkdir(source)
  const unixExecutable = path.join(source, 'kriterion')
  const windowsExecutable = path.join(source, 'kriterion.exe')
  await writeFile(unixExecutable, '#!/bin/sh\nexit 0\n')
  await writeFile(windowsExecutable, 'test executable\n')
  if (process.platform !== 'win32') await chmod(unixExecutable, 0o755)

  for (const target of Object.keys(TARGETS)) {
    const archive = path.join(directory, archiveName('0.1.0', target))
    if (TARGETS[target].format === 'zip') {
      await createZip(windowsExecutable, archive)
    } else {
      await exec('tar', ['-czf', archive, '-C', source, 'kriterion'])
    }
  }
}

async function createZip(executable, archive) {
  if (process.platform === 'win32') {
    const command = `Compress-Archive -LiteralPath '${escapePowerShell(executable)}' -DestinationPath '${escapePowerShell(archive)}' -Force`
    await exec('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command])
    return
  }
  await exec('zip', ['-q', '-j', archive, executable])
}

function escapePowerShell(value) {
  return value.replaceAll("'", "''")
}
