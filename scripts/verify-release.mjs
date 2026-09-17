import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractAndInspectArchive } from './archive.mjs'
import {
  archiveName,
  checksumName,
  NODE_VERSION,
  PRODUCT_NAME,
  TARGETS,
} from './release-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function verifyRelease(directory) {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const manifest = JSON.parse(await readFile(path.join(directory, 'release-manifest.json'), 'utf8'))
  const checksumText = await readFile(path.join(directory, checksumName(packageJson.version)), 'utf8')
  assert.ok(checksumText.endsWith('\n'), 'SHA256SUMS needs a final newline')
  const checksumLines = checksumText.trimEnd().split('\n')
  const checksumEntries = new Map(checksumLines.map((line) => {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/)
    assert.ok(match, `invalid checksum line: ${line}`)
    return [match[2], match[1]]
  }))

  assert.deepEqual(
    Object.keys(manifest).sort(),
    ['assets', 'generatedAt', 'name', 'nodeVersion', 'schemaVersion', 'tag', 'version'],
  )
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.name, PRODUCT_NAME)
  assert.equal(manifest.version, packageJson.version)
  assert.equal(manifest.tag, `v${packageJson.version}`)
  assert.equal(manifest.nodeVersion, NODE_VERSION)
  assert.equal(new Date(manifest.generatedAt).toISOString(), manifest.generatedAt)
  assert.ok(Array.isArray(manifest.assets), 'manifest assets must be an array')
  assert.equal(manifest.assets.length, Object.keys(TARGETS).length)
  assert.equal(checksumLines.length, Object.keys(TARGETS).length)
  assert.equal(checksumEntries.size, Object.keys(TARGETS).length)

  const seenTargets = new Set()
  const seenFiles = new Set()
  const inspection = await mkdtemp(path.join(os.tmpdir(), 'kriterion-release-inspection-'))
  try {
    for (const asset of manifest.assets) {
      assert.deepEqual(Object.keys(asset).sort(), ['file', 'format', 'sha256', 'size', 'target'])
      assert.ok(TARGETS[asset.target], `unknown manifest target ${asset.target}`)
      assert.ok(!seenTargets.has(asset.target), `duplicate manifest target ${asset.target}`)
      assert.ok(!seenFiles.has(asset.file), `duplicate manifest file ${asset.file}`)
      seenTargets.add(asset.target)
      seenFiles.add(asset.file)
      assert.equal(asset.file, archiveName(packageJson.version, asset.target))
      assert.equal(asset.format, TARGETS[asset.target].format)
      assert.match(asset.sha256, /^[0-9a-f]{64}$/)
      assert.ok(Number.isSafeInteger(asset.size) && asset.size > 0, `${asset.file} size is invalid`)

      const location = path.join(directory, asset.file)
      const bytes = await readFile(location)
      const metadata = await stat(location)
      const digest = createHash('sha256').update(bytes).digest('hex')
      assert.equal(asset.size, metadata.size, `${asset.file} size differs`)
      assert.equal(asset.sha256, digest, `${asset.file} manifest checksum differs`)
      assert.equal(checksumEntries.get(asset.file), digest, `${asset.file} SHA256SUMS checksum differs`)
      await extractAndInspectArchive(location, asset.target, path.join(inspection, asset.target))
    }

    assert.deepEqual([...seenTargets].sort(), Object.keys(TARGETS).sort())
    assert.deepEqual([...checksumEntries.keys()].sort(), [...seenFiles].sort())
  } finally {
    await rm(inspection, { recursive: true, force: true })
  }

  console.log(`verified ${manifest.assets.length} release archives`)
}

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== '--directory') {
    throw new Error('use --directory <release-directory>')
  }
  return path.resolve(argv[1])
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyRelease(parseArguments(process.argv.slice(2))).catch((error) => {
    console.error(`error: ${error.message}`)
    process.exitCode = 1
  })
}
