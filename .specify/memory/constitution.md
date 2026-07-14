<!--
Sync Impact Report
Version change: (none) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections: Core Principles (6), Technology Constraints, Development Workflow, Governance
Removed sections: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (Constitution Check section aligns with these principles)
  ✅ .specify/templates/spec-template.md (no changes needed; scope-only, no stack references)
  ✅ .specify/templates/tasks-template.md (task categorization compatible with incremental/testable principles)
Follow-up TODOs: none
-->

# Discord Clone Constitution

## Core Principles

### I. Simplicity First
Prefer the smallest solution that satisfies the current spec. No speculative
abstractions, no libraries beyond those named in the plan, and no
generalization for hypothetical future features. Every added dependency or
abstraction MUST be traceable to a concrete requirement in the spec or plan.

### II. Real-Time Correctness
The UI MUST reflect server state via reactive subscriptions. Manual polling,
forced page refreshes, or client-side caches that can silently go stale are
prohibited. If a screen shows data that can change on the server, it MUST be
backed by a live subscription.

### III. Type Safety End-to-End
TypeScript strict mode is mandatory across frontend and backend code.
Database access MUST go through typed schema definitions only — no untyped
document access or ad-hoc `any` casts to bypass the type system.

### IV. Security Basics (NON-NEGOTIABLE)
Every backend function MUST validate that the caller is authenticated and
authorized for the specific resource it touches (e.g., a channel mutation
verifies the caller is a member of that channel's server). Missing
authorization checks are treated as bugs, not follow-up work.

### V. Incremental Delivery
The application MUST build and run after each completed user story. The main
branch is never left in a broken state between milestones. Work is
implemented and verified story-by-story rather than all at once.

### VI. Testable Seams
Business logic MUST be separated from UI rendering so it can be tested
independently. Critical flows — sending a message, joining a call — require
at least one smoke test before being considered done.

## Technology Constraints

Frontend: React + TypeScript + Vite, styled with Tailwind CSS only (no
component library). Backend: Convex for database, queries/mutations, and
auth. Real-time voice/video: native WebRTC `RTCPeerConnection` with a
full-mesh topology (up to 4 peers), signaled through Convex tables (no
separate WebSocket/Socket.io server). Public STUN only in v1; the lack of a
TURN server is a documented limitation, not a defect to chase indefinitely.

## Development Workflow

Follow Spec-Driven Development: constitution → specify → clarify → plan →
analyze → tasks → implement, in that order. The spec phase describes what
and why only — the technology stack is introduced no earlier than the plan
phase. Commit after every phase and after every implementation milestone, so
history documents the process, not just the final result. Verify each
milestone manually (e.g., two browsers for real-time features) before moving
to the next.

## Governance

This constitution supersedes ad-hoc practices for this project. Amendments
require an explicit update to this file with a version bump and a Sync
Impact Report noting what changed and why. Versioning follows semantic
versioning: MAJOR for backward-incompatible principle removals/redefinitions,
MINOR for new principles or materially expanded guidance, PATCH for wording
or clarification only. All plans and task breakdowns MUST be checked against
these principles before implementation begins; unjustified complexity or
missing authorization checks are grounds to send a plan back for revision.

**Version**: 1.0.0 | **Ratified**: 2026-07-14 | **Last Amended**: 2026-07-14
