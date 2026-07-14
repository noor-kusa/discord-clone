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

## Complexity Tracking

*No violations — table intentionally empty.*
