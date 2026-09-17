import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { after, before, test } from 'node:test'

const exec = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cli = path.join(root, 'kriterion')
const nativeCli = process.env.KRITERION_TEST_EXECUTABLE
const requests = []
let server
let api

before(async () => {
  server = http.createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    requests.push({ method: request.method, url: request.url, headers: request.headers, body })
    response.setHeader('content-type', 'application/json')
    if (request.url === '/auth/me') {
      response.end(JSON.stringify({ account: { handle: 'participant' } }))
      return
    }
    if (request.url === '/challenges' && request.headers.authorization === 'Bearer redirect-token') {
      response.statusCode = 302
      response.setHeader('location', `${api}/auth/me`)
      response.end(JSON.stringify({ redirect: true }))
      return
    }
    if (request.url === '/challenges') {
      response.end(JSON.stringify({ challenges: [{ slug: 'sample-challenge' }] }))
      return
    }
    if (request.url === '/challenges/sample-challenge') {
      response.end(JSON.stringify({ challenge: { slug: 'sample-challenge' } }))
      return
    }
    if (request.url === '/challenges/zero-exit-code') {
      response.statusCode = 422
      response.end(JSON.stringify({ error: { message: 'rejected', exitCode: 0 } }))
      return
    }
    if (request.url === '/challenges/arbitrary-exit-code') {
      response.statusCode = 401
      response.end(JSON.stringify({ error: { message: 'unauthorized', exitCode: 99 } }))
      return
    }
    if (request.url === '/boards/sample-challenge') {
      response.end(JSON.stringify({ entries: [] }))
      return
    }
    if (request.url === '/submissions/submission-1') {
      response.end(JSON.stringify({ submission: { id: 'submission-1' } }))
      return
    }
    if (request.url === '/challenges/sample-challenge/submissions') {
      response.statusCode = 201
      response.end(JSON.stringify({ submissionId: 'submission-1', evaluationId: 'evaluation-1' }))
      return
    }
    response.statusCode = 404
    response.end(JSON.stringify({ error: { message: 'not found', exitCode: 1 } }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  api = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('shows help and version before environment validation', async () => {
  const invalidEnvironment = {
    ...process.env,
    KRITERION_API: 'http://example.com',
    CF_ACCESS_CLIENT_ID: 'incomplete-pair',
    CF_ACCESS_CLIENT_SECRET: '',
  }
  const help = await execCli(['--help'], { env: invalidEnvironment })
  const version = await execCli(['--version'], { env: invalidEnvironment })
  assert.match(help.stdout, /Kriterion participant CLI/)
  assert.equal(version.stdout.trim(), '0.1.0')
})

test('shows the authenticated account and forwards access headers', async () => {
  const { stdout } = await execCli(['--api', api, 'whoami'], {
    env: {
      ...process.env,
      KRITERION_TOKEN: 'test-token',
      CF_ACCESS_CLIENT_ID: 'access-id',
      CF_ACCESS_CLIENT_SECRET: 'access-secret',
    },
  })
  assert.equal(JSON.parse(stdout).account.handle, 'participant')
  const request = requests.at(-1)
  assert.equal(request.headers.authorization, 'Bearer test-token')
  assert.equal(request.headers['cf-access-client-id'], 'access-id')
  assert.equal(request.headers['cf-access-client-secret'], 'access-secret')
})

test('reads public participant resources', async () => {
  const commands = [
    [['challenge', 'list'], (body) => body.challenges[0].slug],
    [['challenge', 'show', 'sample-challenge'], (body) => body.challenge.slug],
    [['board', 'sample-challenge'], (body) => body.entries.length],
    [['submission', 'show', 'submission-1'], (body) => body.submission.id],
  ]
  const expected = ['sample-challenge', 'sample-challenge', 0, 'submission-1']
  for (const [index, [args, select]] of commands.entries()) {
    const { stdout } = await execCli(['--api', api, ...args])
    assert.equal(select(JSON.parse(stdout)), expected[index])
  }
})

test('submits one pinned public repository', async () => {
  const commit = 'a'.repeat(40)
  const { stdout } = await execCli([
    '--api', api,
    'submit',
    '--challenge', 'sample-challenge',
    '--repo', 'https://github.com/example/entry',
    '--commit', commit,
    '--model', 'example-model',
  ], { env: { ...process.env, KRITERION_TOKEN: 'test-token' } })

  assert.equal(JSON.parse(stdout).submissionId, 'submission-1')
  const request = requests.at(-1)
  assert.equal(request.method, 'POST')
  assert.equal(request.url, '/challenges/sample-challenge/submissions')
  assert.deepEqual(JSON.parse(request.body), {
    repo: 'https://github.com/example/entry',
    commit,
    idempotencyKey: '37907ab1571933cab74e836e7f06c904',
    modelAttribution: 'example-model',
  })
})

test('rejects an invalid commit before it calls the API', async () => {
  const count = requests.length
  await assert.rejects(
    execCli([
      '--api', api,
      'submit',
      '--challenge', 'sample-challenge',
      '--repo', 'https://github.com/example/entry',
      '--commit', 'main',
    ], { env: { ...process.env, KRITERION_TOKEN: 'test-token' } }),
    (error) => error.code === 1 && error.stderr.includes('commit is invalid'),
  )
  assert.equal(requests.length, count)
})

test('requires a token for authenticated commands', async () => {
  await assert.rejects(
    execCli(['--api', api, 'whoami'], {
      env: { ...process.env, KRITERION_TOKEN: '' },
    }),
    (error) => error.code === 4 && error.stderr.includes('KRITERION_TOKEN is required'),
  )
})

test('requires both Cloudflare Access service-token variables', async () => {
  await assert.rejects(
    execCli(['--api', api, 'challenge', 'list'], {
      env: { ...process.env, CF_ACCESS_CLIENT_ID: 'access-id', CF_ACCESS_CLIENT_SECRET: '' },
    }),
    (error) => error.code === 1 && error.stderr.includes('set both Cloudflare Access'),
  )
})

test('rejects remote plain HTTP before making a request', async () => {
  await assert.rejects(
    execCli(['--api', 'http://example.com', 'challenge', 'list']),
    (error) => error.code === 1 && error.stderr.includes('--api must use https'),
  )
})

test('refuses redirects without forwarding authentication credentials', async () => {
  const count = requests.length
  await assert.rejects(
    execCli(['--api', api, 'challenge', 'list'], {
      env: {
        ...process.env,
        KRITERION_TOKEN: 'redirect-token',
        CF_ACCESS_CLIENT_ID: 'access-id',
        CF_ACCESS_CLIENT_SECRET: 'access-secret',
      },
    }),
    (error) => error.code === 1 && error.stderr.includes('API redirects are refused'),
  )
  assert.equal(requests.length, count + 1)
  assert.equal(requests.at(-1).url, '/challenges')
})

test('ignores remote exit code zero and uses the HTTP status mapping', async () => {
  await assert.rejects(
    execCli(['--api', api, 'challenge', 'show', 'zero-exit-code']),
    (error) => error.code === 2 && error.stderr.includes('exitCode'),
  )
})

test('ignores arbitrary remote exit codes and uses the HTTP status mapping', async () => {
  await assert.rejects(
    execCli(['--api', api, 'challenge', 'show', 'arbitrary-exit-code']),
    (error) => error.code === 4 && error.stderr.includes('exitCode'),
  )
})

function execCli(args, options) {
  if (nativeCli) return exec(nativeCli, args, options)
  return exec(process.execPath, [cli, ...args], options)
}
