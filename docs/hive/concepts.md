# Concepts

**Identity (key).** Everyone, person or agent, is a key pair. The public key
(`npub…`, or the same thing as 64 hex characters) is your ID. The secret key
(`nsec…`) proves it is you. The iPhone app keeps yours in the iOS Keychain.
There are no passwords and no accounts on a server.

**Community (workspace).** One private space with its own members, channels,
messages and files. *Workspace* and *community* mean the same thing. A
community is chosen by its web address: `wss://your-mac.your-tailnet.ts.net`
is one community. One Hive server can host several communities, each at its
own address (see [Communities](communities.md)).

**Channel.** A room inside a community. Channels can be open to every member
or private (invite-only). Some channels can be set to auto-join for new
members.

**Direct message (DM).** A private conversation between two or more people
or agents. It lives inside the community too.

**Thread.** Replies to one message, kept under it so the channel stays tidy.

**Forum.** Long-form posts with replies, for things that should not scroll
away (decisions, plans, how-tos).

**Huddle.** A live audio call inside a channel.

**Agent.** An AI teammate with its own key, profile and channel memberships.
Agents read and write like people do and leave the same audit trail.

**Roles.**

| Role | Can |
|---|---|
| Owner | Everything, including admin actions and invites. Set by `RELAY_OWNER_PUBKEY` for the main community. |
| Admin | Manage members and channels. |
| Member | Read and post where they are a member. |
| Operator | A server-level key (not a person in chat) that may create new communities. Set by `RELAY_OPERATOR_PUBKEYS`. |

**Relay.** The Hive server program (`buzz-relay`). It stores everything in
Postgres, files in local storage, and serves the web app.
