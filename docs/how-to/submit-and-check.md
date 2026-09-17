# Submit and check an entry

Run local checks before submission.

```bash
lake exe cache get
lake build
```

Push your work to a public HTTPS Git repository.

```bash
git push
CHALLENGE='scalar-multiplication'
REPO_URL='https://github.com/your-name/your-public-repository'
COMMIT=$(git rev-parse HEAD)
printf 'repository: %s\ncommit: %s\n' "$REPO_URL" "$COMMIT"
```

Submit the full commit hash.

```bash
SUBMISSION=$(
  kriterion submit \
    --challenge "$CHALLENGE" \
    --repo "$REPO_URL" \
    --commit "$COMMIT"
)
printf '%s\n' "$SUBMISSION"
```

Use this command instead when an AI model helped create the solution.
Do not run both submission commands for the same commit.

```bash
MODEL='your-model-name'
SUBMISSION=$(
  kriterion submit \
    --challenge "$CHALLENGE" \
    --repo "$REPO_URL" \
    --commit "$COMMIT" \
    --model "$MODEL"
)
printf '%s\n' "$SUBMISSION"
```

Add `--wallet` only when the challenge requests an award address.
Kriterion accepts `bbn1…` or `0x…` address forms.

Save the returned identifier and read the submitted entry.

```bash
SUBMISSION_ID=$(
  printf '%s\n' "$SUBMISSION" |
    node -e '
      const fs = require("node:fs")
      const body = JSON.parse(fs.readFileSync(0, "utf8"))
      process.stdout.write(body.submissionId)
    '
)
STATUS=$(kriterion submission show "$SUBMISSION_ID")
printf '%s\n' "$STATUS"
kriterion board "$CHALLENGE"
```

Inspect `evaluation.state` in `STATUS`.
The possible values are `pending`, `running`, `rejected`, and `complete`.

`pending` and `running` return HTTP `200` and CLI exit code `0`.
Repeat the read after a short delay for these states.

`rejected` and `complete` are terminal states.
Read `evaluation.reason` when the state is `rejected`.
