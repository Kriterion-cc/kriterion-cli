import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  archiveName,
  hostTarget,
  NODE_VERSION,
  SEA_FUSE,
  targetConfig,
} from './release-config.mjs'
import { extractAndInspectArchive } from './archive.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parseArguments(argv) {
  const options = { outputDirectory: path.join(root, 'dist') }
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index]
    const value = argv[index + 1]
    if (option === '--target' && value) options.target = value
    else if (option === '--output-dir' && value) options.outputDirectory = path.resolve(value)
    else throw new Error(`unknown or incomplete option ${option}`)
    index += 1
  }
  if (!options.target) throw new Error('give --target')
  return options
}

export function validateBuildEnvironment(target, version = process.versions.node) {
  const config = targetConfig(target)
  assert.equal(target, hostTarget(), `target ${target} does not match this ${hostTarget()} runner`)
  assert.equal(version, NODE_VERSION, `Node.js ${NODE_VERSION} is required, but this runner uses ${version}`)
  assert.equal(config.platform, process.platform)
  assert.equal(config.arch, process.arch)
  return config
}

export async function buildSea(options) {
  const config = validateBuildEnvironment(options.target)
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const work = await mkdtemp(path.join(os.tmpdir(), 'kriterion-sea-'))
  const binaryDirectory = path.join(work, 'archive')
  const executable = path.join(binaryDirectory, config.executable)
  const blob = path.join(work, 'sea-prep.blob')
  const seaConfig = path.join(work, 'sea-config.json')

  try {
    await mkdir(options.outputDirectory, { recursive: true })
    await mkdir(binaryDirectory, { recursive: true })
    await writeFile(seaConfig, `${JSON.stringify({
      main: path.join(root, 'kriterion'),
      output: blob,
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
      useCodeCache: false,
    }, null, 2)}\n`)

    run(process.execPath, ['--experimental-sea-config', seaConfig])
    await copyFile(process.execPath, executable)
    if (process.platform !== 'win32') await chmod(executable, 0o755)

    if (process.platform === 'darwin') {
      run('codesign', ['--remove-signature', executable])
    } else if (process.platform === 'win32') {
      removeWindowsSignature(executable)
    }

    const postject = path.join(root, 'node_modules', 'postject', 'dist', 'cli.js')
    const postjectArguments = [postject, executable, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', SEA_FUSE]
    if (process.platform === 'darwin') {
      postjectArguments.push('--macho-segment-name', 'NODE_SEA')
    }
    run(process.execPath, postjectArguments)

    if (process.platform === 'darwin') {
      run('codesign', ['--sign', '-', '--force', executable])
    } else if (process.platform === 'win32') {
      assertWindowsNotSigned(executable)
    }

    const output = path.join(options.outputDirectory, archiveName(packageJson.version, options.target))
    if (config.format === 'zip') {
      run('powershell.exe', [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Compress-Archive -LiteralPath '${escapePowerShell(executable)}' -DestinationPath '${escapePowerShell(output)}' -Force`,
      ])
    } else {
      run('tar', ['-czf', output, '-C', binaryDirectory, config.executable])
    }

    const extracted = await extractAndInspectArchive(output, options.target, path.join(work, 'inspection'))
    const version = run(extracted, ['--version'], { encoding: 'utf8' }).trim()
    assert.equal(version, packageJson.version)
    const help = run(extracted, ['--help'], { encoding: 'utf8' })
    assert.match(help, /Kriterion participant CLI/)
    if (process.platform === 'win32') assertWindowsNotSigned(extracted)
    run(process.execPath, ['--test', path.join(root, 'test', 'kriterion.test.mjs')], {
      env: { ...process.env, KRITERION_TEST_EXECUTABLE: extracted },
    })

    console.log(`built ${output}`)
    return output
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: options.encoding ? 'pipe' : 'inherit', ...options })
}

function escapePowerShell(value) {
  return value.replaceAll("'", "''")
}

function removeWindowsSignature(executable) {
  const command = `
$tools = Get-ChildItem -Path \"${'${env:ProgramFiles(x86)}'}\\Windows Kits\\10\\bin\\*\\x64\\signtool.exe\" |
  Sort-Object FullName -Descending
$tool = $tools | Select-Object -First 1
if (-not $tool) { throw 'Cannot find signtool.exe.' }
& $tool.FullName remove /s '${escapePowerShell(executable)}'
if ($LASTEXITCODE -ne 0) { throw 'signtool could not remove the signature.' }
`
  run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command])
  assertWindowsNotSigned(executable)
}

function assertWindowsNotSigned(executable) {
  const command = `
$status = (Get-AuthenticodeSignature -LiteralPath '${escapePowerShell(executable)}').Status
if ($status -ne 'NotSigned') { throw \"Expected NotSigned, got $status.\" }
`
  run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command])
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSea(parseArguments(process.argv.slice(2))).catch((error) => {
    console.error(`error: ${error.message}`)
    process.exitCode = 1
  })
}
