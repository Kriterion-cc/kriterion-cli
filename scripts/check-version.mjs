import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NODE_VERSION, TARGETS } from './release-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const cli = await readFile(path.join(root, 'kriterion'), 'utf8')
const workflow = await readFile(path.join(root, '.github/workflows/release.yml'), 'utf8')
const cliVersion = cli.match(/^const VERSION = '([^']+)'$/m)?.[1]

assert.ok(cliVersion, 'kriterion must declare VERSION')
assert.equal(cliVersion, packageJson.version, 'the CLI and package versions differ')
assert.match(workflow, new RegExp(`NODE_VERSION: ['\"]${escapeRegExp(NODE_VERSION)}['\"]`))
assert.match(workflow, /tags:\s*\n\s*- ['"]v\*['"]/)
for (const [target, config] of Object.entries(TARGETS)) {
  const matrixEntry = new RegExp(
    `- target: ${escapeRegExp(target)}\\s+runner: ${escapeRegExp(config.runner)}`,
  )
  assert.match(workflow, matrixEntry, `the workflow runner differs for ${target}`)
}
const actionReferences = [...workflow.matchAll(/uses:\s+(\S+)/g)].map((match) => match[1])
assert.ok(actionReferences.length > 0, 'the release workflow has no actions')
for (const reference of actionReferences) {
  assert.match(reference, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `${reference} is not pinned to a SHA`)
}

console.log(`checked CLI ${packageJson.version} with Node.js ${NODE_VERSION}`)

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
