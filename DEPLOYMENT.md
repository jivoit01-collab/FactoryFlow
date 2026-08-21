# Deployment

A push to `main` builds the app and ships it to the server, via
`.github/workflows/deploy.yml`.

    npm ci → npm run build → tar → scp to /tmp → unpack into /var/www/react-app → restart nginx

## Secrets it needs

| Purpose | Secret |
|---|---|
| Server address | `SERVER_HOST` |
| Deploy user | `SERVER_USER` |
| Private key | `SERVER_SSH_KEY` |
| Build-time config | `VITE_API_BASE_URL`, `VITE_DEFAULT_BRANCH_ID`, and the `VITE_FIREBASE_*` set |

The backend repo deploys to the same machine under **different names**
(`SSH_HOST` / `SSH_USERNAME` / `SSH_KEY`), so moving servers means updating six
secrets across two repositories. Missing half of them leaves one app deploying and
the other failing a day later, out of context.

## What the server must allow

The unpack step runs `rm`, `mkdir`, `tar`, `test` and `systemctl restart nginx`
through `sudo` over a non-interactive SSH session, so the deploy user needs a
passwordless sudoers entry for those. Without it the step waits on a password
prompt nobody can answer, and the job times out rather than reporting the cause.

Port 22 must also accept connections from GitHub's runners, whose addresses are
dynamic and worldwide. An allow-list of the office address blocks them, and the
failure reads `ssh: connect to host ... port 22: Connection timed out` — which
looks like a broken key but is not one.

## The VITE_ values are baked in at build time

They are compiled into the bundle, not read at runtime, so changing one means
re-running the deploy. A wrong `VITE_API_BASE_URL` produces an app that loads
perfectly and cannot reach its API.
