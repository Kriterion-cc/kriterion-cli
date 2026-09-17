# CLI reference

## Global syntax

```text
kriterion [--api <url>] [--token <token>] [--json] <command>
```

`--json` is accepted for compatibility.
All successful participant commands always return JSON.

## Global options

| Option | Description |
| --- | --- |
| `--api <url>` | Overrides the API base URL. |
| `--token <token>` | Overrides the bearer token. Prefer `KRITERION_TOKEN`. |
| `--json` | Requests JSON output. JSON is already the default. |
| `--help`, `-h` | Shows help. |
| `--version`, `-V` | Shows the CLI version. |

## Commands

### `whoami`

Returns the account behind `KRITERION_TOKEN` and its visible memberships.

```bash
kriterion whoami
```

Authentication is required.

### `challenge list`

Returns public challenges and other challenges visible to the account.

```bash
kriterion challenge list
```

Authentication is optional.

### `challenge show <slug>`

Returns the statement, rules, source pins, criteria, and warnings.

```bash
kriterion challenge show scalar-multiplication
```

Authentication is optional for public challenges.

### `board <slug>`

Returns ranked submissions and their verifier states.

```bash
kriterion board scalar-multiplication
```

Authentication is optional for public challenges.

### `submission show <id>`

Returns a submission, its latest evaluation, and its board entry.

```bash
kriterion submission show "$SUBMISSION_ID"
```

Authentication is optional for entries on public challenges.
Set `SUBMISSION_ID` from the `submissionId` field returned by `submit`.

Inspect `evaluation.state` to determine verifier progress.
The values are `pending`, `running`, `rejected`, and `complete`.

Pending and running reads return JSON successfully with exit code `0`.
Do not use the process exit code to detect verifier completion.

### `submit`

Creates or deduplicates a submission for one immutable commit.

```text
kriterion submit \
  --challenge <slug> \
  --repo <https-git-url> \
  --commit <40-hex-commit> \
  [--model <name>] \
  [--wallet <address>]
```

| Option | Required | Description |
| --- | --- | --- |
| `--challenge` | Yes | Challenge slug. |
| `--repo` | Yes | Public HTTPS Git repository. |
| `--commit` | Yes | Lowercase, 40-character Git commit hash. |
| `--model` | No | Model attribution stored with the submission. |
| `--wallet` | No | `bbn1…` or `0x…` award address. |

The CLI makes a deterministic idempotency key from the repository and commit.
Authentication is required.

## Exit codes

| Code | Meaning | Suggested action |
| --- | --- | --- |
| `0` | Success. | Parse standard output as JSON. |
| `1` | Usage, network, not-found, or platform error. | Correct the request or inspect standard error. |
| `2` | Policy or schema rejection. | Correct the submission. Do not retry unchanged input. |
| `3` | Not ready or conflicting state. | Wait when the error details identify a temporary state. |
| `4` | Authentication or authorization failure. | Check the token, identity, and access headers. |
