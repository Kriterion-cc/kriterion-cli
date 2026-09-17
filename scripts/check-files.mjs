import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = await findFiles(root)

for (const file of files) {
  const text = await readFile(file, 'utf8')
  const relative = path.relative(root, file)
  assert.ok(!text.includes('\r'), `${relative} contains a carriage return`)
  assert.ok(text.endsWith('\n'), `${relative} needs a final newline`)
  for (const [index, line] of text.split('\n').entries()) {
    assert.ok(!/[ \t]+$/.test(line), `${relative}:${index + 1} has trailing whitespace`)
  }
}

console.log(`checked whitespace in ${files.length} files`)

async function findFiles(directory) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const item = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await findFiles(item))
    else found.push(item)
  }
  return found
}
