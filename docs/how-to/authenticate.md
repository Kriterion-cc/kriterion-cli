# Authenticate the CLI

Open [Kriterion Settings](https://kriterion.cc/settings) in the web application.
Link your GitHub account before you create a token.

Create a token and copy it immediately.
The platform does not show the secret again.

Set the token in the current shell.

```bash
export KRITERION_TOKEN='<token-from-settings>'
kriterion whoami
```

Prefer the environment variable over `--token`.
Command-line values can appear in shell history and process listings.

Delete the token from your shell after use.

```bash
unset KRITERION_TOKEN
```

Revoke a token from Kriterion Settings if it becomes exposed.
