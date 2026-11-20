// Supabase REST helper. Uses the service role key on the server only; never sent to browsers.
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, { method = 'GET', body, prefer } = {}) {
  if (!URL_ || !KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다');
  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${URL_}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`supabase ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function listMatches() {
  const rows = await sb('league_matches?select=id,lg,a,b,date,time,r&order=date.asc,time.asc');
  return rows.map((m) => ({ ...m, date: String(m.date).slice(0, 10) }));
}

module.exports = { sb, listMatches };
