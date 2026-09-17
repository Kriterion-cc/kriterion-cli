# Install or update the CLI

## Install from the main branch

Use this method for interactive use during the trial period.

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

Replace `<commit>` with a trusted full commit hash.

```bash
curl -fsSL \
  "https://raw.githubusercontent.com/Kriterion-cc/kriterion-cli/<commit>/kriterion" \
  -o "$HOME/.local/bin/kriterion"
chmod +x "$HOME/.local/bin/kriterion"
```

Use a pinned URL in CI and repeatable workflows.

## Update

Run the installation command again. It replaces the local executable.

```bash
kriterion --version
```

