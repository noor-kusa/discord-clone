# Phase 1 Data Model: Real-Time Chat & Video Community Platform

All tables live in `convex/schema.ts`. Every table listed below needs an index for each access
pattern used by its queries (noted per table) per Constitution Principle III (typed schema access
only).

## users

Extends Convex Auth's own `users` table (from `authTables`) rather than a separate table — the
auth system's user document *is* the app profile, so `getAuthUserId(ctx)` returns this table's
`_id` directly with no separate lookup indirection.

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | Convex-generated; also the identity used by `getAuthUserId` |
| `email` | string | from Convex Auth's built-in fields |
| `displayName` | string | required; set via the Password provider's `profile()` callback at signup |
| `avatarUrl` | string | optional; default avatar if absent |

Indexes: `email` (inherited from `authTables`).

## presence

| Field | Type | Notes |
|---|---|---|
| `userId` | Id<"users"> | |
| `lastSeen` | number (ms epoch) | updated by client heartbeat every ~5s |

Indexes: `by_userId` (unique per user — upsert on heartbeat).
Derived state (not stored): `isOnline = now - lastSeen < 10_000` (FR: presence within 10s, per Clarifications).

## servers

| Field | Type | Notes |
|---|---|---|
| `name` | string | required |
| `imageUrl` | string | optional |
| `ownerId` | Id<"users"> | required |
| `inviteToken` | string | non-expiring in v1 (FR-024) |

Indexes: `by_ownerId`, `by_inviteToken`.
Lifecycle: deleting the owning user's account cascades to delete the server, its channels,
messages, and `serverMembers` rows (FR-027, Clarifications). No ownership transfer in v1.

## serverMembers

| Field | Type | Notes |
|---|---|---|
| `serverId` | Id<"servers"> | |
| `userId` | Id<"users"> | |
| `joinedAt` | number | |

Indexes: `by_serverId`, `by_userId`, `by_serverId_and_userId` (uniqueness + membership check).
A user may belong to (own or be a member of) any number of servers — no per-user cap (FR-026).

## channels

| Field | Type | Notes |
|---|---|---|
| `serverId` | Id<"servers"> | |
| `name` | string | e.g. "general" |
| `type` | "text" \| "voice" | |
| `createdAt` | number | |

Indexes: `by_serverId`.
Lifecycle: deleting a channel cascades to delete its `messages` (FR-009) and, if type is "voice",
ends any active `calls` row tied to it (Edge Cases, Clarifications).

## messages

| Field | Type | Notes |
|---|---|---|
| `channelId` | Id<"channels"> \| null | null when this row belongs to a DM thread instead |
| `dmThreadId` | Id<"directMessageThreads"> \| null | mutually exclusive with `channelId` |
| `authorId` | Id<"users"> | |
| `content` | string | max 2000 chars (FR-023) |
| `createdAt` | number | |
| `editedAt` | number \| null | non-null marks message as edited (FR-012) |
| `deletedAt` | number \| null | soft delete |

Indexes: `by_channelId_createdAt` (paginated, newest-first per FR-013), `by_dmThreadId_createdAt`.
Only `authorId` may mutate a message's `content`/`editedAt`/`deletedAt` (FR-012, enforced server-side).

## typingIndicators

| Field | Type | Notes |
|---|---|---|
| `channelId` | Id<"channels"> \| null | |
| `dmThreadId` | Id<"directMessageThreads"> \| null | |
| `userId` | Id<"users"> | |
| `updatedAt` | number | refreshed on keystroke, considered stale after ~3s |

Indexes: `by_channelId`, `by_dmThreadId`.

## directMessageThreads

| Field | Type | Notes |
|---|---|---|
| `userAId` | Id<"users"> | canonical ordering (lower id first) to keep thread unique per pair |
| `userBId` | Id<"users"> | |
| `createdAt` | number | |

Indexes: `by_userA_userB` (lookup/create-if-absent).
Creation guarded server-side: the two users MUST share at least one `serverMembers` server
(FR-016) before a thread is created.

## calls

| Field | Type | Notes |
|---|---|---|
| `channelId` | Id<"channels"> \| null | voice-channel call |
| `dmThreadId` | Id<"directMessageThreads"> \| null | 1-on-1 DM call (FR-021) |
| `startedAt` | number | |
| `endedAt` | number \| null | |

Indexes: `by_channelId`, `by_dmThreadId`.
Capacity rule: at most 4 rows in `callParticipants` with `leftAt = null` per call (FR-017); a 5th
join attempt is rejected with "channel full" (Clarifications).

## callParticipants

| Field | Type | Notes |
|---|---|---|
| `callId` | Id<"calls"> | |
| `userId` | Id<"users"> | |
| `joinedAt` | number | |
| `leftAt` | number \| null | |
| `micOn` | boolean | |
| `cameraOn` | boolean | |
| `lastHeartbeat` | number | staleness cleanup, since `beforeunload` is unreliable |

Indexes: `by_callId`, `by_callId_userId`.

## signals

| Field | Type | Notes |
|---|---|---|
| `callId` | Id<"calls"> | |
| `fromUserId` | Id<"users"> | |
| `toUserId` | Id<"users"> | |
| `type` | "offer" \| "answer" \| "ice-candidate" | |
| `payload` | string (JSON-encoded SDP or ICE candidate) | |
| `createdAt` | number | |
| `consumedAt` | number \| null | set by `ackSignal`; `listSignalsForMe` only returns rows where this is null |

Indexes: `by_callId_toUserId` (each client subscribes filtered to unconsumed messages addressed to itself).

## Relationships summary

```text
users 1───* serverMembers *───1 servers 1───* channels 1───* messages
users 1───1 presence
users *───* directMessageThreads (via userAId/userBId) 1───* messages (dmThreadId)
channels 1───0..1 active call (voice channels only) ── calls 1───* callParticipants
calls 1───* signals
```
