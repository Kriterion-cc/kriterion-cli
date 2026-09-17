# Environment variable reference

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `KRITERION_API` | No | `https://api.kriterion.cc` | Selects the API base URL. |
| `KRITERION_TOKEN` | For authenticated commands | None | Sends the Kriterion bearer token. |
| `KRITERION_TIMEOUT_MS` | No | `30000` | Sets the request timeout from 1 through 300000 milliseconds. |
| `CF_ACCESS_CLIENT_ID` | Only for protected deployments | None | Sends the Cloudflare Access service-token ID. |
| `CF_ACCESS_CLIENT_SECRET` | Only for protected deployments | None | Sends the Cloudflare Access service-token secret. |

Set both Cloudflare Access variables or set neither variable.

The `--api` option overrides `KRITERION_API`.
The `--token` option overrides `KRITERION_TOKEN`.

The API URL must use HTTPS.
The CLI permits HTTP only for `localhost`, `127.0.0.1`, and `[::1]` tests.

The CLI refuses HTTP redirects.
This rule prevents credentials from moving to a different origin.
