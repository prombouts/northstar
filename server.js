import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));

app.get('/api/point/:lat/:lon/:radius', async (req, res) => {
  const { lat, lon, radius } = req.params;
  const values = [lat, lon, radius].map(Number);
  if (!values.every(Number.isFinite) || Math.abs(values[0]) > 90 || Math.abs(values[1]) > 180 || values[2] <= 0 || values[2] > 250) {
    return res.status(400).json({ error: 'Invalid radar coordinates or radius.' });
  }
  try {
    const response = await fetch(`https://api.adsb.lol/v2/point/${values.join('/')}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return res.status(response.status).json({ error: 'Aircraft data provider is unavailable.' });
    res.json(await response.json());
  } catch (error) {
    console.error('Aircraft feed request failed:', error);
    res.status(502).json({ error: 'Could not reach the aircraft data provider.' });
  }
});

app.use(express.static(path.join(root, 'dist')));
app.listen(process.env.PORT || 4173, () => console.log(`Northstar is listening on port ${process.env.PORT || 4173}`));
