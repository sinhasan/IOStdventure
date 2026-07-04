# ADR-001: TD Venture IOS is Event-Driven

## Status

Accepted

## Decision

Every important business action inside TD Venture IOS is represented as a Business Event.

## Reason

Business Events allow multiple engines to react without tightly coupling logic.

## Consequences

Opportunity Engine should publish events.
Timeline Engine records events.
Communications Engine reacts to events.
Chief of Staff uses events for prioritization.
