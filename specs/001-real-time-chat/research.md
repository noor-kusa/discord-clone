# Phase 0 Research: Real-Time Chat & Video Community Platform

## 1. Convex Auth — password provider setup

- **Decision**: Use `@convex-dev/auth` with the `Password` provider, imported from
  `@convex-dev/auth/providers/Password` and registered in `convex/auth.ts`'s `providers` array.
- **Rationale**: Matches the plan's stack choice and requires no external auth service; sign-up
  and sign-in are modeled as separate flows (distinguished by a `flow` field) to avoid confusing
  error states, and passwords are hashed server-side (Scrypt via Lucia) — no custom crypto needed.
- **Constraints to carry into data-model/contracts**: default validation requires passwords be
  non-empty and ≥8 characters (custom validation can throw an `Error` to override); a production-
  grade password flow needs a reset-password path at minimum. Email verification is optional in
  v1 (not required by the spec) — deferred, not implemented.
- **Alternatives considered**: Clerk/Auth0 (rejected — adds an external service dependency for a
  v1 that has no compliance requirement forcing it; violates Simplicity First) and hand-rolled
  session/JWT auth (rejected — Convex Auth already solves this and is the stack's own answer).
- **Source**: https://labs.convex.dev/auth/config/passwords, https://docs.convex.dev/auth/convex-auth

## 2. Convex React hooks — real-time subscriptions

- **Decision**: All reads go through `useQuery` (subscribes and re-renders on change); all writes
  go through `useMutation` (returns an async function). No `useEffect` + manual `fetch` for any
  data that can change server-side — this directly satisfies Constitution Principle II.
- **Rationale**: `useQuery`'s subscription starts on mount and stops on unmount automatically; the
  underlying `ConvexReactClient` keeps a single WebSocket open and Convex pushes new results to the
  client reactively, so there is no polling loop to write or maintain.
- **Implication for presence/typing**: these are just regular Convex tables (`presence`,
  `typingIndicators`) read via `useQuery` like any other data — no separate real-time mechanism is
  needed beyond the tables themselves plus a client heartbeat mutation.
- **Alternatives considered**: TanStack Query + `@convex-dev/react-query` adapter (rejected for v1
  — adds a second data-fetching library on top of Convex's own hooks with no benefit at this
  project's scale; Simplicity First).
- **Source**: https://docs.convex.dev/client/react

## 3. WebRTC signaling & connection pattern

- **Decision**: Implement the **Perfect Negotiation** pattern for every peer pair in the mesh.
  Deterministically designate the **polite peer** as the participant with the lower user ID (or
  lower `callParticipants` document creation order) in each pair; the other is impolite.
- **Rationale**: Perfect negotiation is MDN/W3C's recommended way to avoid signaling-glare bugs
  when two peers might create offers simultaneously (e.g., two users joining a voice channel at
  nearly the same moment). The polite peer rolls back its own pending local offer via SDP
  rollback when it receives a colliding remote offer instead of racing/ignoring it; the impolite
  peer always keeps its own offer and ignores incoming collisions.
- **ICE handling**: ICE candidates generated before the remote description is set MUST be queued
  and applied only after `setRemoteDescription` resolves — this is the classic "connection never
  completes" bug from the guide's troubleshooting section. Use `pc.restartIce()` (not
  `createOffer({iceRestart:true})`) for reconnection attempts, since it integrates with the
  `negotiationneeded` event handler already written for perfect negotiation rather than requiring
  a separate code path.
- **Signaling transport**: a Convex `signals` table (columns: `callId`, `fromUserId`, `toUserId`,
  `type` [offer/answer/ice-candidate], `payload`, `createdAt`) subscribed to via `useQuery` filtered
  to the current user, replacing a Socket.io/WebSocket signaling server. Writing a row is a
  mutation; the recipient's subscription fires automatically. This directly implements the guide's
  "calls/signals table plus reactive queries is your signaling server" insight.
- **Topology**: full-mesh, capped at 4 participants (6 peer connections max at full capacity) —
  acceptable at this scale per the plan's Technical Context; do not build an SFU/MCU for v1.
- **Alternatives considered**: LiveKit/Twilio SDK (rejected — the plan and constitution explicitly
  call for native `RTCPeerConnection`, no third-party media SDK, to keep the learning exercise and
  dependency footprint minimal) and a dedicated Socket.io signaling server (rejected — redundant
  with Convex's own reactivity, and would violate Simplicity First by introducing a second
  real-time transport).
- **Source**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation

## 4. Presence & typing indicators

- **Decision**: `presence` table keyed by `userId`, updated by a client heartbeat mutation every
  ~5 seconds while the app is open; a user is considered offline if their `lastSeen` timestamp is
  older than 10 seconds (per spec Clarifications SC-004), computed at query time (not via a cron
  cleanup job, to avoid a second moving part for v1). `typingIndicators` table keyed by
  `(channelId | dmThreadId, userId)`, refreshed on each keystroke (throttled client-side) and
  considered stale/cleared after ~3 seconds without a refresh — computed the same way.
- **Rationale**: Deriving "online" and "typing" from a timestamp comparison at read time (rather
  than an explicit "offline" write on disconnect) is robust to the unreliable `beforeunload` event
  called out in the guide's WebRTC troubleshooting section — matches the "Stale participants" fix
  the guide recommends for call participants and generalizes cleanly to presence/typing too.

## 5. Version pins

- Convex: latest `convex` npm package + `@convex-dev/auth` (resolve exact versions at
  `npm install` time in Phase 7 setup — do not hardcode a version number here that will drift).
- React 18, Vite (latest 5.x), Tailwind CSS (latest 3.x), React Router (latest 6.x).
- No NEEDS CLARIFICATION items remain — all Technical Context fields in plan.md are resolved.
