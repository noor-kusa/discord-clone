# Implementation Plan: Real-Time Chat & Video Community Platform

**Branch**: `001-real-time-chat` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-real-time-chat/spec.md`

## Summary

Build a Discord-style real-time chat and video calling app: servers, channels, real-time
messaging with edit/delete/typing indicators, direct messages, presence, and 2-4 participant
WebRTC voice/video calls. Frontend is a single-page React app; Convex provides the database,
real-time query subscriptions, mutations, and auth; WebRTC signaling (SDP offers/answers, ICE
candidates) is exchanged through reactive Convex tables instead of a separate Socket.io server.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 18+

**Primary Dependencies**: React 18, Vite, Tailwind CSS, React Router, Convex (`convex` package +
`@convex-dev/auth` password provider), native browser `RTCPeerConnection` API (no WebRTC SDK)

**Storage**: Convex (document database with typed schema, defined in `convex/schema.ts`)

**Testing**: Vitest for unit/business-logic tests (per constitution's testable-seams principle);
manual two-browser verification checklist per milestone (documented in quickstart.md)

**Target Platform**: Modern desktop browsers (Chrome/Edge/Firefox), served over HTTPS or localhost
(WebRTC camera/mic access requires a secure context; localhost is exempt)

**Project Type**: Web application (single repo: Vite frontend at root + `convex/` backend functions)

**Performance Goals**: New messages visible to other members in under 1 second (SC-001); presence
change visible within 10 seconds (SC-004, per Clarifications)

**Constraints**: No TURN server in v1 (STUN only — `stun:stun.l.google.com:19302`); some strict-NAT
networks may fail to connect calls — this is a documented v1 limitation, not a defect to chase.
Full-mesh WebRTC topology, hard-capped at 4 participants per call (per Clarifications).

**Scale/Scope**: Single small-to-medium community scale — tens of servers, hundreds of members;
not designed for thousands of concurrent users per server (out of scope for v1 per spec).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Simplicity First | No component library, no state-management library beyond Convex's own reactive hooks, no SDK for WebRTC (native `RTCPeerConnection`) | PASS |
| II. Real-Time Correctness | All live data (messages, presence, typing, call state) read via Convex `useQuery` subscriptions, never one-shot fetch/polling | PASS |
| III. Type Safety End-to-End | TypeScript strict mode; all DB access through `convex/schema.ts` typed tables, no `any` escape hatches | PASS |
| IV. Security Basics | Every Convex mutation/query MUST check `ctx.auth` identity and verify server/channel membership before acting | PASS (enforced in Phase 1 contracts) |
| V. Incremental Delivery | Implementation is milestone-ordered (M1 Setup → M2 Servers/Channels → M3 Chat → M4 DMs/Presence → M5 Video); app builds and runs after each | PASS |
| VI. Testable Seams | Convex mutations/queries are plain functions independently testable with Vitest + `convex-test`; smoke tests required for send-message and join-call flows | PASS |

No violations requiring justification — Complexity Tracking section is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-real-time-chat/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Single repo: Vite app at the root, Convex functions in convex/
src/
├── main.tsx
├── App.tsx
├── router.tsx
├── components/
│   ├── layout/            # ServerRail, ChannelSidebar, MemberList, MainPane
│   ├── chat/               # MessageList, MessageItem, MessageComposer, TypingIndicator
│   ├── servers/            # CreateServerModal, InviteModal, ServerSettings
│   ├── channels/           # ChannelList, CreateChannelModal
│   ├── dm/                 # DmList, DmThread
│   └── call/               # VoiceChannelPanel, VideoTile, CallControls
├── pages/
│   ├── LoginPage.tsx
│   ├── ServerPage.tsx      # server + channel + chat pane shell
│   └── DmPage.tsx
├── hooks/                  # useCall.ts (WebRTC/RTCPeerConnection + Convex signaling glue)
└── lib/                    # client-only helpers (formatting, constants)

convex/
├── schema.ts                # all tables + indexes
├── auth.ts                  # Convex Auth (password provider) config
├── users.ts                 # presence heartbeat, profile queries/mutations
├── servers.ts                # create/rename/delete server, invite redeem
├── serverMembers.ts          # membership queries/mutations, remove member
├── channels.ts                # create/rename/delete text & voice channels
├── messages.ts                # send/edit/delete/paginated list, typing indicators
├── directMessages.ts          # DM thread lookup/create, send/edit/delete
├── calls.ts                    # join/leave voice channel call, participant state
└── signals.ts                  # WebRTC offer/answer/ICE candidate exchange

tests/
└── unit/                       # Vitest specs for convex/ functions (convex-test)
```

**Structure Decision**: Single repository, Vite React app at the root and Convex backend
functions under `convex/`, as specified in the guide. No separate frontend/backend repos and no
mobile targets — matches Project Type "Web application" above.

## Phase 5 Audit: WebRTC Signaling Flow Walkthrough

Required by the guide before task breakdown: confirm two clients in a voice channel can reach a
connected `RTCPeerConnection` using only the tables in data-model.md (`calls`, `callParticipants`,
`signals`). Step by step:

1. User A and User B both call `calls.joinCall({channelId})`. The first caller creates the
   `calls` row; both get a `callParticipants` row. Each client now has a live
   `getActiveCall`/`listSignalsForMe` subscription open.
2. Each client deterministically computes polite/impolite role from the two participants' user
   IDs (lower ID = polite, per research.md §3) — no extra table needed, this is derived client-side.
3. One side's `RTCPeerConnection.onnegotiationneeded` fires; it calls `createOffer`,
   `setLocalDescription(offer)`, then `signals.sendSignal({callId, toUserId: <peer>, type: "offer", payload: SDP})`.
4. The peer's `listSignalsForMe` subscription (filtered to unconsumed rows addressed to it) pushes
   the new offer row automatically — no polling.
5. The peer applies `setRemoteDescription(offer)`, immediately calls `ackSignal` on that row, then
   `createAnswer` → `setLocalDescription(answer)` → `sendSignal(type: "answer")` back.
6. The original side receives the answer via its own subscription, applies
   `setRemoteDescription(answer)`, and `ackSignal`s it.
7. In parallel, each side's `onicecandidate` fires repeatedly; each candidate is sent immediately
   as its own `signals` row (`type: "ice-candidate"`), not batched.
8. A candidate arriving before the local side has called `setRemoteDescription` is queued in
   memory and flushed right after `setRemoteDescription` resolves (research.md §3 — this is the
   "connection never completes" bug from the guide's troubleshooting section). Each applied
   candidate is `ackSignal`'d.
9. If both sides happen to create offers at nearly the same time (e.g., simultaneous join), the
   polite peer detects the incoming offer collides with its own pending local offer and performs
   `setLocalDescription({type: "rollback"})` before accepting the remote offer (Perfect
   Negotiation) — no manual "who goes first" table needed; role is derived per step 2.
10. Once ICE checks complete, `connectionState` becomes `"connected"`; `ontrack` fires on both
    sides and each attaches the remote `MediaStream` to a `<video autoPlay playsInline>` element's
    `srcObject`.

This confirms the `signals` table plus reactive `useQuery` fully replaces a Socket.io signaling
server — no additional real-time transport or table is required.

## Audit Findings & Fixes Applied

Self-audit against the constitution and spec (Phase 5), performed before `/speckit-tasks`:

- **Gap found**: FR-027 (owner leaves/deletes account cascades server deletion) had no
  corresponding mutation in contracts/convex-api.md. **Fixed**: added `users.deleteAccount()` and
  `servers.leaveServer()` to contracts/convex-api.md.
- **Gap found**: the signaling contract described consumed-row cleanup only vaguely ("responsible
  for deleting/acking"), risking re-application of the same SDP/ICE payload on every reactive
  update. **Fixed**: added an explicit `signals.ackSignal({signalId})` mutation and a
  `consumedAt` field to the `signals` table in data-model.md; `listSignalsForMe` now returns only
  unconsumed rows, oldest-first.
- **Over-engineering check**: no component library, state-management library, SFU/MCU, or
  separate signaling server was introduced — full-mesh WebRTC + Convex reactivity only, per
  Constitution Principle I. No violations found.
- **Spec ↔ plan traceability**: every FR-001–FR-027 maps to at least one contract function; no
  plan/contract entry exists without a corresponding spec requirement (verified by inspection
  against contracts/convex-api.md and data-model.md above).

## Complexity Tracking

*No violations — table intentionally empty.*
