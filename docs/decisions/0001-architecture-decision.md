# 0001. Record Architecture Decisions

* Status: Accepted
* Date: 2026-09-01
* Deciders: Group Unit

## Context

We need to record architectural decisions made on this project so that future team members, instructors, and maintainers understand the rationale, trade-offs, and context behind our architectural choices.

## Decision

We will use Architecture Decision Records (ADRs) structured according to Michael Nygard's format (Context, Decision, Alternatives Considered, and Consequences). All architectural decisions will be stored as Markdown files in the repository under `docs/decisions/` alongside the source code.

## Consequences

* Major technical decisions are tracked in version control alongside code changes.
* Architectural changes must be documented via new ADRs rather than silently modifying prior records.
* Historical context, trade-offs, and security assumptions remain accessible throughout the system lifecycle.