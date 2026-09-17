# Participant API reference

The production base URL is `https://api.kriterion.cc`.
The machine-readable contract is [OpenAPI 3.1](../../openapi.json).

Use HTTPS for every remote API request.
Refuse redirects when a request contains Kriterion or Cloudflare credentials.

## Authentication

Send a Kriterion token as a bearer token.

```http
Authorization: Bearer <kriterion-token>
```

Public challenge, board, and public submission reads can omit this header.
`GET /auth/me` and submission creation require it.

Some deployments also require these Cloudflare Access headers.

```http
CF-Access-Client-Id: <service-token-id>
CF-Access-Client-Secret: <service-token-secret>
```

These headers authorize access through the gateway.
They do not identify the Kriterion account.

## Content types

Send request bodies as `application/json`.
Request JSON responses with `Accept: application/json`.

## Endpoints

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Read service health. |
| `GET` | `/schema` | No | List available JSON Schema names. |
| `GET` | `/schema/{name}` | No | Read one JSON Schema. |
| `GET` | `/auth/me` | Yes | Read the current account and memberships. |
| `GET` | `/challenges` | Optional | List visible challenges. |
| `GET` | `/challenges/{slug}` | Optional | Read challenge rules and source pins. |
| `POST` | `/challenges/{slug}/submissions` | Yes | Submit one source pointer. |
| `GET` | `/submissions/{id}` | Optional | Read a submission and latest evaluation. |
| `GET` | `/boards/{slug}` | Optional | Read the deterministic board. |

## Submit request

```http
POST /challenges/scalar-multiplication/submissions
Authorization: Bearer <kriterion-token>
Content-Type: application/json

{
  "repo": "https://github.com/example/solution",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "idempotencyKey": "client-generated-retry-key",
  "modelAttribution": "optional-model-name",
  "walletAddress": "0x1111111111111111111111111111111111111111"
}
```

`repo` must be an HTTPS Git URL.
`commit` should contain 40 lowercase hexadecimal characters.

The API can resolve an omitted commit from the default branch.
Participants should always send a full commit for reproducibility.

The response uses status `201` for a new submission.
It uses status `200` when it deduplicates the request.

```json
{
  "submissionId": "submission-uuid",
  "repo": "https://github.com/example/solution",
  "commit": "0123456789abcdef0123456789abcdef01234567",
  "evaluationId": "evaluation-uuid",
  "contentDigest": "sha256:...",
  "deduplicated": false,
  "reason": "created"
}
```

## Evaluation states

`GET /submissions/{id}` returns HTTP `200` while verification is in progress.
Inspect `evaluation.state` instead of the HTTP status.

| State | Terminal | Meaning |
| --- | --- | --- |
| `pending` | No | The evaluation is waiting to start. |
| `running` | No | The hosted verifier is running. |
| `rejected` | Yes | Verification failed. Read `evaluation.reason`. |
| `complete` | Yes | Verification finished successfully. |

## Error response

API errors use one envelope.

```json
{
  "error": {
    "code": "submission_invalid",
    "message": "A submission needs an HTTPS repo and a full commit.",
    "details": {},
    "exitCode": 2
  }
}
```

`details` is optional.
Clients should branch on HTTP status or `exitCode`, not on `message`.

| HTTP status | Exit code | Meaning |
| --- | --- | --- |
| `400` | `1` | Malformed request. |
| `401` | `4` | Missing or invalid authentication. |
| `403` | `4` | Authenticated account lacks permission. |
| `404` | `1` | Route or visible resource not found. |
| `409` | `3` | Challenge or evaluation is not ready. |
| `422` | `2` | Policy or schema rejected the input. |
| `500` | `1` | Internal platform error. |

## Visibility and identity rules

A public challenge is readable without sign-in.
A members-only challenge can return `404` to avoid revealing its existence.

A public board makes its entries readable.
Award wallet values remain limited to the author and challenge organizers.

Submission can require a linked GitHub account.
The platform checks repository ownership, public organization membership, or commit authorship.

## OpenAPI scope

The OpenAPI document specifies the participant endpoints in this guide.
It does not specify organizer, reviewer, or deployment operations.

Some nested challenge and review objects remain broad by design.
Use `GET /schema/challenge` for the complete challenge-file schema.
