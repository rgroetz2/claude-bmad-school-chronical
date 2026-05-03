import { Router, Request, Response } from 'express';
import { db } from '../config/db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

export default router;
