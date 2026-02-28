// backend/index.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import testsRoute from './routes/TestingRoute.js';
import createBillingRouter from './routes/BillingRoute.js';
import createMagicLinkRoute from './routes/MagicLinkRoute.js';

import {
  PORT,
  isDebug,
  isProd,
  profilesDBURL,
  spanishWordsDBURL,
  spanishTestsDBURL,
  appDBURL,
} from './config.js';

/* ───────────────────────── Global error handlers ───────────────────────── */
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  // Let Cloud Run see the crash, but with a clear log
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[BOOT-0] index.js starting');

const app = express();

/* ───────────────────────── Proxy / Cloud Run ───────────────────────── */
// Required so secure cookies + req.ip work correctly behind Cloud Run
app.set('trust proxy', 1);

/* ───────────────────────── Static Frontend Path ───────────────────────── */
const frontendDistPath = path.join(__dirname, 'frontend-dist');
const folderExists = fs.existsSync(frontendDistPath);

/* ───────────────────────── Diagnostics ───────────────────────── */
console.log('[BOOT-1] index.js loaded');
console.log(`[Server] Environment: ${isProd ? 'Production' : 'Development'}`);
console.log(`[Server] Static path: ${frontendDistPath}`);
console.log(`[Server] Static folder exists: ${folderExists}`);
console.log(`[Server] Using PORT=${PORT}`);

if (!folderExists) {
  try {
    console.error(
      `[Server] ❌ frontend-dist missing. Current dir contains: ${fs
        .readdirSync(__dirname)
        .join(', ')}`
    );
  } catch (err) {
    console.error('[Server] ❌ Could not inspect directory:', err);
  }
}

/* ───────────────────────── CORS ───────────────────────── */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
console.log('[BOOT-2] FRONTEND_ORIGIN =', FRONTEND_ORIGIN);

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

/* ───────────────────────── DB Connections ───────────────────────── */
console.log('[BOOT-3] Creating Mongo connections');

const profilesDBConnection = mongoose.createConnection(profilesDBURL);
const spanishWordsDBConnection = mongoose.createConnection(spanishWordsDBURL);
const spanishTestsDBConnection = mongoose.createConnection(spanishTestsDBURL);
const appDBConnection = mongoose.createConnection(appDBURL);

for (const [name, conn] of [
  ['profilesDB', profilesDBConnection],
  ['spanishWordsDB', spanishWordsDBConnection],
  ['spanishTestsDB', spanishTestsDBConnection],
  ['appDB', appDBConnection],
]) {
  conn.on('error', (err) => console.error(`[DB] ❌ Error (${name}):`, err));
}

app.locals.profilesDB = profilesDBConnection;
app.locals.spanishWordsDB = spanishWordsDBConnection;
app.locals.spanishTestsDB = spanishTestsDBConnection;
app.locals.messagesDB = appDBConnection;

console.log('[BOOT-4] Mongo connections created (async connect in background)');

app.use(cookieParser());

/* ───────────────────────── Billing Router ───────────────────────── */
console.log('[BOOT-5] Creating billing router');

const billingRouter = createBillingRouter(profilesDBConnection);
app.use('/api/billing', billingRouter);

console.log('[BOOT-6] Billing router mounted');

/* ───────────────────────── Parsers ───────────────────────── */
app.use(express.json());

/* ───────────────────────── Magic Link Routes ───────────────────────── */
console.log('[BOOT-7] Creating magic link routes');

app.use('/', createMagicLinkRoute(appDBConnection, profilesDBConnection));

console.log('[BOOT-8] Magic link routes mounted');

/* ───────────────────────── Static Frontend ───────────────────────── */
if (folderExists) {
  console.log('[BOOT-9] Mounting static frontend');
  app.use(express.static(frontendDistPath));
}

/* ───────────────────────── Health Check ───────────────────────── */
app.get('/healthz', (req, res) => res.status(200).send('ok'));

/* ───────────────────────── Main Routes ───────────────────────── */
console.log('[BOOT-10] Mounting testsRoute');

app.use(
  '/',
  testsRoute(
    profilesDBConnection,
    spanishWordsDBConnection,
    spanishTestsDBConnection,
    appDBConnection
  )
);

console.log('[BOOT-11] testsRoute mounted');

/* ───────────────────────── SPA Fallback ───────────────────────── */
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

/* ───────────────────────── Listen ───────────────────────── */
console.log(`[BOOT-12] About to listen on PORT=${PORT}`);

app.listen(PORT, () => {
  console.log(`🚀 [BOOT-13] Server listening on port ${PORT}`);
});