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

/* ───────────────────────────── DB Connections ───────────────────────────── */
const profilesDBConnection = mongoose.createConnection(profilesDBURL);
const spanishWordsDBConnection = mongoose.createConnection(spanishWordsDBURL);
const spanishTestsDBConnection = mongoose.createConnection(spanishTestsDBURL);
const appDBConnection = mongoose.createConnection(appDBURL);

// Error logging for DB connections
for (const [name, conn] of [
  ['profilesDB', profilesDBConnection],
  ['spanishWordsDB', spanishWordsDBConnection],
  ['spanishTestsDB', spanishTestsDBConnection],
  ['appDB', appDBConnection],
]) {
  conn.on('error', (err) => console.error(`[DB] ❌ Error (${name}):`, err));
}

/* ───────────────────────────── 1. GLOBAL MIDDLEWARE ───────────────────────────── */
// CORS and CookieParser MUST be first
const PROD_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://progspanlrn.com';
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: IS_DEV ? devOrigins : PROD_ORIGIN,
    credentials: true,
  })
);

// This ensures req.cookies is populated BEFORE any auth checks
app.use(cookieParser());

/* ───────────────────────────── 2. BILLING ROUTER ───────────────────────────── */
/* Mounted BEFORE express.json() because BillingRoute handles its own 
   raw-body parsing for Stripe webhooks.
*/
const billingRouter = createBillingRouter(profilesDBConnection);
app.use('/api/billing', billingRouter);

/* ───────────────────────────── 3. BODY PARSERS ───────────────────────────── */
app.use(express.json());

/* ───────────────────────────── 4. MAIN APPLICATION ROUTES ───────────────────────────── */
// Magic link routes (handles /magic/request and /magic/redeem)
app.use('/', createMagicLinkRoute(appDBConnection, profilesDBConnection));

// Main testing routes
app.use(
  '/',
  testsRoute(
    profilesDBConnection,
    spanishWordsDBConnection,
    spanishTestsDBConnection,
    appDBConnection
  )
);

/* ───────────────────────────── 5. STATIC ASSETS & SPA ───────────────────────────── */
if (folderExists) {
  app.use(express.static(frontendDistPath));
}

// Health check for Cloud Run
app.get('/healthz', (req, res) => res.status(200).send('ok'));

if (folderExists) {
  app.get('*', (req, res) => {
    if (req.path.includes('.')) {
      return res.status(404).send('Resource not found');
    }

    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(404).send('index.html missing');
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send('Backend running. Frontend missing in container.');
  });
}

/* ───────────────────────────── 6. LISTEN ───────────────────────────── */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});