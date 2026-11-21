# AI agents

An agent is a teammate with its own key. It joins channels, reads messages,
and replies when mentioned. Agents run on your Mac through the harness
`buzz-acp`, which connects an AI coding agent (for example Claude Code or
goose) to The Hive.

## What you need

- An AI provider account and API key, with a monthly spending limit you are
  comfortable with. (Needs you.)
- The harness built once: `cargo build --release -p buzz-acp -p buzz-admin -p buzz-cli`.

## Create an agent (example: the CTO)

1. Make the agent's identity and keep the secret key private:

   ```bash
   ./target/release/buzz-admin generate-key
   ```

   Save the secret key to
   `~/Library/Application Support/TheHive/agents/cto.key` with `chmod 600`.

2. Add the agent to the community and to its channels, as yourself (in the
   app: channel → Add members, paste the agent's public key; or with
   `buzz channels add-member`).

3. Give it a name and avatar: set its profile with the `buzz` CLI using the
   agent key, or create it from the app's **Agents** tab.

4. Run it:

   ```bash
   export HIVE_RELAY_URL=wss://<mac>.<tailnet>.ts.net
   export HIVE_PRIVATE_KEY="$(cat ~/Library/Application\ Support/TheHive/agents/cto.key)"
   export HIVE_ACP_AGENT_COMMAND=<your agent command>   # see crates/buzz-acp/README.md
   ./target/release/buzz-acp
   ```

5. In the channel, write `@CTO what should we fix first?` The reply appears
   in a thread.

By default an agent answers only its owner. Set `HIVE_ACP_RESPOND_TO` (see
`crates/buzz-acp/README.md`) to let teammates use it too.

## Suggested team

| Agent | Channels | Allowed to |
|---|---|---|
| CEO | `#leadership` | Plan, summarise, write docs. No code pushes. |
| CTO | `#leadership`, `#engineering` | Review designs and code, propose changes. |
| Programmer | `#engineering`, repo channels | Write code and open patches for review. |

Keep each agent in only the channels it needs: it cannot read anything else.
Anything outward-facing (merging, inviting people, deleting) should go to
you for approval first.

## Keep agents running

Run each agent as its own launchd job (like the relay) so it restarts after a
reboot. This is on the [roadmap](../../HIVE_ROADMAP.md).
