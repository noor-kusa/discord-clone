# Quickstart: Validate the Real-Time Chat & Video Platform

## Prerequisites

- Node.js 18+, two browsers (or one normal + one incognito window) with two separate accounts.
- A free Convex account (convex.dev) — no CLI pre-install needed, `npx convex dev` handles it.

## Setup

```bash
npm install
npx convex dev   # terminal 1 — logs into Convex, creates deployment, writes .env.local, watches convex/
npm run dev      # terminal 2 — Vite dev server
```

The first `npx convex dev` run prompts you to log in and create/select a Convex project, then
writes the deployment URL into `.env.local` (never commit this file).

## Milestone validation scenarios

Each milestone corresponds to a group of tasks in `tasks.md` (Phase 2 output). Run these checks
before moving to the next milestone (Constitution Principle V — never leave main broken).

### M1 — Setup & Auth

1. Sign up as User A in browser 1, User B in browser 2.
2. Open the Convex dashboard's `users` table — both accounts should appear.
3. **Pass**: both users can log out and back in without error.

### M2 — Servers & Channels

1. User A creates a server named "Test Server".
2. Confirm a "general" text channel exists automatically (FR-004).
3. User A generates an invite link; User B opens it and joins.
4. **Pass**: User A sees User B appear in the member sidebar without refreshing (real-time,
   FR-006/SC-002).
5. User A creates a second text channel and a voice channel; renames one; deletes the other.
6. **Pass**: User B's channel list updates live to match, without refreshing.

### M3 — Chat

1. Both users open the "general" channel.
2. User A sends a message; **pass**: appears for User B in under ~1 second (SC-001).
3. User A edits then deletes their message; **pass**: User B sees the edit mark, then the removal,
   live.
4. User B starts typing; **pass**: User A sees a typing indicator that clears when User B stops.
5. Send >2000 characters; **pass**: rejected client-side before sending (FR-023).
6. Scroll up through history; **pass**: older messages load progressively (FR-013).

### M4 — DMs & Presence

1. User A opens a DM with User B (they share "Test Server"); send/edit/delete a DM message;
   **pass**: same real-time behavior as channel messages.
2. Attempt (via a third seeded user with no shared server) to DM User A; **pass**: rejected
   (FR-016).
3. User B closes their tab; **pass**: User A sees User B flip to offline within 10 seconds
   (SC-004, per Clarifications).

### M5 — Video

1. Both users join the same voice channel.
2. **Pass**: both video tiles appear; toggling mic/camera on one side reflects on the other in
   real time (FR-018).
3. A third seeded user joins the same call; **pass**: works up to 4 total participants.
4. A 5th user attempts to join; **pass**: rejected with a "channel full" message (FR-017,
   Clarifications).
5. Either participant leaves; **pass**: the other sees them disconnect (FR-020).
6. From a DM, start a 1-on-1 video call; **pass**: the other party can join it (FR-021).
7. Delete the voice channel while a call is active; **pass**: the call ends immediately for all
   participants (Edge Cases, Clarifications).

## Known v1 limitations (document in README, do not debug indefinitely)

- No TURN server — calls across strict-NAT networks may fail to connect; localhost/same-network
  testing is expected to work.
- No message attachments, reactions, threads, granular roles, screen sharing, mobile apps, or
  message search (explicitly out of scope, FR-025).
