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

import {
  PORT,
  IS_DEV,
  profilesDBURL,
  spanishWordsDBURL,
  spanishTestsDBURL,
  messagesDBURL,
} from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ───────────────────────────── Diagnostics ───────────────────────────── */

app.use((req, res, next) => {
  next();
});

// In Docker, the path will be /app/backend/frontend-dist
const frontendDistPath = path.join(__dirname, 'frontend-dist');

const folderExists = fs.existsSync(frontendDistPath);

if (folderExists) {
  const contents = fs.readdirSync(frontendDistPath);
} else {
  console.error(
    `[Server] ❌ ERROR: Folder not found! Current directory contains: ${fs.readdirSync(
      __dirname
    )}`
  );
}

/* ───────────────────────────── CORS ───────────────────────────── */

if (IS_DEV) {
  app.use(
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    })
  );
}

/* ───────────────────────────── DB Connections ───────────────────────────── */

const profilesDBConnection = mongoose.createConnection(profilesDBURL);
const spanishWordsDBConnection = mongoose.createConnection(spanishWordsDBURL);
const spanishTestsDBConnection = mongoose.createConnection(spanishTestsDBURL);
const messagesDBConnection = mongoose.createConnection(messagesDBURL);

app.locals.profilesDB = profilesDBConnection;
app.locals.spanishWordsDB = spanishWordsDBConnection;
app.locals.spanishTestsDB = spanishTestsDBConnection;
app.locals.messagesDB = messagesDBConnection;

/* ───────────────────────────── Billing Router (MUST be before express.json for Stripe webhooks) ───────────────────────────── */

const billingRouter = createBillingRouter(profilesDBConnection);

app.use(
  '/api/billing',
  (req, res, next) => {
    next();
  },
  billingRouter
);

/* ───────────────────────────── Parsers ───────────────────────────── */

app.use(express.json());
app.use(cookieParser());

/* ───────────────────────────── Static Frontend ───────────────────────────── */

if (folderExists) {
  app.use(express.static(frontendDistPath));
}

/* ───────────────────────────── Health ───────────────────────────── */

app.get('/healthz', (req, res) => res.status(200).send('ok'));

/* ───────────────────────────── Main Routes ───────────────────────────── */

app.use(
  '/',
  testsRoute(
    profilesDBConnection,
    spanishWordsDBConnection,
    spanishTestsDBConnection,
    messagesDBConnection
  )
);

/* ───────────────────────────── SPA Fallback ───────────────────────────── */

if (folderExists) {
  // This catches all non-API requests and serves index.html
  app.get('*', (req, res) => {
    // Prevent serving index.html for missing static assets (like .js or .css files)
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

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
