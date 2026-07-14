# Feature Specification: Real-Time Chat & Video Community Platform

**Feature Branch**: `001-real-time-chat`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Build a real-time chat and video calling application modeled on Discord. Users sign up and log in with a display name, avatar, and visible online/offline status. A logged-in user can create a server (a named community), become its owner, and invite others via an invite link. Every server starts with a default 'general' text channel; owners can create, rename, and delete text and voice channels. Members send real-time text messages with edit/delete, infinite scroll history, and typing indicators. Any user can open a 1-on-1 DM with another member of a shared server. Members can join a voice channel to start or join a live call (2-4 participants), toggle mic/camera, see who's speaking/muted, and leave. Out of scope for v1: attachments, reactions, threads, roles/permissions beyond owner vs member, screen sharing, mobile apps, message search."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Text Messaging in a Channel (Priority: P1)

A member of a server opens a text channel and exchanges messages with other members. Everyone in the channel sees new messages, edits, and deletions the instant they happen, with no manual refresh.

**Why this priority**: This is the core value proposition of the product — real-time group text chat. Without it, there is no usable product at all. Everything else (servers, DMs, calls) is built around this capability.

**Independent Test**: Two users who are already members of the same server and channel can be seeded directly (skipping server/invite flows); one sends a message and the other sees it appear live, edits/deletes their own message, and sees a typing indicator — this alone delivers a working chat MVP.

**Acceptance Scenarios**:

1. **Given** two members are viewing the same text channel, **When** one sends a message, **Then** the other sees it appear within the channel without refreshing the page.
2. **Given** a member authored a message, **When** they edit it, **Then** all viewers see the updated content marked as edited.
3. **Given** a member authored a message, **When** they delete it, **Then** it disappears for all viewers in real time.
4. **Given** a member is typing in a channel, **When** another member is viewing that channel, **Then** the second member sees a typing indicator that clears when typing stops or a message is sent.
5. **Given** a channel has more history than fits on screen, **When** a member scrolls up, **Then** older messages load progressively (infinite scroll), newest messages shown first.

---

### User Story 2 - Create a Server and Invite Members (Priority: P1)

A user creates a named community ("server"), automatically becomes its owner, and can generate an invite link that lets other users join. The server always starts with a default "general" text channel so it is immediately usable.

**Why this priority**: Servers are the organizing container for every other feature (channels, membership, presence). Chat cannot be demonstrated end-to-end without at least one server existing and being joinable, so this must land alongside or immediately after Story 1.

**Independent Test**: A single user can create a server and confirm a "general" channel exists; a second user can join via the generated invite link and appear in the member sidebar — independently testable and independently valuable (a usable, joinable community) even before messaging is verified.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they create a server with a name, **Then** a new server is created with them as owner and a default "general" text channel.
2. **Given** a server owner, **When** they generate an invite link, **Then** any user who opens that link and accepts becomes a member of the server.
3. **Given** a server with multiple members, **When** any member views the server, **Then** they see the full member list with each member's online/offline status.
4. **Given** a server owner, **When** they rename the server or remove a member, **Then** the change is reflected for all members.

---

### User Story 3 - Voice/Video Calls in a Voice Channel (Priority: P2)

A member joins a voice channel and enters a live audio/video call with the other members currently in that channel. They can toggle their own mic/camera, see other participants' video and speaking/mute state, and leave.

**Why this priority**: Video/voice is Discord's other headline feature, but it is meaningfully more complex to build and depends on servers/channels already existing. It should follow, not block, core chat.

**Independent Test**: Two members join the same voice channel from two separate sessions; both see each other's video tile and mute state changes live, and the channel list shows both as connected — testable as a self-contained slice once channels exist.

**Acceptance Scenarios**:

1. **Given** a member opens a voice channel, **When** they join, **Then** they connect to a live call with any other members already present in that channel (supporting at least 2, targeting up to 4 participants).
2. **Given** a participant is in a call, **When** they toggle their microphone or camera, **Then** other participants see the updated mute/video state in real time.
3. **Given** a member is viewing the channel list, **When** anyone is connected to a voice channel, **Then** the list shows who is currently connected to that channel.
4. **Given** a participant is in a call, **When** they choose to leave, **Then** they are removed from the call and other participants see them disconnect.
5. **Given** two users share a server, **When** one starts a 1-on-1 video call from a direct message, **Then** the other receives and can join that call.

---

### User Story 4 - Direct Messages Between Members (Priority: P3)

Any user can open a 1-on-1 direct message conversation with another member of a server they share, with the same real-time, edit, and delete behavior as channel messages.

**Why this priority**: DMs reuse the same real-time messaging mechanics as Story 1 but add a new conversation type and access-control rule (must share a server). It's valuable but not required for the core group-chat experience to work.

**Independent Test**: Two users who share a server open a DM with each other and exchange messages with the same real-time/edit/delete behavior as a channel — independently testable once Story 1's messaging mechanics exist.

**Acceptance Scenarios**:

1. **Given** two users share at least one server, **When** either opens a DM with the other, **Then** a private 1-on-1 conversation is created (or reused if one exists).
2. **Given** an open DM conversation, **When** either party sends, edits, or deletes a message, **Then** the other party sees the change in real time.
3. **Given** two users do not share any server, **When** one attempts to DM the other, **Then** the system prevents it.

---

### User Story 5 - Channel Management (Priority: P3)

A server owner creates, renames, and deletes text and voice channels within their server so the community can be organized into topics.

**Why this priority**: Useful for organizing a growing server but not required for a minimal usable product — a single "general" channel is enough for Stories 1–4 to be demonstrated.

**Independent Test**: A server owner creates a new text channel and a new voice channel, renames one, and deletes another, confirming members immediately see the updated channel list.

**Acceptance Scenarios**:

1. **Given** a server owner, **When** they create a new text or voice channel, **Then** all members see it appear in the channel list.
2. **Given** a server owner, **When** they rename a channel, **Then** all members see the updated name immediately.
3. **Given** a server owner, **When** they delete a text channel, **Then** the channel and all of its messages are removed for all members.
4. **Given** a non-owner member, **When** they attempt to create, rename, or delete a channel, **Then** the system prevents it.

---

### Edge Cases

- What happens when the owner deletes a voice channel while a call is active in it? The call ends immediately for all participants.
- What happens when a member's connection drops mid-call? Other participants see them disconnect once their presence/heartbeat goes stale; they are not left showing as connected indefinitely.
- What happens when a member tries to send a message longer than the maximum length? The system rejects it client-side before sending, with the limit clearly indicated.
- What happens when someone opens an invite link to a server they're already a member of? They are taken directly into the server, not added as a duplicate member.
- What happens when the server owner removes a member who is currently in a call in that server? They are disconnected from the call and lose access to the server's channels.
- What happens when a fifth user tries to join a voice channel already at the 4-participant target capacity? The system indicates the channel/call is full; product must at minimum support 2 concurrent participants without failure.
- What happens when two users try to edit/delete the same message concurrently? The authoritative server state wins; only the message author's edit/delete requests are accepted in the first place.
- What happens when a user's own display name/avatar changes while they have historical messages? Historical messages reflect the display name/avatar at time of viewing (denormalized read is acceptable, but must not error).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to sign up and log in, each with a display name and avatar.
- **FR-002**: System MUST show each user's online/offline status to other users who share a server with them.
- **FR-003**: Users MUST be able to create a server (named community, optional image); the creator becomes its owner.
- **FR-004**: System MUST create a default "general" text channel automatically when a server is created.
- **FR-005**: Server owners MUST be able to generate an invite link that lets any user who opens it join the server.
- **FR-006**: System MUST display a server's member list with each member's online/offline status.
- **FR-007**: Server owners MUST be able to rename the server and remove members from it.
- **FR-008**: Server owners MUST be able to create, rename, and delete text channels and voice channels; all members can view all channels.
- **FR-009**: Deleting a text channel MUST remove its message history.
- **FR-010**: Members MUST be able to send text messages in a channel that appear for all members in real time without a page refresh.
- **FR-011**: Each message MUST display author name, avatar, timestamp, and content.
- **FR-012**: Message authors MUST be able to edit and delete only their own messages; edited messages MUST be visibly marked as edited.
- **FR-013**: Channel message history MUST load newest-first and support infinite scroll to load older messages.
- **FR-014**: System MUST show a live typing indicator when a member is composing a message in a channel or DM.
- **FR-015**: Any user MUST be able to open a 1-on-1 direct-message conversation with another user with whom they share at least one server; DMs support the same real-time send/edit/delete behavior as channel messages.
- **FR-016**: System MUST prevent a DM from being initiated between two users who do not share any server.
- **FR-017**: Members MUST be able to join a voice channel, which starts or joins a live call with the other members currently connected to that channel, supporting at least 2 and targeting up to 4 simultaneous participants.
- **FR-018**: Call participants MUST be able to toggle their own microphone and camera; other participants MUST see updated video tiles and speaking/muted state in real time.
- **FR-019**: The channel list MUST show who is currently connected to each voice channel.
- **FR-020**: Call participants MUST be able to leave a call at any time, with other participants seeing them disconnect.
- **FR-021**: Users MUST be able to start a 1-on-1 video call directly from an open DM conversation.
- **FR-022**: System MUST end a voice channel's active call immediately if that channel is deleted.
- **FR-023**: System MUST enforce a maximum message length of 2000 characters, rejecting longer messages before they are sent.
- **FR-024**: Invite links MUST NOT expire in v1.
- **FR-025**: System MUST NOT support message attachments/files, reactions, threads, roles/permissions beyond owner vs. member, screen sharing, mobile apps, or message search in this version (explicitly out of scope).

### Key Entities

- **User**: An individual account with display name, avatar, and derived online/offline status.
- **Server**: A named community with an optional image, owned by one user, containing channels and members.
- **Server Membership**: The relationship between a user and a server they've joined, distinct from ownership.
- **Channel**: A text or voice space within a server; text channels contain messages, voice channels host calls.
- **Message**: A piece of text content posted by a user into a channel or DM, with timestamp, author, edited flag, and soft-delete state.
- **Direct Message Conversation**: A private 1-on-1 thread between two users who share at least one server, behaving like a channel for messaging purposes.
- **Call**: A live voice/video session tied to a voice channel or a DM, with a set of currently connected participants.
- **Call Participant**: A user's presence within a specific call, including mic/camera state and connection status.
- **Invite Link**: A shareable token that grants membership to a specific server when redeemed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new message sent by one member becomes visible to another member viewing the same channel in under 1 second, with no manual refresh.
- **SC-002**: A member can create a server, generate an invite, and have a second user join and appear in the member list in under 2 minutes end-to-end.
- **SC-003**: Two to four participants can join the same voice channel and maintain a stable call (audio/video visible to one another) for the duration of a normal conversation without the session dropping unexpectedly.
- **SC-004**: A member's online/offline status change (e.g., closing the app) is reflected to other members within a few seconds.
- **SC-005**: 100% of a message's edit/delete actions are restricted to that message's original author, verified across all tested scenarios.
- **SC-006**: A user can locate and open a DM with any shared-server member in under 3 clicks/taps from the main interface.

## Assumptions

- Users have a broadband-quality internet connection sufficient for real-time text and video; no offline mode is required.
- Mobile native apps and message search are explicitly out of scope for v1, per the product description.
- Roles/permissions are limited to a simple owner-vs-member model; no custom roles or granular per-channel permissions are required in v1.
- A maximum message length of 2000 characters is a reasonable default where the source description did not specify one.
- Deleting a voice channel with an active call ends that call for all participants, rather than letting it continue orphaned.
- Invite links do not expire and are not single-use in v1, favoring simplicity over invite-management features.
- Voice/video calls target a full-mesh topology sized for small groups (2-4 participants); very large simultaneous calls are out of scope.
