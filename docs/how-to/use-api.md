# Call the participant API directly

Use `curl` when you cannot run the Node.js CLI.

## Read a public challenge

```bash
curl -fsS \
  -H 'Accept: application/json' \
  https://api.kriterion.cc/challenges/scalar-multiplication
```

## Check the token identity

Set the token in the current shell.

```bash
export KRITERION_TOKEN='<your-token>'
curl -fsS \
  -H 'Accept: application/json' \
  -H "Authorization: Bearer $KRITERION_TOKEN" \
  https://api.kriterion.cc/auth/me
```

## Submit one pinned commit

Replace the repository and commit values in the JSON body.

```bash
curl -fsS \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $KRITERION_TOKEN" \
  -X POST \
  https://api.kriterion.cc/challenges/scalar-multiplication/submissions \
  --data '{
    "repo": "https://github.com/your-name/your-public-repository",
    "commit": "0123456789abcdef0123456789abcdef01234567",
    "idempotencyKey": "your-stable-retry-key"
  }'
```

Save the returned `submissionId`.
Use a new idempotency key for different source content.

## Read the result

Use the real identifier in the URL.

```bash
export SUBMISSION_ID='your-submission-id'
curl -fsS \
  -H 'Accept: application/json' \
  "https://api.kriterion.cc/submissions/$SUBMISSION_ID"
```

See the [API reference](../reference/api.md) for errors and response rules.
Use the [OpenAPI document](../../openapi.json) for code generation.

