import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const openapi = JSON.parse(await readFile(path.join(root, 'openapi.json'), 'utf8'))

assert.equal(openapi.openapi, '3.1.0')
assert.equal(openapi.servers[0].url, 'https://api.kriterion.cc')
assert.ok(openapi.paths['/challenges/{slug}/submissions'].post)
assert.ok(openapi.components.securitySchemes.bearerAuth)

const markdownFiles = await findMarkdown(root)
for (const file of markdownFiles) {
  const text = await readFile(file, 'utf8')
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1]
    if (/^(?:https?:|#|mailto:)/.test(target)) continue
    const local = path.resolve(path.dirname(file), target.split('#')[0])
    await stat(local).catch(() => {
      throw new Error(`${path.relative(root, file)} has a broken link to ${target}`)
    })
  }
}

console.log(`checked ${markdownFiles.length} Markdown files and openapi.json`)

async function findMarkdown(directory) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'dist' || entry.name === 'node_modules') continue
    const item = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await findMarkdown(item))
    else if (entry.name.endsWith('.md')) found.push(item)
  }
  return found
}
