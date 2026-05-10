require('dotenv').config();
const express = require('express');
const webhookRouter = require('./webhook');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — allow the frontend origin
const ALLOWED = (process.env.FRONTEND_ORIGIN || 'http://localhost:8080').split(',').map((s) => s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED.includes(origin) || ALLOWED.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Parse JSON bodies
app.use(express.json());

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'MySquadGo backend' }));

// REST API (web form flow)
app.use('/api', apiRouter);

// WhatsApp webhook + payment routes
app.use('/', webhookRouter);

// Unhandled errors don't crash the process
process.on('uncaughtException', (err) => console.error('[uncaught]', err.message));
process.on('unhandledRejection', (err) => console.error('[unhandled]', err?.message || err));

app.listen(PORT, () => {
  console.log(`\n🚀 MySquadGo backend running on port ${PORT}`);
  console.log(`   Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`   (expose with: ngrok http ${PORT})\n`);
});
