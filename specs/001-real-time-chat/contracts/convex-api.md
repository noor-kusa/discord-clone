# Phase 1 Contracts: Convex Query/Mutation API

Convex has no REST layer for the app itself — the "interface contract" is the set of typed
query/mutation function signatures the frontend calls via `useQuery`/`useMutation`. Every
mutation below MUST verify `ctx.auth.getUserIdentity()` is present and that the caller is
authorized for the resource touched (Constitution Principle IV) before making any writes.

## users.ts

- `query getCurrentUser()` → current user's profile, or `null` if unauthenticated.
- `mutation updateProfile({displayName?, avatarUrl?})` → caller only, updates own profile.
- `mutation heartbeat()` → upserts `presence.lastSeen = now` for the caller.
- `query getPresence({userIds: Id<"users">[]})` → `{userId, isOnline}[]`, derived from `lastSeen`.
- `mutation deleteAccount()` → caller only; cascades to delete every server the caller owns
  (channels, messages, members — FR-027) and removes the caller's `serverMembers` rows in servers
  they don't own.

## servers.ts

- `mutation createServer({name, imageUrl?})` → creates server + owner membership + default
  "general" text channel, in one transaction. Returns the new server.
- `mutation renameServer({serverId, name})` → owner-only.
- `mutation deleteServer({serverId})` → owner-only; cascades to channels/messages/members.
- `mutation regenerateInvite({serverId})` → owner-only; returns new non-expiring `inviteToken`.
- `mutation joinServerByInvite({inviteToken})` → creates a `serverMembers` row for the caller if
  not already a member (idempotent — Edge Cases: reused invite for existing member is a no-op that
  just returns the server).
- `mutation removeMember({serverId, userId})` → owner-only; deletes the `serverMembers` row and
  disconnects that user from any active call in that server (Edge Cases).
- `mutation leaveServer({serverId})` → caller removes their own membership. If the caller is the
  server's owner, this instead deletes the whole server, its channels, messages, and remaining
  members (FR-027) — there is no ownership-transfer path in v1.
- `query listMyServers()` → all servers the caller owns or is a member of.
- `query getServerMembers({serverId})` → members joined with `presence`, membership-gated.

## channels.ts

- `mutation createChannel({serverId, name, type})` → owner-only.
- `mutation renameChannel({channelId, name})` → owner-only.
- `mutation deleteChannel({channelId})` → owner-only; cascades to messages and ends any active call.
- `query listChannels({serverId})` → membership-gated.

## messages.ts

- `mutation sendMessage({channelId, content})` → membership-gated; rejects `content.length > 2000`.
- `mutation editMessage({messageId, content})` → author-only.
- `mutation deleteMessage({messageId})` → author-only; soft delete (`deletedAt`).
- `query listMessages({channelId, paginationOpts})` → membership-gated, newest-first, paginated
  (Convex's built-in pagination cursor, satisfying FR-013's infinite scroll).
- `mutation setTyping({channelId})` → upserts a `typingIndicators` row; client calls this on
  keystroke, throttled to ~1/sec.
- `query listTyping({channelId})` → membership-gated, filters out entries with `updatedAt` older
  than ~3s.

## directMessages.ts

- `mutation getOrCreateDmThread({otherUserId})` → verifies the caller and `otherUserId` share at
  least one server (FR-016) before creating/returning the thread.
- `mutation sendDmMessage / editDmMessage / deleteDmMessage` → same shape and rules as channel
  message mutations, scoped to `dmThreadId` and gated on thread membership.
- `query listDmMessages({dmThreadId, paginationOpts})` → thread-participant-gated.
- `query listMyDmThreads()` → all threads the caller participates in.

## calls.ts

- `mutation joinCall({channelId?, dmThreadId?})` → creates the `calls` row if none active for
  that channel/thread, then a `callParticipants` row for the caller; rejects with "channel full"
  if 4 non-left participants already exist (FR-017, Clarifications).
- `mutation leaveCall({callId})` → sets `leftAt`; if this was the last remaining participant, sets
  the call's `endedAt`.
- `mutation setMicCamera({callId, micOn?, cameraOn?})` → caller's own `callParticipants` row only.
- `mutation callHeartbeat({callId})` → updates `lastHeartbeat`; a background query/cleanup treats
  a participant as disconnected once `lastHeartbeat` goes stale (guards against unreliable
  `beforeunload`, per research.md §4).
- `query getActiveCall({channelId?, dmThreadId?})` → the current call and its participants
  (mic/camera state), membership-gated.
- `query listVoiceChannelOccupancy({serverId})` → per-voice-channel list of currently-connected
  users, for the channel-list "who's connected" display (FR-019).

## signals.ts

- `mutation sendSignal({callId, toUserId, type, payload})` → call-participant-gated (caller and
  `toUserId` must both be active participants in `callId`).
- `query listSignalsForMe({callId})` → returns **unconsumed** signals addressed to the caller for
  this call, oldest-first (so offers/answers/ICE candidates are applied in the order generated).
- `mutation ackSignal({signalId})` → marks a signal row consumed (or deletes it) once the client
  has applied it (`setRemoteDescription` / `addIceCandidate`). The client MUST call this
  immediately after successfully applying a signal so `listSignalsForMe`'s live subscription never
  re-delivers an already-applied SDP/ICE payload on its next reactive update.
