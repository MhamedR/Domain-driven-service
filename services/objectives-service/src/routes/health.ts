import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Objectives Service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
