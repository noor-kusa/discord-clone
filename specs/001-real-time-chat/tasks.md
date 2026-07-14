# Tasks: Real-Time Chat & Video Community Platform

**Input**: Design documents from `/specs/001-real-time-chat/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/convex-api.md, quickstart.md

**Tests**: Constitution Principle VI (Testable Seams) requires at least a smoke test for the
send-message and join-call flows — these are included as required tasks, not optional. Broader
test coverage is not mandated for v1.

**Organization**: Tasks are grouped by user story (US1–US5, matching spec.md priorities P1/P1/P2/P3/P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single repo, per plan.md: Vite React app in `src/`, Convex functions in `convex/`, Vitest specs
in `tests/unit/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the app so `npm run dev` and `npx convex dev` both run cleanly.

- [ ] T001 Initialize Vite + React + TypeScript project at repo root (`npm create vite@latest . -- --template react-ts`)
- [ ] T002 Install and configure Tailwind CSS (tailwind.config, postcss.config, base styles in `src/index.css`)
- [ ] T003 [P] Install and configure React Router in `src/router.tsx`
- [ ] T004 [P] Configure ESLint + Prettier for TypeScript strict mode (Constitution Principle III)
- [ ] T005 Run `npx convex dev` once to create the Convex deployment and confirm `.env.local` is written and gitignored

**Checkpoint**: `npm run dev` serves a blank app; `npx convex dev` connects without error.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth, schema, and layout shell that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Define all tables and indexes in `convex/schema.ts` per data-model.md (users, presence, servers, serverMembers, channels, messages, typingIndicators, directMessageThreads, calls, callParticipants, signals)
- [ ] T007 Configure Convex Auth password provider in `convex/auth.ts` per research.md §1
- [ ] T008 [P] Implement `convex/users.ts`: `getCurrentUser`, `updateProfile`, `heartbeat`, `getPresence`, `deleteAccount`
- [ ] T009 Build `LoginPage.tsx` (sign-up/sign-in forms) in `src/pages/LoginPage.tsx`
- [ ] T010 Build the app shell layout (`ServerRail`, `ChannelSidebar`, `MainPane`, `MemberList` placeholders) in `src/components/layout/`
- [ ] T011 Wire `src/App.tsx` + `src/router.tsx` to route between login and the authenticated app shell

**Checkpoint**: A user can sign up, log in, log out, and see an empty app shell. Foundation ready for all user stories.

---

## Phase 3: User Story 1 - Real-Time Text Messaging in a Channel (Priority: P1) 🎯 MVP

**Goal**: Members exchange real-time text messages in a channel with edit/delete/typing/infinite scroll.

**Independent Test**: Seed two members directly into one server/channel (skip invite flow); verify live send, edit, delete, typing indicator, and paginated history per quickstart.md M3.

### Tests for User Story 1

- [ ] T012 [P] [US1] Smoke test: sending a message via `messages.sendMessage` persists and is retrievable via `messages.listMessages`, in `tests/unit/messages.test.ts` (Constitution Principle VI — required, not optional)

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implement `convex/messages.ts`: `sendMessage` (2000-char cap, FR-023), `editMessage`, `deleteMessage` (author-only, FR-012), `listMessages` (paginated, newest-first, FR-013)
- [ ] T014 [P] [US1] Implement `setTyping` / `listTyping` in `convex/messages.ts` (typing indicator, FR-014)
- [ ] T015 [US1] Build `MessageList.tsx` + `MessageItem.tsx` in `src/components/chat/` using `useQuery(listMessages)` with infinite scroll
- [ ] T016 [US1] Build `MessageComposer.tsx` in `src/components/chat/` (send, edit-in-place, 2000-char guard, calls `setTyping` throttled on keystroke)
- [ ] T017 [US1] Build `TypingIndicator.tsx` in `src/components/chat/` using `useQuery(listTyping)`
- [ ] T018 [US1] Wire the "general" channel view into `ServerPage.tsx` in `src/pages/ServerPage.tsx`

**Checkpoint**: User Story 1 fully functional and independently testable per quickstart.md M3.

---

## Phase 4: User Story 2 - Create a Server and Invite Members (Priority: P1)

**Goal**: A user creates a server (with default "general" channel) and invites others via link.

**Independent Test**: Per quickstart.md M2 — create server, confirm default channel, join via invite, verify live member list update.

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implement `convex/servers.ts`: `createServer` (+ default "general" channel + owner membership in one mutation, FR-003/FR-004), `renameServer`, `deleteServer`, `regenerateInvite`, `joinServerByInvite`, `removeMember`, `leaveServer` (FR-027), `listMyServers`, `getServerMembers`
- [ ] T019a [P] [US2] Implement `convex/channels.ts`: `createChannel`, `renameChannel`, `deleteChannel` (owner-only; cascades messages per FR-009, ends active call per FR-022), `listChannels` — pulled forward from channel-management because US1 and US3 both need to query channels well before US5's owner-management UI lands
- [ ] T020 [US2] Build `CreateServerModal.tsx` in `src/components/servers/`
- [ ] T021 [US2] Build `InviteModal.tsx` (generate/copy invite link) and the invite-redeem route/page in `src/components/servers/` and `src/pages/`
- [ ] T022 [US2] Build `ServerRail.tsx` icons list using `useQuery(listMyServers)` in `src/components/layout/`
- [ ] T023 [US2] Build `MemberList.tsx` sidebar using `useQuery(getServerMembers)` joined with presence, in `src/components/layout/`
- [ ] T024 [US2] Build `ServerSettings.tsx` (rename, remove member, regenerate invite, leave server) in `src/components/servers/`

**Checkpoint**: User Stories 1 AND 2 both work independently per quickstart.md M2.

---

## Phase 5: User Story 3 - Voice/Video Calls in a Voice Channel (Priority: P2)

**Goal**: Members join a voice channel for a live 2-4 participant call with mic/camera toggle.

**Independent Test**: Per quickstart.md M5 — two (then a third/fourth) member join the same voice channel; verify live video tiles, mute/camera state, capacity cap, leave, and DM-initiated calls.

### Tests for User Story 3

- [ ] T025 [P] [US3] Smoke test: `calls.joinCall` creates a call + participant row, and a 5th join attempt on a full call is rejected, in `tests/unit/calls.test.ts` (Constitution Principle VI — required, not optional)

### Implementation for User Story 3

- [ ] T026 [P] [US3] Implement `convex/calls.ts`: `joinCall` (4-participant hard cap, FR-017), `leaveCall`, `setMicCamera`, `callHeartbeat`, `getActiveCall`, `listVoiceChannelOccupancy` (FR-019)
- [ ] T027 [P] [US3] Implement `convex/signals.ts`: `sendSignal`, `listSignalsForMe` (unconsumed-only), `ackSignal`
- [ ] T028 [US3] Implement `useCall.ts` hook in `src/hooks/`: `RTCPeerConnection` setup, Perfect Negotiation (polite/impolite by user ID), ICE candidate queuing, ICE restart via `pc.restartIce()` — per research.md §3 and plan.md's signaling walkthrough
- [ ] T029 [US3] Build `VoiceChannelPanel.tsx` + `VideoTile.tsx` in `src/components/call/` (join/leave, render remote streams via `ontrack` → `srcObject`, `autoPlay playsInline`)
- [ ] T030 [US3] Build `CallControls.tsx` (mic/camera toggle, leave) in `src/components/call/`
- [ ] T031 [US3] Show "connected to voice channel" occupancy in the channel list using `useQuery(listVoiceChannelOccupancy)` (FR-019)
- [ ] T032 [US3] Verify `deleteChannel` (from T019a, Phase 4/US2) ends any active call immediately when a voice channel is deleted (FR-022) — this is a verification task; T019a already implements the cascade
- [ ] T033 [US3] Support starting a 1-on-1 video call from an open DM (`joinCall({dmThreadId})`, FR-021) — depends on US4 (Phase 6) for the DM UI shell

**Checkpoint**: User Story 3 independently testable per quickstart.md M5.

---

## Phase 6: User Story 4 - Direct Messages Between Members (Priority: P3)

**Goal**: Users DM other members of a shared server, reusing US1's real-time message mechanics.

**Independent Test**: Per quickstart.md M4 — two users sharing a server open a DM and exchange messages; a non-shared-server user is blocked from DMing.

### Implementation for User Story 4

- [ ] T034 [P] [US4] Implement `convex/directMessages.ts`: `getOrCreateDmThread` (shared-server check, FR-016), `sendDmMessage`, `editDmMessage`, `deleteDmMessage`, `listDmMessages`, `listMyDmThreads`
- [ ] T035 [US4] Build `DmList.tsx` in `src/components/dm/` using `useQuery(listMyDmThreads)`
- [ ] T036 [US4] Build `DmThread.tsx` in `src/components/dm/`, reusing `MessageList`/`MessageComposer`/`TypingIndicator` from US1 scoped to `dmThreadId`
- [ ] T037 [US4] Build `DmPage.tsx` in `src/pages/` and wire the "start DM" entry point from `MemberList.tsx`
- [ ] T038 [US4] Add the "start video call" button to `DmThread.tsx`, completing T033 from US3

**Checkpoint**: User Stories 1–4 all independently functional per quickstart.md M4.

---

## Phase 7: User Story 5 - Channel Management (Priority: P3)

**Goal**: Server owners create, rename, and delete text/voice channels.

**Independent Test**: Owner creates/renames/deletes channels; non-owner is blocked; deleting a text channel removes its messages; deleting a voice channel ends its active call (FR-022).

### Implementation for User Story 5

**Note**: `convex/channels.ts` backend (T019a) was already implemented in Phase 4/US2, since US1
and US3 need to query channels before this story's UI lands. This story is UI-only.

- [ ] T040 [US5] Build `ChannelList.tsx` in `src/components/channels/` using `useQuery(listChannels)` (from T019a)
- [ ] T041 [US5] Build `CreateChannelModal.tsx` (name + text/voice type) in `src/components/channels/`
- [ ] T042 [US5] Add rename/delete controls to `ChannelList.tsx`, gated to owner only in the UI (server-side gate already in T019a)

**Checkpoint**: All five user stories independently functional. Full quickstart.md validation (M1–M5) should now pass end-to-end.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning multiple stories; final hardening before submission.

- [ ] T043 [P] Presence heartbeat wiring: call `users.heartbeat` on an interval from the app shell (`src/App.tsx`), satisfying SC-004 (10s offline detection)
- [ ] T044 [P] Stale-participant cleanup: treat `callParticipants` with an old `lastHeartbeat` as disconnected in `getActiveCall`/`listVoiceChannelOccupancy`, since `beforeunload` is unreliable (research.md §4)
- [ ] T045 Error/empty states across chat, server, and call UI (e.g., "channel full", "no messages yet")
- [ ] T046 [P] Write `README.md`: setup steps, architecture summary, known v1 limitations (no TURN server, etc., per quickstart.md)
- [ ] T047 Run full `quickstart.md` validation (M1–M5) manually across two browsers and record results
- [ ] T048 Confirm `.env.local` and any credentials remain untracked (`.gitignore` check) before final commit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **US1 (Phase 3)** and **US2 (Phase 4)**: Both P1; can proceed in parallel after Foundational, but US1 needs at least a seeded server/channel to render against (use Convex dashboard seeding, not the UI, until US2 lands — per US1's Independent Test).
- **US3 (Phase 5)**: Depends on Foundational + US2 (T019a gives it real channels to attach voice calls to; T033 has a soft dependency on US4's DM UI shell, T032 is a verification task depending on T019a which already exists by this point).
- **US4 (Phase 6)**: Depends on Foundational + US2 (shared-server check) + reuses US1 components.
- **US5 (Phase 7)**: Depends on Foundational + US2 (T019a backend already built there; this phase is UI-only).
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### Recommended implementation order (matches guide's milestone numbering M1–M5)

1. Setup + Foundational → M1 (Setup/Auth)
2. US2 (including T019a channels backend) → M2 (Servers/Channels)
3. US1 → M3 (Chat)
4. US4 → M4 (DMs/Presence, plus T043 from Polish)
5. US3 → M5 (Video) — completing T033/T038 cross-links with US4
6. US5 → owner-facing channel-management UI (backend already existed since M2)
7. Polish

### Parallel Opportunities

- All Setup [P] tasks (T003, T004) in parallel.
- Foundational [P] tasks (T008) can proceed alongside T009–T011 once schema (T006) and auth (T007) land.
- Within each user story, [P] tasks touch different files and can run in parallel; non-[P] tasks depend on the preceding one in that story.

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup → Phase 2 Foundational → Phase 4 US2 (need a real server to chat in) → Phase 3 US1.
2. **STOP and VALIDATE** against quickstart.md M1–M3.
3. Continue with US4, US3, US5, then Polish — validating against the corresponding quickstart.md milestone after each.

### Incremental Delivery

Each phase checkpoint above corresponds 1:1 to a quickstart.md milestone (M1–M5); commit after each
checkpoint passes manual verification, per Constitution Principle V (never leave main broken) and
the guide's "commit after every milestone" instruction.

---

## Cross-Artifact Analysis (`/speckit-analyze`, run after this file was generated)

- **Inconsistency found & fixed**: `convex/channels.ts` (list/create/delete channels) was
  originally scheduled entirely in Phase 7 (US5, P3/last), but US1 (chat) and US3 (calls) both
  need to query channels much earlier. Fixed by pulling the backend implementation forward into
  T019a (Phase 4/US2) and leaving Phase 7 as owner-management UI only, reusing T019a.
- **Inconsistency found & fixed**: T032 referenced a non-existent "T035 in Phase 6" for the
  `deleteChannel`→ends-active-call cascade; corrected to reference T019a where that logic actually
  lives.
- **FR ↔ task coverage**: every FR-001–FR-027 traces to at least one task, either directly (task
  text names the FR) or through its owning story's tasks (e.g., FR-001/002 via Foundational
  Phase 2, FR-008 via T019a, FR-018/020 via T026/T030). FR-025 and FR-026 correctly have no
  implementation task — they are "must NOT build this" / "must NOT restrict this" requirements.
- **No duplication or terminology drift** found between spec.md, plan.md, data-model.md,
  contracts/convex-api.md, and tasks.md after the two fixes above.

## Notes

- [P] tasks = different files, no dependencies within their phase.
- [Story] label maps each task to its spec.md user story for traceability.
- Every Convex mutation task (T008, T013, T019, T026, T027, T034, T039) MUST include the
  authentication + authorization check mandated by Constitution Principle IV — this is part of
  the task, not a follow-up.
- Two required smoke tests (T012, T025) satisfy Constitution Principle VI; no broader test suite
  is mandated for v1.
