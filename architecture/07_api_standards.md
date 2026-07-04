# API Standards

## Principles

1. APIs should represent business actions.
2. Avoid exposing raw database thinking.
3. Prefer /opportunities/start over /deal-flow insert.
4. State changes must go through engine endpoints.
5. Every important API should publish a Business Event.

## Examples

POST /opportunities/start-v2
PUT /opportunities/{id}/transition
GET /opportunities
GET /opportunities/{id}/timeline
POST /communications/queue
