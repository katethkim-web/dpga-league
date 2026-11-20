const { listMatches } = require('../lib/db');

// GET /api/state — public read of all matches. Also used by the daily cron to keep the database awake.
module.exports = async (req, res) => {
  try {
    const matches = await listMatches();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ matches });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: '결과를 불러오지 못했어요' });
  }
};
