import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRateLimit } from './middleware/rate-limiter';
import dotenv from 'dotenv';

// Load environment variables from root directory
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiRateLimit);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running (minimal mode - without Prisma)',
    timestamp: new Date().toISOString(),
    mode: 'minimal'
  });
});

// Basic system info endpoint
app.get('/api/system/info', (req, res) => {
  res.json({
    version: '1.0.0',
    mode: 'minimal',
    features: {
      prisma: false,
      database: false,
      reports: false,
      fullPOS: false
    },
    message: 'Running in minimal mode. Frontend APIs handle configuration.'
  });
});

// Catch-all for API routes that aren't implemented
app.use('/api/*', (req, res) => {
  res.status(503).json({
    error: 'Service temporarily unavailable',
    message: 'Backend is running in minimal mode. This endpoint requires full database setup.',
    suggestion: 'Use frontend APIs for configuration management.',
    endpoint: req.originalUrl
  });
});

// Basic error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An error occurred in minimal backend mode'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'Endpoint not found in minimal backend mode'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running in MINIMAL mode on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - GET /api/health - Health check`);
  console.log(`   - GET /api/system/info - System information`);
  console.log(`⚠️  Note: Full POS features require Prisma setup`);
  console.log(`✅ Frontend configuration APIs work independently`);
});

export default app;