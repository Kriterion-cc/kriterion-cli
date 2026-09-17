# Check a downloaded CLI

Use an exact release version.
Do not use a native file when its SHA-256 digest differs.

## macOS or Linux

Set the release version and the target.
This example selects macOS on Apple silicon.

```bash
VERSION='0.1.0'
TARGET='darwin-arm64'
BASE_URL="https://github.com/Kriterion-cc/kriterion-cli/releases/download/v${VERSION}"
ARCHIVE="kriterion-v${VERSION}-${TARGET}.tar.gz"
CHECKSUMS="kriterion-v${VERSION}-SHA256SUMS"
curl -fLO "${BASE_URL}/${ARCHIVE}"
curl -fLO "${BASE_URL}/${CHECKSUMS}"
```

On macOS, check the selected archive with `shasum`.

```bash
awk -v file="$ARCHIVE" '$2 == file { print }' "$CHECKSUMS" \
  > "${ARCHIVE}.sha256"
test -s "${ARCHIVE}.sha256"
test "$(wc -l < "${ARCHIVE}.sha256" | tr -d ' ')" -eq 1
shasum -a 256 -c "${ARCHIVE}.sha256"
```

On Linux, check the selected archive with `sha256sum`.

```bash
awk -v file="$ARCHIVE" '$2 == file { print }' "$CHECKSUMS" \
  > "${ARCHIVE}.sha256"
test -s "${ARCHIVE}.sha256"
test "$(wc -l < "${ARCHIVE}.sha256" | tr -d ' ')" -eq 1
sha256sum -c "${ARCHIVE}.sha256"
```

Install the checked executable.

```bash
tar -xzf "${ARCHIVE}"
install -m 755 kriterion "$HOME/.local/bin/kriterion"
kriterion --version
```

The macOS file does not use an Apple Developer ID and is not notarized.
macOS can show a security message for this file.

Only after a successful digest check, remove the quarantine attribute if macOS blocks the file.

```bash
xattr -d com.apple.quarantine "$HOME/.local/bin/kriterion"
```

## Windows

Set the version and download the Windows archive and checksum file.

```powershell
$Version = '0.1.0'
$BaseUrl = "https://github.com/Kriterion-cc/kriterion-cli/releases/download/v$Version"
$Archive = "kriterion-v$Version-windows-x64.zip"
$Checksums = "kriterion-v$Version-SHA256SUMS"
Invoke-WebRequest "$BaseUrl/$Archive" -OutFile $Archive
Invoke-WebRequest "$BaseUrl/$Checksums" -OutFile $Checksums
```

Compare the SHA-256 digest before extraction.

```powershell
$Pattern = "^[0-9a-f]{64}  $([regex]::Escape($Archive))$"
$Matches = @(Select-String -Path $Checksums -Pattern $Pattern)
if ($Matches.Count -ne 1) { throw 'The checksum entry is missing or duplicated.' }
$Expected = ($Matches[0].Line -split '  ')[0]
$Actual = (Get-FileHash $Archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($Actual -ne $Expected) { throw 'The SHA-256 digest differs.' }
Expand-Archive $Archive -DestinationPath "$HOME\bin" -Force
& "$HOME\bin\kriterion.exe" --version
```

The Windows file does not use an Authenticode certificate.
Windows SmartScreen can show a security message for this file.

## Check the release metadata

Each release includes `release-manifest.json`.
It gives the target, file name, file size, format, and SHA-256 digest.

Use the [release manifest reference](../reference/releases.md) for the field definitions.
