# Communities and workspaces

A **community** (also called a **workspace**) is a private space with its own
members, channels and files. The Hive picks the community from the **address**
you connect to: one address, one community.

## Your first community (automatic)

You do not create the first one by hand. When the relay starts, it makes sure
a community exists for the address in `RELAY_URL` (in `.env`) and makes
`RELAY_OWNER_PUBKEY` its owner.

1. Set `RELAY_URL=wss://<mac>.<tailnet>.ts.net` in `.env`.
2. Set `RELAY_OWNER_PUBKEY` to your public key as **64 hex characters** (not
   `npub`; the relay refuses to start with an `npub` here). Get it in the
   iPhone app: Settings → Connection → copy public key, then convert it, or
   read the hex from the relay log line that names your denied pubkey.
3. Restart the relay (see [Running the server](server.md)).
4. In the iPhone app, join `wss://<mac>.<tailnet>.ts.net`. You are the owner.

**Most people only need this one community.** Use channels to separate
topics or teams inside it (for example `#leadership`, `#engineering`,
`#family`).

## Adding another community

Use a second community when a group must not see the first one at all (for
example a family space next to a work space). Each community needs its own
address. With Tailscale the easy way is a different HTTPS port on the same
Mac name:

| Community | Address |
|---|---|
| Main | `wss://<mac>.<tailnet>.ts.net` |
| Second | `wss://<mac>.<tailnet>.ts.net:8443` |

### One-time setup: an operator key

Creating communities is a server-level action, signed by an **operator key**
(not your phone key).

```bash
cargo run --release -p buzz-admin -- generate-key
```

Save the **secret key** line into a file only you can read, and keep the
public key (hex):

```bash
mkdir -p ~/Library/Application\ Support/TheHive
nano ~/Library/Application\ Support/TheHive/operator.key   # paste the secret key, save
chmod 600 ~/Library/Application\ Support/TheHive/operator.key
```

Add to `.env`, then restart the relay:

```
RELAY_OPERATOR_PUBKEYS=<operator public key, 64 hex>
RELAY_OPERATOR_API_ORIGIN=http://127.0.0.1:3000
```

### Create the community

1. Expose the second address over Tailscale (same relay, new port):

   ```bash
   tailscale serve --bg --https=8443 3000
   ```

2. Create the community and name its owner (`npub` or hex both work here):

   ```bash
   cargo run --release -p buzz-admin -- communities create \
     --origin http://127.0.0.1:3000 \
     --key-file ~/Library/Application\ Support/TheHive/operator.key \
     --host <mac>.<tailnet>.ts.net:8443 \
     --owner <owner npub or hex>
   ```

   It prints the new community's ID and `"status": "created"`. Running it
   again for the same host is refused (`host_conflict`), so nothing is
   overwritten by accident.

3. In the iPhone app, add a community and enter
   `wss://<mac>.<tailnet>.ts.net:8443`. The app keeps both communities and
   lets you switch between them.

## Archive (hide) a community

Archiving disconnects everyone and makes the community unreachable, without
deleting data. It cannot be used on the main community.

```bash
cargo run --release -p buzz-admin -- communities archive \
  --host <mac>.<tailnet>.ts.net:8443 --owner-pubkey <owner hex> \
  --operator-id me --reason "paused"
```

`communities unarchive` with the same arguments brings it back. Deleting a
community for good is a separate, deliberate process (`buzz-admin
deletions`); ask before using it.
