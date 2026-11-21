# The Hive — product plan

Written by the CEO / product lead, 2026-11-18. `HIVE_ROADMAP.md` tracks
engineering steps; this file says what "done" means and in what order.

## Who it is for, and the promise

The Hive is for one owner and a small circle: a few teammates, friends or
family, plus the owner's AI agents. Nobody else.

**Promise: a private workspace for a small team and their AI agents, running
on hardware the owner controls — nothing leaves the owner's Mac unless the
owner says so.**

## What exists today (honest picture)

- **Relay** (Rust) runs on the Mac with Postgres, Redis and versitygw storage.
- **iPhone app** (Flutter) has most of the product: channels, DMs, threads,
  forum, search, activity, huddles, agents, invites, onboarding, settings.
- **Web app** has only home, invite page and a git repo browser. There is
  **no chat on the web yet**; upstream used the deprecated `desktop/` app for
  that. This is the biggest product gap.
- Media is off, push is off, the phone does not yet reach the Mac over
  Tailscale, and no owner key is set.

## Definition of complete

The Hive is complete when every journey below passes on the owner's Mac,
tested from the owner's iPhone over Tailscale (home Wi-Fi *and* cellular) and
from a browser, with no request leaving for Block, Builderlab or any hosted
service (check with Little Snitch or the relay/network logs).

| # | Journey | Acceptance check |
|---|---|---|
| 1 | **Owner setup** | Fresh Mac: follow README self-host steps; reboot; relay, Postgres, Redis, storage come back alone. `https://<mac>.<tailnet>.ts.net` loads The Hive. |
| 2 | **Become owner** | Install app on iPhone, join by `wss://` link, copy public key into `RELAY_OWNER_PUBKEY`, restart. Owner sees admin actions (create invite, remove member); a second account does not. |
| 3 | **Invite a teammate** | Owner creates an invite on the phone; teammate opens the link on another device (joined to the tailnet), joins, appears in the member list; the invite cannot be reused past its limit. |
| 4 | **Channels and DMs** | Create public and private channel; post, edit, delete; DM the teammate. Both sides see changes in under 2 s; unread badges clear when read. |
| 5 | **Threads and reactions** | Reply in a thread, react with emoji, remove reaction. Thread reply count and reactions match on both devices after app restart. |
| 6 | **Photos, files, voice** | Send a photo, a PDF and a voice note. Each opens on the other device; the file exists under `~/Library/Application Support/TheHive/s3`; kill Wi-Fi, reopen — cached items still show. |
| 7 | **Search** | Search a word from a message, a thread reply and a DM. Results appear, tap jumps to the message. Private-channel messages never show to non-members. |
| 8 | **Huddles** | Start an audio huddle in a channel, teammate joins over cellular, both hear each other for 5 minutes, leave cleanly. |
| 9 | **Agents in roles** | `#leadership` has three agents — **CEO**, **CTO**, **Programmer** — each with its own key and profile. Mention @CTO with a question → threaded answer. Ask @Programmer for a change → it opens a patch in a Hive repo. Agents cannot read channels they are not in. |
| 10 | **Push notifications** | Phone locked: a DM and an @mention each produce a notification within 10 s; a muted channel does not. Push goes through a gateway on the Mac directly to Apple. |
| 11 | **Git hosting** | `git push` a repo to the relay; open it on the web; browse tree, read a file with highlighting, switch branch, search. Clone it back with `git clone`. |
| 12 | **Web chat** | From a laptop browser: sign in with the owner key, read and post in channels and DMs, see the same unread state as the phone. |
| 13 | **Recover** | Restore last night's backup to a clean Postgres + storage folder; all messages and media return. |

## Backlog

Size: **S** = under a day, **M** = a few days, **L** = a week or more.
🔑 = needs the owner (account, key, device or password).

### Now

1. **Tailscale HTTPS to the phone** (S, 🔑) — nothing on the phone works
   without it. Owner installs Tailscale on Mac + iPhone and enables HTTPS certs.
2. **Owner bootstrap** (S, 🔑) — set `RELAY_OWNER_PUBKEY` from the phone's key.
   Without it there is no admin and no invites.
3. **Turn media on** (S) — photos, files and voice are core chat; versitygw is
   already running.
4. **Fork CI (`hive-ci.yml`)** (M, 🔑 enable Actions) — every later change
   (rebrand, upgrades, agent PRs) needs a green check to be safe.
5. **Agents in roles: CEO, CTO, Programmer** (M, 🔑 LLM API key) — the owner's
   main reason for The Hive. Run the agent harness on the Mac as launchd jobs,
   one key and persona each, scoped to chosen channels.
6. **End-to-end journey test script** (M) — turns the table above into a
   repeatable checklist (and later an automated smoke run) so "works" is
   proven, not assumed.

### Next

7. **Web chat** (L) — the web has no messaging. Build channels, DMs, threads
   and composer on the existing web app (port from the mobile model, not the
   deprecated desktop app). Needed for journey 12 and for agents' humans at a
   desk.
8. **Self-hosted push** (M, 🔑 APNs `.p8` key from Apple) — run
   `buzz-push-gateway` on the Mac, talk directly to Apple, payloads carry no
   message text.
9. **Backups** (S, 🔑 choose destination) — nightly `pg_dump` + storage folder
   copy, 14-day retention, plus a tested restore.
10. **Rename "buzz" → "hive" (R1–R8)** (L) — owner decision already made; do
    one step per PR behind green CI.
11. **Replace remaining bee art** (S) — onboarding wordmark, welcome bees,
    web invite mark.
12. **Huddles over Tailscale** (M) — verify audio works on cellular; fix NAT
    or TURN config if not.

### Later

13. **Dependency upgrades, one at a time** (M, ongoing) — 134 Flutter
    packages behind; `cargo deny`, `pnpm audit`.
14. **Hive status page** (S) — web page for the owner: services up, disk
    used, last backup, agent health.
15. **Android build** (M, 🔑 device) — only if a teammate needs it.
16. **Agent spending limits** (S) — daily token budget per agent, posted in
    `#leadership`.
17. **Polls and kudos** (M) — from upstream's planned culture list, kept
    private to the community.

## Improvements over upstream, for this owner

1. **Private by default.** New channels are private; invites expire in 7 days
   and are single-use by default; no public directory or discovery.
2. **No public leaderboards or rankings.** Remove or hide any public
   contribution scores, streaks or "web of trust" ranking surfaces; keep
   activity visible only inside the community.
3. **Zero outside calls.** No Block, Builderlab, avatar CDN, release-check or
   analytics endpoints; a CI check fails if a known hosted domain appears in
   code.
4. **Tailnet-only access.** Relay listens on 127.0.0.1; only `tailscale serve`
   exposes it, so the internet cannot reach The Hive at all.
5. **One-command health and backup.** `scripts/hive/doctor.sh` checks every
   service, cert, disk and backup age and says what to fix in plain words.
6. **Named agent team out of the box.** CEO, CTO and Programmer personas ship
   as templates with clear limits (which channels, which repos, may they push
   or only propose).
7. **Agents ask before acting.** Anything outward-facing (merge, invite,
   delete) goes to the owner as an approve/deny card on the phone.
8. **Content-free push.** Notifications say "New message in #channel", never
   the text, so Apple never sees content.
9. **Owner's data export.** One button to export all messages, files and repos
   as plain files the owner can keep forever.

## Decisions the owner must make

1. **Delete `desktop/`?** Recommendation: **yes, delete.** It is deprecated,
   ~3k files, and makes the rename twice as long. Web chat replaces it.
2. **Push notifications:** create an APNs key (needs a paid Apple Developer
   account) — or live without push for now. Recommendation: do it in "Next".
3. **Backups:** where do they go — external drive, a second Mac, or encrypted
   to a cloud folder you own (e.g. iCloud Drive)? Recommendation: external
   drive plus encrypted iCloud copy.
4. **Which AI provider and budget** for the agents (Anthropic key, monthly
   cap). Needed before item 5.
5. **Who else is invited**, and do teammates need Tailscale access (yes, today)
   — or should The Hive ever be reachable without the tailnet?
   Recommendation: tailnet only.
6. **Android:** support it, or iPhone + web only? Recommendation: iPhone + web
   until someone asks.
7. **Keep pulling upstream Buzz fixes?** The full rename makes merges hard.
   Recommendation: accept that; cherry-pick security fixes by hand.

## Top 5 "Now" items

1. Tailscale HTTPS so the iPhone reaches the Mac (🔑).
2. Owner bootstrap — `RELAY_OWNER_PUBKEY` from the phone (🔑).
3. Turn media on and prove a photo round-trips.
4. Fork CI `hive-ci.yml` (🔑 enable Actions).
5. CEO / CTO / Programmer agents running on the Mac (🔑 LLM key).
