import { createHash } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  archiveName,
  checksumName,
  NODE_VERSION,
  PRODUCT_NAME,
  TARGETS,
} from './release-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== '--directory') {
    throw new Error('use --directory <release-directory>')
  }
  return path.resolve(argv[1])
}

export async function generateRelease(directory) {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const assets = []

  for (const target of Object.keys(TARGETS).sort()) {
    const file = archiveName(packageJson.version, target)
    const location = path.join(directory, file)
    const bytes = await readFile(location)
    const metadata = await stat(location)
    assets.push({
      target,
      file,
      format: TARGETS[target].format,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: metadata.size,
    })
  }

  const checksumFile = checksumName(packageJson.version)
  const checksums = `${assets.map((asset) => `${asset.sha256}  ${asset.file}`).join('\n')}\n`
  await writeFile(path.join(directory, checksumFile), checksums)

  const manifest = {
    schemaVersion: 1,
    name: PRODUCT_NAME,
    version: packageJson.version,
    tag: `v${packageJson.version}`,
    nodeVersion: NODE_VERSION,
    generatedAt: new Date().toISOString(),
    assets,
  }
  await writeFile(path.join(directory, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`wrote ${checksumFile} and release-manifest.json`)
  return manifest
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateRelease(parseArguments(process.argv.slice(2))).catch((error) => {
    console.error(`error: ${error.message}`)
    process.exitCode = 1
  })
}
