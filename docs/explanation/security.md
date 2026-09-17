# Security model

## Immutable source pointers

A submission contains a public HTTPS Git URL and a full commit hash.
The hosted verifier fetches that exact source state.

The CLI requires a full commit even though the API can resolve a default branch.
This restriction prevents an accidental moving submission.

## Two authentication layers

`KRITERION_TOKEN` identifies a Kriterion account.
Cloudflare Access service-token variables can authorize transport through an Access policy.

The two token types are different.
Cloudflare access does not replace Kriterion account authentication.

## GitHub authorship

The platform can require a linked GitHub identity.
It checks repository ownership, public organization membership, or commit authorship.

Public repository access lets the verifier read the source.
It does not prove that the submitter controls the source.

## Secret handling

Store tokens in a secret manager or temporary environment variable.
Do not put tokens in a repository, URL, screenshot, or command output.

Prefer `KRITERION_TOKEN` over `--token`.
Command-line arguments can appear in process listings and shell history.

## Transport rules

The CLI requires HTTPS for remote API hosts.
It permits HTTP only for loopback development addresses.

The CLI does not follow API redirects.
This behavior prevents bearer and Cloudflare credentials from crossing origins.

Check `KRITERION_API` before you use credentials with a custom deployment.

## Local and hosted checks

`lake build` checks the public Lean project locally.
The hosted verifier also checks layout, obligations, axioms, lint, and challenge metrics.

The public CLI does not contain the hosted verifier image or deployment credentials.
The hosted result remains authoritative.
