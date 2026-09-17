import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const DOS_HEADER_SIZE = 64
const PE_SIGNATURE_SIZE = 4
const COFF_HEADER_SIZE = 20
const SECURITY_DIRECTORY_INDEX = 4

export function peSecurityDirectory(bytes) {
  assert.ok(Buffer.isBuffer(bytes), 'the PE input must be a buffer')
  assert.ok(bytes.length >= DOS_HEADER_SIZE, 'the DOS header is incomplete')
  assert.equal(bytes.toString('ascii', 0, 2), 'MZ', 'the DOS signature is invalid')

  const peOffset = bytes.readUInt32LE(0x3c)
  assert.ok(peOffset >= DOS_HEADER_SIZE, 'the PE header offset is invalid')
  assert.ok(
    peOffset + PE_SIGNATURE_SIZE + COFF_HEADER_SIZE <= bytes.length,
    'the PE header is incomplete',
  )
  assert.equal(bytes.toString('ascii', peOffset, peOffset + PE_SIGNATURE_SIZE), 'PE\0\0')

  const optionalSize = bytes.readUInt16LE(peOffset + PE_SIGNATURE_SIZE + 16)
  const optionalOffset = peOffset + PE_SIGNATURE_SIZE + COFF_HEADER_SIZE
  const optionalEnd = optionalOffset + optionalSize
  assert.ok(optionalEnd <= bytes.length, 'the PE optional header is incomplete')
  assert.ok(optionalSize >= 2, 'the PE optional header is empty')

  const magic = bytes.readUInt16LE(optionalOffset)
  const numberOffset = magic === 0x10b ? 92 : magic === 0x20b ? 108 : null
  assert.notEqual(numberOffset, null, 'the PE optional header magic is invalid')
  assert.ok(numberOffset + 4 <= optionalSize, 'the PE data directory count is missing')

  const directoryCount = bytes.readUInt32LE(optionalOffset + numberOffset)
  const directoriesOffset = optionalOffset + numberOffset + 4
  const availableDirectories = Math.floor((optionalEnd - directoriesOffset) / 8)
  assert.ok(directoryCount <= availableDirectories, 'the PE data directory list is incomplete')
  if (directoryCount <= SECURITY_DIRECTORY_INDEX) return { offset: 0, size: 0 }

  const securityOffset = directoriesOffset + SECURITY_DIRECTORY_INDEX * 8
  assert.ok(securityOffset + 8 <= optionalEnd, 'the PE security directory is incomplete')

  const offset = bytes.readUInt32LE(securityOffset)
  const size = bytes.readUInt32LE(securityOffset + 4)
  assert.equal(offset === 0, size === 0, 'the PE security directory is malformed')
  if (offset !== 0) {
    assert.equal(offset % 8, 0, 'the PE certificate table offset is not aligned')
    assert.ok(size >= 8, 'the PE certificate table is too small')
    assert.ok(offset + size <= bytes.length, 'the PE certificate table is outside the file')
  }
  return { offset, size }
}

export async function assertPeNotSigned(file) {
  const directory = peSecurityDirectory(await readFile(file))
  assert.deepEqual(directory, { offset: 0, size: 0 }, `${file} contains an Authenticode table`)
  console.log(`checked unsigned PE file ${file}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2]
  if (!file || process.argv.length !== 3) {
    console.error('use pe-signature.mjs <executable>')
    process.exitCode = 1
  } else {
    assertPeNotSigned(file).catch((error) => {
      console.error(`error: ${error.message}`)
      process.exitCode = 1
    })
  }
}
