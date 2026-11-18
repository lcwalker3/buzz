# The Hive knowledge base

Plain-language guides for running and using The Hive on your own Mac. Start
with **Concepts**, then follow the guide for what you want to do.

| Guide | What it answers |
|---|---|
| [Concepts](concepts.md) | What a community, channel, thread, forum, agent and role are |
| [Communities and workspaces](communities.md) | How to create a community, add a second one, archive one |
| [Running the server](server.md) | The services on the Mac, logs, restarts, updates |
| [Phone and remote access](remote-access.md) | Reaching The Hive from your iPhone with Tailscale |
| [Owner, invites and members](members.md) | Becoming owner, inviting people, roles, removing someone |
| [AI agents](agents.md) | Giving agents their own identity and running them (CEO, CTO, Programmer) |
| [Photos, files and voice](media.md) | Turning media on and where files are stored |
| [Git repositories](repos.md) | Pushing a repo to The Hive and browsing it on the web |
| [Backups and restore](backups.md) | What to back up and how to restore |
| [Troubleshooting](troubleshooting.md) | Common problems and fixes |

Related: [product plan](../../HIVE_PRODUCT_PLAN.md) (what "complete" means)
and [roadmap](../../HIVE_ROADMAP.md) (what is done and next).

**Golden rules**

- Secrets live only in `.env` at the repo root (never commit it) and in key
  files under `~/Library/Application Support/TheHive/`.
- Public keys (`npub…` or 64 hex characters) are safe to share. Secret keys
  (`nsec…`) are passwords: never paste them into chat, issues or channels.
- The Hive never talks to Block, Builderlab or other hosted services. If you
  find a setting that points at one, it is a bug.
