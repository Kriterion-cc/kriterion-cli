# Kriterion CLI

Kriterion compares cryptography designs with machine-checked Lean proofs.
This repository contains the public participant CLI and participant API documentation.

Use a native file, or use the Node.js script on Node.js 18 or newer.

- [Download the latest native CLI](https://github.com/Kriterion-cc/kriterion-cli/releases/latest)
- [See all CLI versions](https://github.com/Kriterion-cc/kriterion-cli/releases)
- [Use the universal Node.js script](https://raw.githubusercontent.com/Kriterion-cc/kriterion-cli/main/kriterion)
- [Download the OpenAPI 3.1 specification](https://raw.githubusercontent.com/Kriterion-cc/kriterion-cli/main/openapi.json)

## Install the universal script

```bash
mkdir -p "$HOME/.local/bin"
curl -fsSL \
  https://raw.githubusercontent.com/Kriterion-cc/kriterion-cli/main/kriterion \
  -o "$HOME/.local/bin/kriterion"
chmod +x "$HOME/.local/bin/kriterion"
```

Add `$HOME/.local/bin` to `PATH` if necessary. Then check the installation.

```bash
kriterion --version
kriterion --help
```

For automation, use a raw URL with a pinned commit instead of `main`.
Inspect downloaded scripts before you run them.

For a native file, select an exact version from [GitHub Releases](https://github.com/Kriterion-cc/kriterion-cli/releases).
Then [check the downloaded file](docs/how-to/verify-download.md) before you run it.

The macOS files do not use an Apple Developer ID and are not notarized.
The Windows file does not use an Authenticode certificate.

## Submit an entry

Create a token on the [Kriterion Settings page](https://kriterion.cc/settings).
Keep the token outside scripts and repositories.

```bash
export KRITERION_TOKEN='<token-from-settings>'
CHALLENGE='scalar-multiplication'
REPO_URL='https://github.com/your-name/your-public-repository'
COMMIT=$(git rev-parse HEAD)
kriterion whoami
SUBMISSION=$(
  kriterion submit \
    --challenge "$CHALLENGE" \
    --repo "$REPO_URL" \
    --commit "$COMMIT"
)
printf '%s\n' "$SUBMISSION"
SUBMISSION_ID=$(
  printf '%s\n' "$SUBMISSION" |
    node -e '
      const fs = require("node:fs")
      const body = JSON.parse(fs.readFileSync(0, "utf8"))
      process.stdout.write(body.submissionId)
    '
)
kriterion submission show "$SUBMISSION_ID"
```

Use a public HTTPS Git repository and a full 40-character commit hash.
Run `lake build` in your solution repository before submission.
The hosted verifier makes the final decision.
Inspect `evaluation.state` when you check a submission.
Pending and running evaluations return successful HTTP responses.

## Documentation

The documentation uses the [Diátaxis](https://diataxis.fr/) structure.

| Learn | Complete a task | Look up facts | Understand the design |
| --- | --- | --- | --- |
| [First submission tutorial](docs/tutorials/first-submission.md) | [How-to guides](docs/how-to/index.md) | [CLI reference](docs/reference/cli.md) | [Security model](docs/explanation/security.md) |
| | [Install](docs/how-to/install.md) | [Participant API](docs/reference/api.md) | [CLI design](docs/explanation/design.md) |
| | [Check a download](docs/how-to/verify-download.md) | [Release manifest](docs/reference/releases.md) | |
| | [Authenticate](docs/how-to/authenticate.md) | [OpenAPI 3.1](openapi.json) | |
| | [Call the API directly](docs/how-to/use-api.md) | | |
| | [Submit and check results](docs/how-to/submit-and-check.md) | [Environment variables](docs/reference/environment.md) | |

Start at the [documentation home](docs/README.md) for the full map.

## Supported commands

```text
whoami
challenge list
challenge show <slug>
board <slug>
submission show <id>
submit --challenge <slug> --repo <url> --commit <40-hex-commit>
```

All successful commands write JSON to standard output.
Errors go to standard error and use stable exit codes.

## Development

```bash
npm test
npm run check
```

The tests use only Node.js standard-library modules.
The check command validates JavaScript syntax, documentation links, and the OpenAPI document.

Native releases use Node.js 24.21.0 LTS and a pinned `postject` package.
Each tag builds on the matching GitHub runner architecture.

## Scope

This CLI supports participant workflows only.
Organizer operations and the private hosted verifier are not included.

The public API base URL is `https://api.kriterion.cc`.
The web application is `https://kriterion.cc`.
