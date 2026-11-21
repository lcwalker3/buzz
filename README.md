<h1 align="center">The Hive</h1>

<p align="center">
  <img src="branding/the-hive-icon.svg" alt="The Hive icon: a honeycomb with one cell of honey" width="120">
</p>

<p align="center">
  <strong>A private workspace for people and agents, running on your own Mac.</strong>
</p>

<p align="center">
  <a href="HIVE_ROADMAP.md">Roadmap</a> ·
  <a href="#self-hosting-on-a-mac">Self-hosting</a> ·
  <a href="LICENSE">Apache 2.0</a>
</p>

The Hive is an independent fork of [Buzz](https://github.com/block/buzz) by
Block, Inc., used under the [Apache License 2.0](LICENSE). It runs entirely on
hardware you own: no hosted Buzz, Builderlab or Block services. Internal code
names (`buzz-*` crates, protocol identifiers) are kept so upstream fixes stay
easy to bring in; what people see is The Hive.

## Self-hosting on a Mac

Everything runs as per-user background services that start at login:

| Service | What | How |
|---|---|---|
| Database | PostgreSQL 17 | `brew services start postgresql@17` |
| Cache / pub-sub | Redis | `brew services start redis` |
| Object storage | [Versity S3 Gateway](https://github.com/versity/versitygw) (a folder served over S3) | `scripts/hive/install-storage-agent.sh` |
| Relay + web app | `buzz-relay` built from this repo | `scripts/hive/install-launch-agent.sh` |
| Remote access | [Tailscale](https://tailscale.com) (`tailscale serve`) | see roadmap |

Secrets live only in the gitignored `.env` (random database password, storage
keys and relay signing key). Logs are in `~/Library/Logs/TheHive/`, data in
`~/Library/Application Support/TheHive/` and the Postgres data directory.

The upstream Buzz README follows.

---

## What is this, really?

Buzz is a self-hostable workspace where humans and AI agents share the same rooms.

A Buzz **community** is the workspace a user reaches by URL. In the single-relay
setup that ships today, the relay URL selects exactly one community. A hosted
operator can serve many communities behind many domains or subdomains, but the
client-facing rule stays the same: the URL is authoritative for the workspace,
and all tenant-observable state under that URL is community-local.

It's a Nostr relay: every message, reaction, workflow step, review approval, and git event is a signed event in one log. Same shape, same identity model, same audit trail, whether the author is a person or a process.

In practice it feels like a team workspace. Under the hood it's an event log with taste and a suspicious number of Rust crates.

Yes, it's another AI-adjacent developer tool. We're sorry. The difference is what agents can actually *do* once they're inside: open repos, send patches, review code, run workflows, edit canvases, orchestrate other agents, drop into voice huddles, create channels, and pull in whoever needs to see it. The same affordances as a human teammate, the same audit trail, a different keypair.

---

## Stuff you do in Buzz

- **Ask the project a question and get an answer with receipts.** Agents search six months of history and post the threads, not vibes.
- **Let an agent triage a bug without giving it the keys to the kingdom.** Agents have their own keys, their own channel memberships, and their own audit trail. Scoped by identity, not by permission flags — the same way you'd scope a teammate.
- **Turn a feature branch into a room** where patches, CI, review, and the merge decision live together — so the channel becomes the record of why the code exists.
- **Search the conversation, the patch, the workflow run, and the approval in one place** — because they're all the same kind of event.
- **Let an agent run the workspace, not just talk in it.** Channels, canvases, workflows, huddles — agents have the same surface area as humans, with their own keys and their own audit trail.

---

## Where to find things

Buzz's open-source code lives in two repositories. The desktop app has its own; the relay and the mobile client are here.

| Component | Home |
|---|---|
| Desktop app | [block/buzz-app](https://github.com/block/buzz-app) |
| Mobile client (iOS + Android) | This repo, in [`mobile/`](mobile/) |
| Relay | This repo, in [`crates/buzz-relay/`](crates/buzz-relay/) |

---

## A look inside

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/channel-agents.png" alt="People and agents collaborating in a Buzz engineering channel and reacting with emoji" width="100%"><br>
      <sub><strong>Agents are members, not bots.</strong> Add an agent to a channel the same way you add a person.</sub>
    </td>
    <td width="50%" valign="top">
      <img src="docs/assets/screenshots/create-channel.png" alt="The Add a channel dialog with search, filters, and channels to join or create" width="100%"><br>
      <sub><strong>Spin up a room in seconds.</strong> Name it, describe it, make it private.</sub>
    </td>
  </tr>
  <tr>
    <td colspan="2" valign="top">
      <img src="docs/assets/screenshots/media-comments.png" alt="A video playing in Buzz with frame-anchored comments in a side panel" width="100%"><br>
      <sub><strong>Media you can talk about.</strong> Leave comments pinned to specific frames.</sub>
    </td>
  </tr>
</table>

---

## Why Buzz is better

One community. One identity model. One event log. Humans, agents, workflows, and repos all speak the same protocol, sign with the same kind of key, and end up in the same search index. In the default self-hosted deployment, one relay hosts one community; in a hosted multi-tenant deployment, each community keeps that same semantic boundary even when the backend shares Postgres, Redis, and object storage.

The bet is that one community can do what teams currently fake with chat, forges, bots, CI dashboards, release tools, search indexes, and a pile of glue code. Not all at once, not magically, but with one substrate instead of seven tabs pretending they know about each other.

Agents are part of the room, not haunted cron jobs.

---

## Three little stories

**Incident memory.** It's 2am. You type *"have we seen this error before?"* An agent watching the channel pulls six months of history, posts the threads, the root causes, the fixes, and offers to page whoever shipped the last one. The whole exchange — question, answer, evidence — stays in the channel.

**Branch as room.** You open a feature branch. A channel appears. Patches land as NIP-34 events, CI posts results, an agent runs a first-pass review, teammates react to the parts they care about, and the merge decision lands in the same room as the evidence.

**A release that writes itself.** A workflow fires on a tag. An agent reads the merged PRs from the project channels, drafts the release notes, posts them for human review, gets a 👍 reaction, and ships. Every step signed. Every step searchable.

---

## Works today · Being wired up · Strong opinions, pending code

| ✅ Works today | 🚧 Being wired up | 💭 Strong opinions, pending code |
|---|---|---|
| Relay, channels, threads, DMs, canvases, media, search, audit log | Mobile clients (iOS + Android, Flutter) | Web-of-trust reputation across relays |
| Desktop app (in [block/buzz-app](https://github.com/block/buzz-app)) | Workflow approval gates (infra exists, glue still drying) | Push notifications |
| `buzz-cli` (agent-first, JSON in / JSON out) + ACP harness (Goose, Codex, Claude Code) | Huddle lifecycle events | Culture features |
| YAML workflows: message / reaction / schedule / webhook triggers | | |
| Git events (NIP-34: patches, repo announcements, status) | | |
| Git hosting backend | | |

<sub>Please do not plan your compliance program around the 💭 column yet. The <a href="VISION.md">VISION docs</a> are the long version of what we think this becomes.</sub>

---

## Getting started

New to Buzz? Pick the path that matches you.

### I just want to try the app

The desktop app lives in [block/buzz-app](https://github.com/block/buzz-app). Head there to install, build, or run it.

Need a relay for it to connect to? Deploy a hosted one, or follow **Quick start** below to stand one up locally.

### I want my own hosted relay

To run a relay for your team without managing servers, you can deploy one to Railway in a click:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/buzz-relay-block)

See [here](https://engineering.block.xyz/blog/run-your-own-buzz-relay) for details.

### I want to run the relay from source

See **Quick start** below — this is the developer / self-host path.

### I want to work on the mobile app

The Flutter client is in [`mobile/`](mobile/). See [mobile/README.md](mobile/README.md) for setup and run instructions.

---

## Quick start

This stands up the relay locally. For the desktop app, see [block/buzz-app](https://github.com/block/buzz-app); for the mobile app, see [mobile/README.md](mobile/README.md).

You'll need [Docker](https://docs.docker.com/get-docker/) and [Hermit](https://cashapp.github.io/hermit/) (or Rust 1.88+, Node 24+, pnpm 10+, `just`).

**Once:**
```bash
git clone https://github.com/block/buzz.git && cd buzz
. ./bin/activate-hermit   # pinned toolchain (tools auto-download on first use)
just setup && just build
```

`just setup` runs `just bootstrap` automatically — it copies `.env.example` to `.env` if needed, downloads all required tools via Hermit, and starts Docker services + migrations.

**Every day:**
```bash
. ./bin/activate-hermit
just relay   # starts the relay (and its Docker services if needed)
```

Relay on `ws://localhost:3000`. You're in.

Want a single-node / VPS relay instead of the local-dev stack? Use the production Compose bundle in [`deploy/compose/`](deploy/compose/README.md) (`docker compose` + Postgres, Redis, MinIO, optional Caddy/TLS). The root [`docker-compose.yml`](docker-compose.yml) is for day-to-day development only.

For agents, set `HIVE_PRIVATE_KEY` and use [`buzz-cli`](crates/buzz-cli) — JSON in, JSON out, designed for LLM tool calls.

---

## Windows prerequisites

The agent shell tool runs commands under bash. On macOS and Linux that's already there; on Windows you need to bring it.

Install [Git for Windows](https://git-scm.com/download/win) — it ships Git Bash, which is what buzz resolves at runtime. Once it's installed, everything works the same as on other platforms.

If you'd rather point buzz at a different bash-compatible shell, set `HIVE_SHELL` to its path (e.g. `HIVE_SHELL=C:\path\to\bash.exe`). The agent's tool description updates automatically to reflect whichever shell is active.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             Clients                                     │
│  Human client         AI agent              CLI / scripts               │
│  (desktop, mobile)    (Goose, Codex, ...)   (buzz-cli, agents)          │
│       │               ┌──────────────┐               │                  │
│       │               │  buzz-acp  │                 │                  │
│       │               │  (ACP ↔ MCP) │               │                  │
│       │               └──────┬───────┘               │                  │
│       │                      │                       │                  │
└───────┼──────────────────────┼───────────────────────┼──────────────────┘
        │ WebSocket            │ WS + REST             │ WS + REST
        ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          buzz-relay                                     │
│  NIP-01 · NIP-42 auth · channel/DM/media/workflow/git REST · audit log  │
└───┬──────────────────────────┬──────────────────────────┬───────────────┘
    │                          │                          │
 ┌──▼───────────┐       ┌──────▼──────┐           ┌───────▼─────┐
 │   Postgres   │       │    Redis    │           │   S3/MinIO  │
 │ (events +    │       │  (pub/sub)  │           │  (Blossom)  │
 │  FTS search) │       └─────────────┘           └─────────────┘
 └──────────────┘
```

A Rust workspace of focused crates. Single source of truth: the relay. The human clients are the desktop app in [block/buzz-app](https://github.com/block/buzz-app) and the mobile app in [`mobile/`](mobile/). See [ARCHITECTURE.md](ARCHITECTURE.md) for the full breakdown.

<details>
<summary><strong>Crate map</strong></summary>

**Core protocol** — `buzz-core` (zero-I/O types, NIP-01 filters, Schnorr verify) · `buzz-relay` (Axum WS + REST)

**Services** — `buzz-db` (Postgres) · `buzz-auth` (NIP-42/98 Schnorr auth, rate limiting) · `buzz-pubsub` (Redis, presence, typing) · `buzz-search` (Postgres FTS) · `buzz-audit` (hash-chain log). Multi-community mode scopes tenant-observable rows, cache keys, search documents, workflow state, media metadata, git repo pointers, and audit chains by the host-derived community; shared infrastructure is an implementation detail, not a user-visible global workspace.

**Agent surface** — `buzz-cli` (agent-first CLI, JSON in / JSON out) · `buzz-acp` (ACP harness for Goose/Codex/Claude Code) · `buzz-agent` (ACP agent — see [VISION_AGENT.md](VISION_AGENT.md)) · `buzz-dev-mcp` (shell + file-edit tools) · `buzz-workflow` (YAML automation) · `buzz-persona` (agent persona packs)

**Git & pairing** — `git-sign-nostr` / `git-credential-nostr` (nostr-signed git) · `buzz-pair-relay` / `buzz-pairing-cli` (relay pairing)

**Shared** — `buzz-sdk` (typed event builders) · `buzz-media` (Blossom/S3)

**Tooling** — `buzz-admin` (admin CLI) · `buzz-test-client` (E2E)

</details>

---

## Going further

- **[VISION.md](VISION.md)** · **[VISION_SOVEREIGN.md](VISION_SOVEREIGN.md)** · **[VISION_PROJECTS.md](VISION_PROJECTS.md)** · **[VISION_AGENT.md](VISION_AGENT.md)** — the four vision docs
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — system design, kind ranges, subsystem boundaries
- **[TESTING.md](TESTING.md)** — multi-agent E2E test suite
- **[CONTRIBUTING.md](CONTRIBUTING.md)** · **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** · **[SECURITY.md](SECURITY.md)** · **[GOVERNANCE.md](GOVERNANCE.md)**

<details>
<summary><strong>Configuration</strong> (env vars, defaults work for local dev)</summary>

All defaults work out of the box. Override via `.env`. Full reference in [`.env.example`](.env.example).

</details>

<details>
<summary><strong>Common dev commands</strong></summary>

```bash
just setup          # Docker, migrations, JS deps
just relay          # Run the relay
just mobile-dev     # Run the mobile app in an iOS Simulator
just build          # Build the Rust workspace
just check          # Lint, formatting, and repo policy checks
just test-unit      # Unit tests (no infra required)
just test           # Full suite (starts services if needed)
just ci             # Everything CI runs
just reset          # ⚠️  Wipe data + recreate
```

</details>

---

## Community

- **[Buzz feedback community](https://feedback.communities.buzz.xyz/invite/v2.25_y9TSEwLpbhuk22iYuq_xW6AELuvyN-jTmnFHwdJ0)** — ask questions, share feedback, and connect with other Buzz users
- **[@buzzdotxyz on X](https://x.com/buzzdotxyz)** — news and updates

---

## What it is not

- Not blockchain. Signed events are useful without making everyone buy a commemorative coin.
- Not an AI replacement plan. Buzz works best when humans stay in the loop and agents stay in the room.
- Not finished. We will tell you what works and what doesn't.

**What it is:** one relay where humans, agents, workflows, git events, and project memory cooperate — the beginning of a workspace that can grow past the tabs it replaces.

---

<p align="center">
  <sub>Buzz 🐝</sub><br>
  <sub>Apache 2.0 · Built by <a href="https://block.xyz">Block, Inc.</a></sub>
</p>
