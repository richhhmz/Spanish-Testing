// backend/index.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import testsRoute from './routes/TestingRoute.js';
import createStripeRouter from './routes/StripeRoutes.js';
import createMagicLinkRoute from './routes/MagicLinkRoute.js';
import createSubscriptionPaymentsReportRouter from './routes/SubscriptionPaymentsReportRoute.js';
import {
  PORT,
  isDebug,
  isProd,
  profilesDBURL,
  spanishWordsDBURL,
  spanishTestsDBURL,
  appDBURL,
} from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ───────────────────────────── Proxy / Cloud Run ───────────────────────────── */
// Required so secure cookies + req.ip work correctly behind Cloud Run
app.set('trust proxy', 1);

/* ───────────────────────────── Static Frontend Path ───────────────────────────── */
const frontendDistPath = path.join(__dirname, 'frontend-dist');
const folderExists = fs.existsSync(frontendDistPath);

/* ───────────────────────────── Diagnostics ───────────────────────────── */
console.log('[BOOT] index.js loaded');
console.log(`[Server] Environment: ${isProd ? 'Production' : 'Development'}`);
console.log(`[Server] Static path: ${frontendDistPath}`);
console.log(`[Server] Static folder exists: ${folderExists}`);

if (!folderExists) {
  try {
    console.error(
      `[Server] ❌ frontend-dist missing. Current dir contains: ${fs.readdirSync(__dirname).join(', ')}`
    );
  } catch (err) {
    console.error('[Server] ❌ Could not inspect directory:', err);
  }
}

/* ───────────────────────────── CORS ───────────────────────────── */
// If frontend + backend share same origin in production, this is still safe.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
/* ───────────────────────────── DB Connections ───────────────────────────── */
const profilesDBConnection = mongoose.createConnection(profilesDBURL);
const spanishWordsDBConnection = mongoose.createConnection(spanishWordsDBURL);
const spanishTestsDBConnection = mongoose.createConnection(spanishTestsDBURL);
const appDBConnection = mongoose.createConnection(appDBURL);

// Optional connection logging
for (const [name, conn] of [
  ['profilesDB', profilesDBConnection],
  ['spanishWordsDB', spanishWordsDBConnection],
  ['spanishTestsDB', spanishTestsDBConnection],
  ['appDB', appDBConnection],
]) {
  // conn.on('connected', () => console.log(`[DB] ✅ Connected: ${name}`));
  conn.on('error', (err) => console.error(`[DB] ❌ Error (${name}):`, err));
}

app.locals.profilesDB = profilesDBConnection;
app.locals.spanishWordsDB = spanishWordsDBConnection;
app.locals.spanishTestsDB = spanishTestsDBConnection;
app.locals.messagesDB = appDBConnection;

app.use(cookieParser());

/* ───────────────────────────── Stripe Router ───────────────────────────── */
const stripeRouter = createStripeRouter(profilesDBConnection);
app.use('/api/stripe', stripeRouter);

/* ───────────────────────────── Parsers ───────────────────────────── */
app.use(express.json());

/* ───────────────────────────── Magic Link Routes ───────────────────────────── */
/* Mounted at root because /auth/login is in TestingRoute */
app.use('/', createMagicLinkRoute(appDBConnection, profilesDBConnection));

/* ───────────────────────────── Report Routes ───────────────────────────── */

app.use(createSubscriptionPaymentsReportRouter());

/* ───────────────────────────── Static Frontend ───────────────────────────── */
if (folderExists) {
  app.use(express.static(frontendDistPath));
}

/* ───────────────────────────── Health Check ───────────────────────────── */
app.get('/healthz', (req, res) => res.status(200).send('ok'));

/* ───────────────────────────── Cookie Debug ───────────────────────────── */
// Simple debug route to test cookie setting
app.get('/debug/set-cookie', (req, res) => {
  res.cookie('debugCookie', 'hello123', {
    httpOnly: false,       // so you can see it easily in DevTools / JS
    secure: false,         // IMPORTANT: allow on http://localhost
    sameSite: 'lax',
    path: '/',
  });

  res.send('Debug cookie set');
});
/* ───────────────────────────── Main Routes ───────────────────────────── */
app.use(
  '/',
  testsRoute(
    profilesDBConnection,
    spanishWordsDBConnection,
    spanishTestsDBConnection,
    appDBConnection
  )
);

/* ───────────────────────────── SPA Fallback ───────────────────────────── */
if (folderExists) {
  app.get('*', (req, res) => {
    if (req.path.includes('.')) {
      return res.status(404).send('Resource not found');
    }

    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }

    return res.status(404).send('index.html missing from dist folder');
  });
} else {
  app.get('/', (req, res) => {
    res
      .status(200)
      .send(
        'Backend is running, but Frontend was not found in the container build.'
      );
  });
}

/* ───────────────────────────── Listen ───────────────────────────── */
console.log(`[BOOT] about to listen on PORT=${PORT}`);

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
