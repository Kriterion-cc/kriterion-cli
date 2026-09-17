# Tutorial: make your first submission

This tutorial installs the CLI, checks your identity, submits one commit, and reads its status.

## Before you start

You need these items:

- Node.js 18 or newer.
- Git.
- A public HTTPS Git repository with your solution.
- A linked GitHub account in [Kriterion Settings](https://kriterion.cc/settings).
- A Kriterion token from the same page.

Your GitHub identity must prove authorship of the submitted repository or commit.

## 1. Install the CLI

```bash
mkdir -p "$HOME/.local/bin"
curl -fsSL \
  https://raw.githubusercontent.com/Kriterion-cc/kriterion-cli/main/kriterion \
  -o "$HOME/.local/bin/kriterion"
chmod +x "$HOME/.local/bin/kriterion"
export PATH="$HOME/.local/bin:$PATH"
```

Check the executable.

```bash
kriterion --version
```

## 2. Set your token

```bash
export KRITERION_TOKEN='<token-from-settings>'
```

Do not put this value in Git, command history, screenshots, or logs.

## 3. Check your identity

```bash
kriterion whoami
```

The response shows the account linked to the token.

## 4. Read the challenge

```bash
kriterion challenge show scalar-multiplication
kriterion board scalar-multiplication
```

The challenge response contains the formal rules and pinned source locations.

## 5. Test your solution locally

Open your solution repository and run its documented setup commands.
For the current Lean challenge, run these commands.

```bash
lake exe cache get
lake build
```

Local success does not replace the hosted verifier.

## 6. Push and get the commit

```bash
git push
REPO_URL='https://github.com/your-name/your-public-repository'
COMMIT=$(git rev-parse HEAD)
printf 'repository: %s\ncommit: %s\n' "$REPO_URL" "$COMMIT"
```

Confirm that `REPO_URL` names your public repository.
The `COMMIT` variable now contains the complete 40-character hash.

## 7. Submit the commit

```bash
CHALLENGE='scalar-multiplication'
SUBMISSION=$(
  kriterion submit \
    --challenge "$CHALLENGE" \
    --repo "$REPO_URL" \
    --commit "$COMMIT"
)
printf '%s\n' "$SUBMISSION"
```

Save the returned identifier in a shell variable.

```bash
SUBMISSION_ID=$(
  printf '%s\n' "$SUBMISSION" |
    node -e '
      const fs = require("node:fs")
      const body = JSON.parse(fs.readFileSync(0, "utf8"))
      process.stdout.write(body.submissionId)
    '
)
printf 'submission: %s\n' "$SUBMISSION_ID"
```

## 8. Check the result

```bash
STATUS=$(kriterion submission show "$SUBMISSION_ID")
printf '%s\n' "$STATUS"
STATE=$(
  printf '%s\n' "$STATUS" |
    node -e '
      const fs = require("node:fs")
      const body = JSON.parse(fs.readFileSync(0, "utf8"))
      process.stdout.write(body.evaluation?.state ?? "missing")
    '
)
printf 'evaluation state: %s\n' "$STATE"
kriterion board "$CHALLENGE"
```

Repeat the status commands while the state is `pending` or `running`.
Both states return HTTP `200`, so the CLI exits successfully.

`complete` means verification finished successfully.
`rejected` means verification finished unsuccessfully and includes a reason.
