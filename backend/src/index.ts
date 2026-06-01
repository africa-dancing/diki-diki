import 'dotenv/config';
import express   from 'express';
import cors      from 'cors';
import helmet    from 'helmet';
import rateLimit from 'express-rate-limit';
import educationRouter from './routes/education.routes';

import {
  authRouter,
  contestRouter,
  voteRouter,
  walletRouter,
  userRouter,
  statsRouter,
  paymentRouter,
  videosPublicRouter,
  categoryRouter,
  usersPublicRouter,
  tickerRouter,
} from './routes/index.routes';
import { videoRouter }                                  from './routes/video.routes';
import { notificationRouter, startNotificationCron }   from './routes/notification.routes';
import analyticsRouter                                  from './routes/analytics';
import bracketRouter                                    from './routes/bracket.routes';    // ✅ déplacé ici
import { startBracketCron }                             from './cron/bracket.cron';        // ✅ déplacé ici
import { errorHandler }                                 from './middleware/error.middleware';

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

// ── Middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://podiumarenachallenge.com'],
  credentials: true,
}));
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Diki-Diki API', version: '1.0.0' });
});

// ── Routes ─────────────────────────────────────────────────────────
app.use('/v1/auth',          authRouter);
app.use('/v1/contests',      contestRouter);
app.use('/v1/payment',       paymentRouter);
app.use('/v1/votes',         voteRouter);
app.use('/v1/videos',        videoRouter);
app.use('/v1/wallet',        walletRouter);
app.use('/v1/users',         usersPublicRouter);
app.use('/v1/users',         userRouter);
app.use('/v1/ticker',        tickerRouter);
app.use('/v1/categories',    categoryRouter);
app.use('/v1/stats',         statsRouter);
app.use('/v1/notifications', notificationRouter);
app.use('/v1/analytics',     analyticsRouter);
app.use('/v1/brackets',      bracketRouter);      
app.use('/v1/education',     educationRouter);     // ✅ ici, après app = express()

// ── Fallback ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'ROUTE_NOT_FOUND' }));
app.use(errorHandler);

// ── Démarrage ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏆 Diki-Diki API`);
  console.log(`   PORT : ${PORT}`);
  console.log(`   ENV  : ${process.env.NODE_ENV}`);
  console.log(`   Docs : http://localhost:${PORT}/health\n`);
  startBracketCron();       // ✅ ici, dans listen()
  // startNotificationCron();
})

// ── Erreurs non gérées ─────────────────────────────────────────────
process.on('unhandledRejection', (reason: any) => {
  console.error('🔴 CRASH REASON:', reason?.message || reason?.code || JSON.stringify(reason));
});
process.on('uncaughtException', (err) => {
  console.error('🔴 UNCAUGHT:', err.message);
});

export default app;