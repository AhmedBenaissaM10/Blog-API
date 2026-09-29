import { Router } from 'express';
import { prisma } from '@lib/prisma';
import logger from '@utils/logger';

const router = Router();

router.get('/live', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error('Readiness check failed', err);
    res.status(503).json({ status: 'error' });
  }
});

export default router;
