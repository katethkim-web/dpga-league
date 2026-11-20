const crypto = require('crypto');
const { sb, listMatches } = require('../lib/db');

const TEAMS = {
  D: ['팀시온', '팀지수', '팀경일', '팀문석', '팀태형'],
  P: ['팀가영', '팀대훈', '팀선우', '팀근규', '팀재호'],
};
const PO = ['WC', 'SF', 'F'];
const TBD = '미정';
const ALL = [...TEAMS.D, ...TEAMS.P];
// League matches: two different teams of that league. Playoffs: any team or '미정' (to be decided).
function validTeams(lg, a, b) {
  if (TEAMS[lg]) return TEAMS[lg].includes(a) && TEAMS[lg].includes(b) && a !== b;
  if (!PO.includes(lg)) return false;
  const ok = (t) => t === TBD || ALL.includes(t);
  return ok(a) && ok(b) && (a !== b || a === TBD);
}
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '');
  return (xf.split(',')[0] || req.socket?.remoteAddress || 'unknown').trim().slice(0, 64);
}
function samePin(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// POST /api/update {pin, op: 'result'|'add'|'delete', ...}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 됩니다' });
  const PIN = process.env.LEAGUE_PIN;
  if (!PIN) return res.status(500).json({ error: '서버에 입력 PIN이 설정되지 않았어요' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const ip = clientIp(req);

  try {
    // PIN check with a simple per-IP lockout after repeated failures.
    const [fail] = await sb(`league_pin_fail?ip=eq.${encodeURIComponent(ip)}&select=count,last_at`);
    const recent = fail && Date.now() - new Date(fail.last_at).getTime() < LOCK_MS;
    if (recent && fail.count >= MAX_FAILS) return res.status(429).json({ error: '잠시 후 다시 시도해 주세요' });
    if (!samePin(body.pin || '', PIN)) {
      const count = recent ? fail.count + 1 : 1;
      await sb('league_pin_fail', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { ip, count, last_at: new Date().toISOString() } });
      return res.status(401).json({ error: 'PIN이 맞지 않아요' });
    }
    if (fail) await sb(`league_pin_fail?ip=eq.${encodeURIComponent(ip)}`, { method: 'DELETE' });

    const now = new Date().toISOString();
    if (body.op === 'result') {
      const r = body.r === null ? null : body.r;
      if (![null, 'A', 'B', 'D'].includes(r)) return res.status(400).json({ error: '잘못된 결과 값' });
      const [before] = await sb(`league_matches?id=eq.${encodeURIComponent(body.id)}&select=*`);
      if (!before) return res.status(404).json({ error: '없는 경기예요. 새로고침해 주세요' });
      if (r && (before.a === TBD || before.b === TBD)) return res.status(400).json({ error: '팀이 정해진 뒤에 결과를 입력해 주세요' });
      const [after] = await sb(`league_matches?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', prefer: 'return=representation', body: { r, updated_at: now } });
      await sb('league_log', { method: 'POST', body: { match_id: before.id, action: 'result', before, after } });
    } else if (body.op === 'add') {
      const { lg, a, b, date, time } = body;
      if (!validTeams(lg, a, b)) return res.status(400).json({ error: '리그와 팀을 다시 골라 주세요' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^[0-2]\d:[0-5]\d$/.test(time || '')) return res.status(400).json({ error: '날짜와 시간을 확인해 주세요' });
      const id = 'm' + Date.now().toString(36);
      const [after] = await sb('league_matches', { method: 'POST', prefer: 'return=representation', body: { id, lg, a, b, date, time, r: null } });
      await sb('league_log', { method: 'POST', body: { match_id: id, action: 'add', after } });
    } else if (body.op === 'teams') {
      const [before] = await sb(`league_matches?id=eq.${encodeURIComponent(body.id)}&select=*`);
      if (!before) return res.status(404).json({ error: '없는 경기예요. 새로고침해 주세요' });
      if (!PO.includes(before.lg)) return res.status(400).json({ error: '리그 경기는 팀을 바꿀 수 없어요' });
      if (!validTeams(before.lg, body.a, body.b)) return res.status(400).json({ error: '팀을 다시 골라 주세요' });
      const r = before.a === body.a && before.b === body.b ? before.r : null;
      const [after] = await sb(`league_matches?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', prefer: 'return=representation', body: { a: body.a, b: body.b, r, updated_at: now } });
      await sb('league_log', { method: 'POST', body: { match_id: before.id, action: 'teams', before, after } });
    } else if (body.op === 'delete') {
      const [before] = await sb(`league_matches?id=eq.${encodeURIComponent(body.id)}`, { method: 'DELETE', prefer: 'return=representation' });
      if (before) await sb('league_log', { method: 'POST', body: { match_id: before.id, action: 'delete', before } });
    } else {
      return res.status(400).json({ error: '알 수 없는 요청' });
    }
    res.status(200).json({ matches: await listMatches() });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: '저장하지 못했어요. 잠시 후 다시 눌러 주세요' });
  }
};
