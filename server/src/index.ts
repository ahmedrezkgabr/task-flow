import express from 'express';
import cors from 'cors';
import './db.ts'; // initialize schema + seed on boot
import { tasksRouter } from './routes/tasks.ts';

const app = express();
// Uncommon high port to avoid clashing with other local dev servers.
const PORT = Number(process.env.PORT ?? 47821);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/tasks', tasksRouter);

// Fallback error handler so a thrown route error returns JSON, not HTML.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[taskflow] API listening on http://localhost:${PORT}`);
});
