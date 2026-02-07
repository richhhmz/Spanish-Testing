import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import testsRoute from './routes/TestingRoute.js';
import {
  PORT,
  IS_DEV,
  profilesDBURL,
  spanishWordsDBURL,
  spanishTestsDBURL,
} from './config.js';

// 1. Setup Environment
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// 2. Identify Frontend Path
// In Docker, the path will be /app/backend/frontend-dist
const frontendDistPath = path.join(__dirname, 'frontend-dist');

// --- START DIAGNOSTICS ---
// These logs are critical for debugging Cloud Run deployment 404s
console.log(`[Server] Detected Environment: ${IS_DEV ? 'Development' : 'Production'}`);
console.log(`[Server] Expected Static Path: ${frontendDistPath}`);

const folderExists = fs.existsSync(frontendDistPath);
console.log(`[Server] Static Path Found: ${folderExists}`);

if (folderExists) {
  const contents = fs.readdirSync(frontendDistPath);
  console.log(`[Server] Directory Contents: ${contents.length > 0 ? contents.join(', ') : 'EMPTY'}`);
} else {
  console.error(`[Server] ❌ ERROR: Folder not found! Current directory contains: ${fs.readdirSync(__dirname)}`);
}
// --- END DIAGNOSTICS ---

// 3. Global Middleware
app.use(express.json());
app.use(cookieParser());

if (IS_DEV) {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));
}

// 4. Serve Static Files (CSS, JS, Images)
// This MUST come before the API routes and SPA fallback
if (folderExists) {
  app.use(express.static(frontendDistPath));
}

// 5. Database Connections
const profilesDBConnection = mongoose.createConnection(profilesDBURL);
const spanishWordsDBConnection = mongoose.createConnection(spanishWordsDBURL);
const spanishTestsDBConnection = mongoose.createConnection(spanishTestsDBURL);

app.locals.profilesDB = profilesDBConnection;
app.locals.spanishWordsDB = spanishWordsDBConnection;
app.locals.spanishTestsDB = spanishTestsDBConnection;

// 6. Health Check (Required for Cloud Run)
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// 7. API Routes
app.use('/', testsRoute(
  profilesDBConnection,
  spanishWordsDBConnection,
  spanishTestsDBConnection
));

// 8. SPA Fallback
// This catches all non-API requests and serves index.html
if (folderExists) {
  app.get('*', (req, res) => {
    // Prevent serving index.html for missing static assets (like .js or .css files)
    if (req.path.includes('.')) {
      return res.status(404).send('Resource not found');
    }
    
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html missing from dist folder');
    }
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send('Backend is running, but Frontend was not found in the container build.');
  });
}

// 9. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});