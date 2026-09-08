# Error telemetry → auto-fix pipeline

The app captures every JS error locally (Filer → 🩺 Kopiér fejlrapport). This folder
adds the online half: errors are beaconed to a tiny Cloudflare Worker, filed as
GitHub issues labeled `crash-report`, and `.github/workflows/auto-fix.yml` lets
Claude investigate each one and open a fix PR for review.

```
browser error → diagBeacon (index.html) → error-worker.js → GitHub issue
                                                               ↓
                             Haiku triage (spam / prompt-injection filter)
                                                               ↓
                                                    Claude fix PR (human merges)
```

Because the endpoint accepts anonymous text that ends up in an AI agent's
prompt, every issue is first classified by a cheap model (claude-haiku-4-5,
fractions of a cent per report): `legit` dispatches the fixer, `spam` /
`injection` gets the `triage-rejected` label and a comment instead. The fixer
itself also treats issue text as untrusted data and may only touch index.html,
README.md and docs/.

Client-side the beacon is deduped per message per day and capped at 8 reports/day,
so a crashing render loop cannot spam. The worker dedupes again (a repeat of an
open crash becomes a comment on the existing issue) and refuses to create more
than 15 new issues per day — the endpoint is public, and every labeled issue
triggers an agent run billed against the Claude subscription quota.

All credentials stay on the owner's side (personal accounts are fine): a
fine-grained GitHub PAT limited to this repo + Issues read/write, a free
Cloudflare account holding it as a secret, and an Anthropic API key with a
Claude subscription OAuth token. Reporting users need no account of any kind.

## One-time setup

1. **Worker** (free Cloudflare account):
   ```
   npx wrangler login
   npx wrangler deploy --config telemetry/wrangler.toml
   npx wrangler secret put GITHUB_TOKEN --name house-planner-errors
   ```
   (first-time accounts must verify their email and register a workers.dev
   subdomain in the Cloudflare dashboard before the deploy succeeds)
   The token is a fine-grained PAT scoped to ONLY this repo with permission
   *Issues: read and write* (github.com → Settings → Developer settings →
   Fine-grained tokens).

2. **Enable the beacon**: put the worker URL into `HP_ERR_ENDPOINT` in index.html
   (empty string = telemetry fully off).

3. **Auto-fixer** (runs on a Claude subscription — no API key needed):
   - Install the Claude GitHub App on the repo: https://github.com/apps/claude
   - Run `claude setup-token` locally, then store the token:
     `gh secret set CLAUDE_CODE_OAUTH_TOKEN -R JensMoeslund/house-planner`
   - Both triage (Haiku) and the fixer bill against the subscription quota.

Claude only ever opens a PR — nothing lands on master without a human merging it.
