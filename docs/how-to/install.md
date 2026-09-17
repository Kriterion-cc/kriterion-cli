# Install or update the CLI

## Select a version

Use an exact version from the [Kriterion CLI releases](https://github.com/Kriterion-cc/kriterion-cli/releases).
Old versions stay on that page for repeatable installations.

Select the file for your operating system and processor.

| Target | File type |
| --- | --- |
| macOS Apple silicon | `darwin-arm64.tar.gz` |
| macOS Intel | `darwin-x64.tar.gz` |
| Linux ARM64 | `linux-arm64.tar.gz` |
| Linux x64 | `linux-x64.tar.gz` |
| Windows x64 | `windows-x64.zip` |

The archive name starts with `kriterion-v<version>-`.
Check the archive with the matching `kriterion-v<version>-SHA256SUMS` file.

The macOS files do not use an Apple Developer ID and are not notarized.
The Windows file does not use an Authenticode certificate.

Read [Check a downloaded CLI](verify-download.md) for complete installation commands.

## Install from the main branch

Use this universal Node.js script when a native file is not suitable.
Install Node.js 18 or newer first.

```bash
mkdir -p "$HOME/.local/bin"
curl -fsSL \
  https://raw.githubusercontent.com/Kriterion-cc/kriterion-cli/main/kriterion \
  -o "$HOME/.local/bin/kriterion"
chmod +x "$HOME/.local/bin/kriterion"
```

Add the directory to `PATH` when your shell cannot find the command.

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Install a pinned version

For the universal script, replace `<commit>` with a trusted full commit hash.

```bash
curl -fsSL \
  "https://raw.githubusercontent.com/Kriterion-cc/kriterion-cli/<commit>/kriterion" \
  -o "$HOME/.local/bin/kriterion"
chmod +x "$HOME/.local/bin/kriterion"
```

Use a pinned URL in CI and repeatable workflows.

## Update

Select the new exact version, check its digest, and replace the old executable.

```bash
kriterion --version
```
