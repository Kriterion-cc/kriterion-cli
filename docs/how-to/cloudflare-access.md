# Use Cloudflare Access service authentication

Some deployments put the API behind Cloudflare Access.
Ask the deployment owner for a service token.

Set both service-token variables.

```bash
export CF_ACCESS_CLIENT_ID='<service-token-id>'
export CF_ACCESS_CLIENT_SECRET='<service-token-secret>'
export KRITERION_TOKEN='<kriterion-token>'
kriterion whoami
```

The CLI sends these Cloudflare headers on every request:

- `CF-Access-Client-Id`
- `CF-Access-Client-Secret`

The CLI refuses a partial pair because it cannot authenticate successfully.
Keep both values out of repositories and logs.

