# Service Layer

This directory implements the `/api/v1` contract in `docs/API.md`.

- API-shaped request and response details stay inside each service folder.
- Public application models use camelCase and are exported from `src/types`.
- Metadata and buildable-space requests use JSON HTTP calls.
- Floor-plan generation creates a job, subscribes to its returned `events_url`
  with native `EventSource`, and reconciles terminal/recovery state through
  the returned `status_url`.
- SSE heartbeats are handled by the browser, logical events are deduplicated by
  sequence in the workflow reducer, and `attempt_error` is recoverable.
- Returned artifact references are diagnostics only and are never treated as
  download URLs.
