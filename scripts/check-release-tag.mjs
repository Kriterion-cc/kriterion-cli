import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const tag = process.argv[2]

assert.ok(tag, 'give the release tag')
assert.equal(tag, `v${packageJson.version}`, `tag ${tag} does not match package version ${packageJson.version}`)

console.log(`checked release tag ${tag}`)
