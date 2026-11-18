# Owner, invites and members

## Become the owner

Set `RELAY_OWNER_PUBKEY` in `.env` to your phone's public key as 64 hex
characters, then restart the relay. See
[Communities](communities.md#your-first-community-automatic) for where to get
the key. An `npub` here stops the relay from starting.

## Invite someone

1. In the iPhone app, open the community menu → **Invite to community**.
2. Choose how many times the link can be used and when it expires. Prefer one
   use and a short expiry.
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
