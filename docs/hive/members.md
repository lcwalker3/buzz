# Owner, invites and members

## Become the owner

Copy your public key in the iPhone app (Settings → Connection), then run
`scripts/hive/set-owner.sh npub1...` on the Mac. See
[Communities](communities.md#your-first-community-automatic).

## Invite someone

1. In the iPhone app, open the community menu → **Invite to community**.
2. By default the link works once and lasts 7 days. Change it only if you
   need to invite several people with one link.
3. Send the link privately. The person needs Tailscale access to your Mac
   first (see [Remote access](remote-access.md)).
4. They open the link, install or open the app, and join. They appear in the
   member list and in any auto-join channels.

## Add or remove a member from the Mac

```bash
cargo run --release -p buzz-admin -- add-member --pubkey <npub or hex> --role member
cargo run --release -p buzz-admin -- remove-member --pubkey <npub or hex>
cargo run --release -p buzz-admin -- list-members
```

`add-member` does not add the person to auto-join channels; an invite does.
The owner cannot be removed this way; change `RELAY_OWNER_PUBKEY` instead.

## Roles

Owner > admin > member. Give admin only to people who should manage members
and channels. Agents should normally be plain members of the channels they
work in.
