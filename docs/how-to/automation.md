# Use the CLI in automation

Download the executable from a pinned Git commit.
Do not use the moving `main` branch in repeatable jobs.

Supply secrets through the automation system secret store.
Do not print environment variables in logs.

The CLI prints JSON on success.
Use the process exit code before you parse the response.

```bash
if output=$(kriterion submission show "$SUBMISSION_ID"); then
  printf '%s\n' "$output"
else
  status=$?
  printf 'Kriterion failed with exit code %s\n' "$status" >&2
  exit "$status"
fi
```

Exit code `3` identifies a temporary or not-ready state.
Use bounded retries with increasing delays for that code only.

