# Discord Clone

A real-time chat and video calling app modeled on Discord: servers, channels, real-time
messaging, direct messages, presence, and WebRTC voice/video calls. Built with
[Spec-Driven Development](specs/001-real-time-chat/) using GitHub's Spec Kit and Claude Code —
see `specs/001-real-time-chat/` for the full constitution, spec, plan, data model, and tasks that
drove this implementation.

## Stack

- **Frontend**: React 18 + TypeScript (strict mode) + Vite + Tailwind CSS + React Router
- **Backend**: [Convex](https://convex.dev) — database, real-time query subscriptions, mutations,
  and auth (Convex Auth, password provider)
- **Voice/Video**: native `RTCPeerConnection` (no SDK), full-mesh topology for up to 4
  participants, signaled through Convex tables using the
  [Perfect Negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)
  pattern — no separate Socket.io/WebSocket signaling server

## Setup

Prerequisites: Node.js 18+, a free [Convex](https://convex.dev) account (GitHub login works).

```bash
npm install
npx convex dev   # terminal 1 — logs in, creates/selects a Convex deployment, writes .env.local, watches convex/
npm run dev      # terminal 2 — Vite dev server (http://localhost:5173)
```

First-time only: Convex Auth needs signing keys and a SITE_URL registered once:

```bash
npx @convex-dev/auth
```

It will ask for your local dev server URL — enter `http://localhost:5173` (or whatever port Vite
printed).

## Architecture

```text
src/
├── components/
│   ├── layout/     ServerRail, MemberList, PresenceHeartbeat
│   ├── chat/       MessageList, MessageItem, MessageComposer, TypingIndicator (shared by
│   │               channels and DMs via a ChatTarget union type)
│   ├── servers/    CreateServerModal, InviteModal, ServerSettings
│   ├── channels/   ChannelList, CreateChannelModal
│   ├── dm/         DmList, DmThread
│   └── call/       VoiceChannelPanel, VideoTile, CallControls
├── hooks/
│   └── useCall.ts  RTCPeerConnection + Perfect Negotiation + Convex signaling glue
└── pages/          LoginPage, HomePage, ServerPage, DmPage, InvitePage

convex/
├── schema.ts          all tables + indexes
├── auth.ts             Convex Auth (password provider)
├── users.ts             profile, presence heartbeat, account deletion
├── servers.ts            create/rename/delete/invite/join/leave/remove-member
├── channels.ts            create/rename/delete text & voice channels
├── messages.ts             channel messages: send/edit/delete/paginate/typing
├── directMessages.ts       DM threads: same message mechanics, shared-server gated
├── calls.ts                 join/leave voice call, mic/camera state, occupancy
└── signals.ts                WebRTC offer/answer/ICE candidate exchange
```

Every backend mutation/query checks the caller's identity and verifies they're authorized for
the resource they're touching (server membership, message authorship, call participancy, etc.)
before reading or writing anything.

## Known v1 limitations

- **No TURN server.** Only public STUN (`stun:stun.l.google.com:19302`) is configured, so calls
  between two devices on strict/symmetric NAT networks may fail to connect. Works reliably on
  the same network or on localhost.
- **No message attachments, reactions, threads, granular roles/permissions (beyond owner vs.
  member), screen sharing, mobile apps, or message search.** All explicitly out of scope for v1
  per the spec.
- **Invite links never expire** and aren't single-use — simplicity over invite management for v1.
- **Voice/video calls are capped at 4 participants** (hard limit, full-mesh topology); a 5th join
  attempt is rejected with a "channel full" message.
- **No ownership transfer.** If a server's owner leaves or deletes their account, the entire
  server (channels, messages, membership) is deleted rather than reassigned.

## Development workflow

This project follows Spec-Driven Development: every feature starts as a spec in
`specs/001-real-time-chat/`, not as code. See that folder for the constitution (project
principles), the full functional spec with clarifications, the technical plan (including a
step-by-step WebRTC signaling walkthrough), the data model, API contracts, and the task
breakdown this implementation was built from.
