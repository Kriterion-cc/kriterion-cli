# Release files and manifest

## Version selection

[GitHub Releases](https://github.com/Kriterion-cc/kriterion-cli/releases) keeps all published Kriterion CLI versions.
Select an exact version for scripts and repeatable use.

The latest release shortcut can change.
Do not use it for a repeatable workflow.

## Archive names

Version `0.1.0` uses these archive names.

```text
kriterion-v0.1.0-darwin-arm64.tar.gz
kriterion-v0.1.0-darwin-x64.tar.gz
kriterion-v0.1.0-linux-arm64.tar.gz
kriterion-v0.1.0-linux-x64.tar.gz
kriterion-v0.1.0-windows-x64.zip
```

The macOS and Linux archives contain `kriterion`.
The Windows archive contains `kriterion.exe`.

## Integrity files

`kriterion-v0.1.0-SHA256SUMS` contains one SHA-256 digest for each archive.
`release-manifest.json` contains the same digests as structured data.

The manifest uses this structure.

```json
{
  "schemaVersion": 1,
  "name": "kriterion",
  "version": "0.1.0",
  "tag": "v0.1.0",
  "nodeVersion": "24.21.0",
  "generatedAt": "2026-09-17T00:00:00.000Z",
  "assets": [
    {
      "target": "darwin-arm64",
      "file": "kriterion-v0.1.0-darwin-arm64.tar.gz",
      "format": "tar.gz",
      "sha256": "<64-lowercase-hex-characters>",
      "size": 12345678
    }
  ]
}
```

`generatedAt` gives the release workflow time in UTC.
`size` gives the archive size in bytes.

## Trust status

The macOS files do not use an Apple Developer ID and are not notarized.
The Windows file does not use an Authenticode certificate.

Always check the SHA-256 digest before you run a downloaded file.
