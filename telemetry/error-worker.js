/* Cloudflare Worker: receives error beacons from the app (see diagBeacon in
   index.html) and files them as GitHub issues labeled `crash-report`, which
   triggers .github/workflows/auto-fix.yml. Deduped by title: a repeat of a
   known open crash becomes a comment, not a new issue.

   Deploy:  npx wrangler deploy telemetry/error-worker.js --name house-planner-errors
   Secret:  npx wrangler secret put GITHUB_TOKEN   (fine-grained PAT, this repo only,
            permission: Issues read+write)
   Then put the workers.dev URL into HP_ERR_ENDPOINT in index.html. */

const REPO = 'JensMoeslund/house-planner';
const ALLOWED_ORIGINS = ['https://jensmoeslund.github.io', 'http://localhost:8642', 'http://localhost:8741'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const cors = {
      'access-control-allow-origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('ok', { headers: cors });

    let b;
    try { b = await req.json(); } catch { return new Response('bad json', { status: 400, headers: cors }); }
    if (!b || (typeof b.m !== 'string' || !b.m) && (typeof b.desc !== 'string' || !b.desc))
      return new Response('bad payload', { status: 400, headers: cors });

    const gh = (path, init = {}) => fetch('https://api.github.com' + path, {
      ...init,
      headers: {
        authorization: 'Bearer ' + env.GITHUB_TOKEN,
        accept: 'application/vnd.github+json',
        'user-agent': 'house-planner-error-worker',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
    });

    // kinds: 'crash' (automatic beacon, deduped) | 'bug' | 'feature' (user-written)
    const kind = ['bug', 'feature'].includes(b.kind) ? b.kind : 'crash';
    const label = { crash: 'crash-report', bug: 'bug-report', feature: 'feature-request' }[kind];
    const icon = { crash: '🐛 auto: ', bug: '🐞 ', feature: '💡 ' }[kind];
    const title = (icon + (b.title || b.m).replace(/\s+/g, ' ')).slice(0, 90);
    const details = [
      kind === 'crash' ? '**Automatic crash report from the live app.**'
        : kind === 'bug' ? '**Bug report written by a user in the live app.**'
        : '**Feature request written by a user in the live app.**',
      '',
      b.desc ? b.desc + '\n' : '',
      '```',
      kind === 'crash' ? 'message:  ' + b.m : 'reported via in-app dialog',
      'time:     ' + (b.t || new Date().toISOString()),
      'browser:  ' + (b.ua || '?'),
      'viewport: ' + (b.vp || '?') + '   view: ' + (b.view || '?'),
      '```',
      b.stack ? '<details><summary>stack</summary>\n\n```\n' + b.stack + '\n```\n</details>' : '',
      b.diag ? '<details><summary>diagnostics (sent with consent)</summary>\n\n```\n' + String(b.diag).slice(0, 4000) + '\n```\n</details>' : '',
    ].join('\n');

    // the endpoint is public and every issue triggers an agent run, so cap the
    // number of new issues per day — beyond that, reports are dropped
    const today = new Date().toISOString().slice(0, 10);
    const madeToday = await gh('/search/issues?q=' + encodeURIComponent(
      `repo:${REPO} is:issue created:>=${today} label:crash-report,bug-report,feature-request`
    )).then(r => r.json()).catch(() => null);
    if ((madeToday?.total_count ?? 0) >= 15)
      return new Response('daily cap reached', { status: 429, headers: cors });

    // crashes: one open issue per distinct message — repeats become comments
    if (kind === 'crash') {
      const q = `repo:${REPO} is:issue is:open label:crash-report "${title.slice(0, 60).replace(/"/g, '')}" in:title`;
      const found = await gh('/search/issues?q=' + encodeURIComponent(q)).then(r => r.json()).catch(() => null);
      const existing = found?.items?.[0];
      if (existing) {
        await gh(`/repos/${REPO}/issues/${existing.number}/comments`, {
          method: 'POST',
          body: JSON.stringify({ body: 'Seen again:\n\n' + details }),
        });
        return new Response('commented', { headers: cors });
      }
    }
    const res = await gh(`/repos/${REPO}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body: details, labels: [label] }),
    });
    return new Response(res.ok ? 'filed' : 'github error ' + res.status, { status: res.ok ? 200 : 502, headers: cors });
  },
};
