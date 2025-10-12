import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';
import healthRoutes from './routes/health';
import { config } from './config/config';

const app = express();
const PORT = config.port;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));
app.use(requestLogger);

// Health check route
app.use('/health', healthRoutes);

// API Gateway routes
app.use('/api/calendar', authMiddleware, createProxyMiddleware({
  target: config.services.calendar,
  changeOrigin: true,
  pathRewrite: {
    '^/api/calendar': ''
  }
}));

app.use('/api/objectives', authMiddleware, createProxyMiddleware({
  target: config.services.objectives,
  changeOrigin: true,
  pathRewrite: {
    '^/api/objectives': ''
  }
}));

app.use('/api/tech-updates', authMiddleware, createProxyMiddleware({
  target: config.services.techUpdates,
  changeOrigin: true,
  pathRewrite: {
    '^/api/tech-updates': ''
  }
}));

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

export default app;
