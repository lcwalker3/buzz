# Troubleshooting

Run the health check first; it says what to fix:

```bash
scripts/hive/doctor.sh
```

Then look at the relay log:

```bash
tail -n 100 ~/Library/Logs/TheHive/relay.log
```

| Problem | Likely cause | Fix |
|---|---|---|
| Relay keeps restarting; log says a setting "must be set" | `.env` uses new setting names but the relay binary is old | Rebuild: `cargo build --release -p buzz-relay`, then restart |
| Relay will not start; owner key error | `RELAY_OWNER_PUBKEY` is an `npub` | Run `scripts/hive/set-owner.sh <npub>`; it converts it |
| Phone says it cannot connect | Not on Tailscale, or address uses `ws://` or an IP | Turn Tailscale on; use `wss://<mac>.<tailnet>.ts.net` |
| Joining with `localhost:3000` or `127.0.0.1` fails (log: `relay_url_mismatch`) | The server only accepts sign-ins for its own `wss://` address | Use the `wss://<mac>.<tailnet>.ts.net` address, or the **Join** button in the Desktop app |
| Health check says the Hive is open to anyone | Invite-only is off | After you are owner, turn on `HIVE_REQUIRE_RELAY_MEMBERSHIP` (ask for help: existing members must be added first) |
| Web page shows "not found" for a new address | No community for that address | Create it (see [Communities](communities.md)) |
| `communities create` says "not a relay operator" | Key not in `RELAY_OPERATOR_PUBKEYS` | Add its public key, restart the relay |
| `communities create` says "operator API origin is not configured" | `RELAY_OPERATOR_API_ORIGIN` missing | Set it to `http://127.0.0.1:3000`, restart |
| Photos do not send | Storage not running or `HIVE_S3_*` not set | See [Media](media.md) |
| `git push` fails | `buzz-git` bucket missing | See [Repos](repos.md) |
| Agent never answers | Agent not a member of the channel, or only answers its owner | Add it to the channel; check `HIVE_ACP_RESPOND_TO` |
| Disk filling up | Large `relay.log` | Rotate or delete old logs in `~/Library/Logs/TheHive/` |
