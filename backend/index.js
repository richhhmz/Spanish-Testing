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

// Import the ProfileSchema to register it early
import { ProfileSchema } from './models/ProfileModel.js'; 

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
app.set('trust proxy', 1);

/* ───────────────────────────── 1. DB Connections & Schema Registration ───────────────────────────── */
const profilesDBConnection = mongoose.createConnection(profilesDBURL);
const spanishWordsDBConnection = mongoose.createConnection(spanishWordsDBURL);
const spanishTestsDBConnection = mongoose.createConnection(spanishTestsDBURL);
const appDBConnection = mongoose.createConnection(appDBURL);

// ✅ CRITICAL: Register the "Profile" model on the connection immediately
// This prevents the MissingSchemaError in UserProfile.js and BillingRoute.js
profilesDBConnection.model('Profile', ProfileSchema);

/* ───────────────────────────── 2. GLOBAL MIDDLEWARE ───────────────────────────── */
const PROD_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://progspanlrn.com';
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: IS_DEV ? devOrigins : PROD_ORIGIN,
  credentials: true,
}));

// Cookies must be parsed before routers to support requireAuth
app.use(cookieParser());

/* ───────────────────────────── 3. ROUTERS ───────────────────────────── */
// Billing Router (Mounted before express.json for Stripe Webhooks)
const billingRouter = createBillingRouter(profilesDBConnection);
app.use('/api/billing', billingRouter);

app.use(express.json());

// Auth and Magic Link Routes
app.use('/', createMagicLinkRoute(appDBConnection, profilesDBConnection));

// Main Testing and Profile Routes
app.use('/', testsRoute(
  profilesDBConnection,
  spanishWordsDBConnection,
  spanishTestsDBConnection,
  appDBConnection
));

/* ───────────────────────────── 4. STATIC & LISTEN ───────────────────────────── */
const frontendDistPath = path.join(__dirname, 'frontend-dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    if (req.path.includes('.')) return res.status(404).send('Not found');
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});