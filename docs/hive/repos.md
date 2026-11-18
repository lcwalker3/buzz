# Git repositories

The Hive can host git repositories. You push with normal `git`, and browse
them in the web app (Repositories on the home page).

## Set up git (once)

The relay authenticates git with your Hive key using two helpers built from
this repo:

```bash
cargo build --release -p git-credential-nostr -p git-sign-nostr
```

Then point git at your key (details in `crates/git-credential-nostr/README.md`):

```bash
git config --global credential.helper nostr
git config --global credential.useHttpPath true
git config --global nostr.keyfile ~/.nostr/key   # a file holding your nsec, chmod 600
```

## Push and browse

```bash
git remote add hive https://<mac>.<tailnet>.ts.net/git/<owner>/<repo>.git
git push hive main
```

Open `https://<mac>.<tailnet>.ts.net/repos` to browse files, branches and
history, with search and syntax highlighting.

Git objects are stored in the `buzz-git` storage bucket. Make sure it exists
(see [Media](media.md)); without it, pushes fail.
