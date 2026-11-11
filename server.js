import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import getRadarResponse from './api/point/proxy.cjs';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));

app.get('/api/point/:lat/:lon/:radius', async (req, res) => {
  const result = await getRadarResponse(req.params);
  res.status(result.status).json(result.body);
});

app.use(express.static(path.join(root, 'dist')));
app.listen(process.env.PORT || 4173, () => console.log(`Northstar is listening on port ${process.env.PORT || 4173}`));
