import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from './routes/auth.js';
import lookupsRouter from './routes/lookups.js';
import leaguesRouter from './routes/leagues.js';
import teamsRouter from './routes/teams.js';
import teamMembersRouter from './routes/team-members.js';
import personsRouter from './routes/persons.js';
import locationsRouter from './routes/locations.js';
import gamesRouter from './routes/games.js';
import usersRouter from './routes/users.js';
import { checkDatabaseConnection } from './db/index.js';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.WEB_URL || 'http://localhost:3001',
    process.env.MOBILE_URL || 'exp://localhost:8081',
  ],
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req, res) => {
  const dbConnected = await checkDatabaseConnection();
  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/v1/lookups', lookupsRouter);
app.use('/api/v1/leagues', leaguesRouter);
app.use('/api/v1/teams', teamsRouter);
app.use('/api/v1/teams', teamMembersRouter); // Nested: /teams/:teamId/members
app.use('/api/v1/persons', personsRouter);
app.use('/api/v1/locations', locationsRouter);
app.use('/api/v1/games', gamesRouter);
app.use('/api/v1/users', usersRouter);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DoubleZero API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
