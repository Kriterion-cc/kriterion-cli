# CLI and API design

## A small participant surface

The public CLI includes only participant actions.
This boundary keeps organizer and deployment operations out of participant instructions.

The executable uses only Node.js standard-library features.
Participants do not need a package installation or a dependency lockfile.

## JSON as the interface

Successful commands write JSON to standard output.
This behavior gives people and agents the same response contract.

Errors go to standard error.
Exit codes classify the next action without parsing English text.

## Idempotent submission

The CLI hashes the repository URL, one null byte, and the commit hash.
It sends the first 32 hexadecimal digest characters as `idempotencyKey`.

Repeated submission of the same source can return the existing submission.
The response field `deduplicated` explains this result.

## Public reads and authenticated writes

Public challenge details, boards, and public submission results need no Kriterion token.
Identity checks and submissions require a bearer token.

Private challenge visibility can add authentication and role requirements.
The API returns structured errors for these decisions.

