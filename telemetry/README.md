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
triggers a paid agent run, so also set a monthly spend limit on the Anthropic key.

All credentials stay on the owner's side (personal accounts are fine): a
fine-grained GitHub PAT limited to this repo + Issues read/write, a free
Cloudflare account holding it as a secret, and an Anthropic API key with a
spend cap. Reporting users need no account of any kind.

## One-time setup

1. **Worker** (free Cloudflare account):
   ```
   npx wrangler login
   npx wrangler deploy telemetry/error-worker.js --name house-planner-errors
   npx wrangler secret put GITHUB_TOKEN --name house-planner-errors
   ```
   The token is a fine-grained PAT scoped to ONLY this repo with permission
   *Issues: read and write* (github.com → Settings → Developer settings →
   Fine-grained tokens).

2. **Enable the beacon**: put the worker URL into `HP_ERR_ENDPOINT` in index.html
   (empty string = telemetry fully off).

3. **Auto-fixer**:
   - Install the Claude GitHub App on the repo: https://github.com/apps/claude
   - Add repo secret `ANTHROPIC_API_KEY` (from https://platform.claude.com), or a
     `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` if on a Claude subscription
     (then swap the input name in auto-fix.yml).

Claude only ever opens a PR — nothing lands on master without a human merging it.
