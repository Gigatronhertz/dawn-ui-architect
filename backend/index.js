require('./utils/logger'); // must be first — patches console.* before any other require
require('dotenv').config();
const express = require('express');
const db = require('./db/client');
const webhookRouter = require('./webhook');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — open to all origins by default (public API); lock down via FRONTEND_ORIGIN if needed
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Parse JSON bodies — capture raw body on the way through so the Paystack
// webhook handler can verify the HMAC signature against the exact bytes sent.
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} — origin: ${req.headers.origin || 'none'}`);
  next();
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'MySquadGo backend' }));

// REST API (web form flow)
app.use('/api', apiRouter);

// WhatsApp webhook + payment routes
app.use('/', webhookRouter);

// Unhandled errors don't crash the process
process.on('uncaughtException', (err) => console.error('[uncaught]', err.message));
process.on('unhandledRejection', (err) => console.error('[unhandled]', err?.message || err));

db.ready.then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 MySquadGo backend running on port ${PORT}`);
    console.log(`   Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`   (expose with: ngrok http ${PORT})\n`);
  });
});
