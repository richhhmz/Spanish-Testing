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
  IS_DEV,
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
console.log(`[Server] Environment: ${IS_DEV ? 'Development' : 'Production'}`);
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
const PROD_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://progspanlrn.com';
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: IS_DEV ? devOrigins : PROD_ORIGIN,
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

/* ───────────────────────────── Billing Router ───────────────────────────── */
/* MUST come before express.json if using Stripe raw body */
const billingRouter = createBillingRouter(profilesDBConnection);
app.use('/api/billing', billingRouter);

/* ───────────────────────────── Parsers ───────────────────────────── */
app.use(express.json());

/* ───────────────────────────── Magic Link Routes ───────────────────────────── */
/* Mounted at root because /auth/login is in TestingRoute */
app.use('/', createMagicLinkRoute(appDBConnection, profilesDBConnection));

/* ───────────────────────────── Static Frontend ───────────────────────────── */
if (folderExists) {
  app.use(express.static(frontendDistPath));
}

/* ───────────────────────────── Health Check ───────────────────────────── */
app.get('/healthz', (req, res) => res.status(200).send('ok'));

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
console.log('[BOOT] about to listen on PORT=', process.env.PORT);

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
