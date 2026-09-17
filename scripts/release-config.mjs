export const PRODUCT_NAME = 'kriterion'
export const NODE_VERSION = '24.21.0'
export const SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

export const TARGETS = Object.freeze({
  'darwin-arm64': Object.freeze({
    platform: 'darwin',
    arch: 'arm64',
    runner: 'macos-15',
    executable: 'kriterion',
    format: 'tar.gz',
  }),
  'darwin-x64': Object.freeze({
    platform: 'darwin',
    arch: 'x64',
    runner: 'macos-15-intel',
    executable: 'kriterion',
    format: 'tar.gz',
  }),
  'linux-arm64': Object.freeze({
    platform: 'linux',
    arch: 'arm64',
    runner: 'ubuntu-24.04-arm',
    executable: 'kriterion',
    format: 'tar.gz',
  }),
  'linux-x64': Object.freeze({
    platform: 'linux',
    arch: 'x64',
    runner: 'ubuntu-24.04',
    executable: 'kriterion',
    format: 'tar.gz',
  }),
  'windows-x64': Object.freeze({
    platform: 'win32',
    arch: 'x64',
    runner: 'windows-2022',
    executable: 'kriterion.exe',
    format: 'zip',
  }),
})

export function hostTarget(platform = process.platform, arch = process.arch) {
  const normalizedPlatform = platform === 'win32' ? 'windows' : platform
  return `${normalizedPlatform}-${arch}`
}

export function targetConfig(target) {
  const config = TARGETS[target]
  if (!config) {
    throw new Error(`unsupported target ${target}. Use one of: ${Object.keys(TARGETS).join(', ')}`)
  }
  return config
}

export function archiveName(version, target) {
  const config = targetConfig(target)
  return `${PRODUCT_NAME}-v${version}-${target}.${config.format}`
}

export function checksumName(version) {
  return `${PRODUCT_NAME}-v${version}-SHA256SUMS`
}
